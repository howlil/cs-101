import assert from 'node:assert/strict';
import {createServer} from 'node:http';

const payload={clientReference:'unique-test-01',amount:'125.00',currency:'IDR'};
const requests=new Map(),applied=new Set();
const accepted={result:'ACCEPTED',providerReference:'bk-accepted',amount:payload.amount,currency:'IDR'};
const rejected={result:'REJECTED',code:'INVALID_ACCOUNT'};
function send(res,status,body,extra={}){
  res.writeHead(status,{'content-type':'application/json',...extra});
  res.end(JSON.stringify(body));
}
const server=createServer(async(req,res)=>{
  if(req.method!=='POST'||req.url!=='/bank/debits'){res.writeHead(404);res.end();return;}
  let raw='';
  for await(const chunk of req)raw+=chunk;
  assert.deepEqual(JSON.parse(raw),payload);
  const type=req.headers['x-fault-case'];
  assert.equal(req.headers['idempotency-key'],'key-'+type);
  requests.set(type,(requests.get(type)||0)+1);
  if(type==='success')send(res,200,accepted);
  else if(type==='rejected')send(res,400,rejected);
  else if(type==='rate-limit')send(res,429,{result:'RATE_LIMITED'},{'retry-after':'3'});
  else if(type==='unavailable')send(res,503,{result:'UNAVAILABLE'},{'retry-after':'8'});
  else if(type==='timeout'){
    applied.add(type);
    const timer=setTimeout(()=>send(res,200,accepted),180);
    timer.unref();
  }else if(type==='reset'){
    applied.add(type);
    req.socket.destroy();
  }else if(type==='malformed'){
    res.writeHead(200,{'content-type':'application/json'});
    res.end('{"result":"ACCEPTED","providerReference":');
  }else if(type==='bad-shape')send(res,200,{...accepted,amount:125});
  else if(type==='invalid-rejection')send(res,400,{status:'maybe'});
  else if(type==='pending')send(res,200,{...accepted,result:'PENDING'});
  else if(type==='rate-limit-bad-header')send(res,429,{result:'RATE_LIMITED'},{'retry-after':'soon'});
  else throw Error('Unexpected stub fault: '+type);
});
function classify(status,body,retryAfter){
  if(status===200){
    if(body?.result==='ACCEPTED'&&typeof body.providerReference==='string'&&body.providerReference.length>0&&body.amount===payload.amount&&body.currency===payload.currency)
      return {state:'SUCCESS',action:'STORE_ACCEPTED_PROVIDER_REFERENCE',retryAfterSeconds:null};
    return {state:'UNKNOWN',action:'QUERY_PROVIDER_STATUS',retryAfterSeconds:null};
  }
  if(status===400){
    if(body?.result==='REJECTED'&&body.code==='INVALID_ACCOUNT')
      return {state:'REJECTED',action:'DO_NOT_RETRY',retryAfterSeconds:null};
    return {state:'UNKNOWN',action:'QUERY_PROVIDER_STATUS',retryAfterSeconds:null};
  }
  if(status===429||status===503){
    const seconds=retryAfter&&/^\d+$/.test(retryAfter)?Number(retryAfter):null;
    return {state:'RETRYABLE',action:'CHECK_STATUS_BEFORE_RETRY',retryAfterSeconds:Number.isSafeInteger(seconds)&&seconds>=0&&seconds<=3600?seconds:null};
  }
  return {state:'UNKNOWN',action:'QUERY_PROVIDER_STATUS',retryAfterSeconds:null};
}
async function debit(base,type){
  try{
    const res=await fetch(base+'/bank/debits',{
      method:'POST',
      headers:{'content-type':'application/json','x-fault-case':type,'idempotency-key':'key-'+type},
      body:JSON.stringify(payload),signal:AbortSignal.timeout(55)
    });
    let body;
    try{
      if(!res.headers.get('content-type')?.includes('application/json'))throw Error('wrong content-type');
      body=await res.json();
    }catch{return {state:'UNKNOWN',action:'QUERY_PROVIDER_STATUS',retryAfterSeconds:null};}
    return classify(res.status,body,res.headers.get('retry-after'));
  }catch{return {state:'UNKNOWN',action:'QUERY_PROVIDER_STATUS',retryAfterSeconds:null};}
}
const base=await new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve('http://127.0.0.1:'+server.address().port)));
assert.equal(new URL(base).hostname,'127.0.0.1');
const cases=[
['success','SUCCESS','STORE_ACCEPTED_PROVIDER_REFERENCE',null],
['rejected','REJECTED','DO_NOT_RETRY',null],
['rate-limit','RETRYABLE','CHECK_STATUS_BEFORE_RETRY',3],
['unavailable','RETRYABLE','CHECK_STATUS_BEFORE_RETRY',8],
['timeout','UNKNOWN','QUERY_PROVIDER_STATUS',null],
['reset','UNKNOWN','QUERY_PROVIDER_STATUS',null],
['malformed','UNKNOWN','QUERY_PROVIDER_STATUS',null],
['bad-shape','UNKNOWN','QUERY_PROVIDER_STATUS',null],
['invalid-rejection','UNKNOWN','QUERY_PROVIDER_STATUS',null],
['pending','UNKNOWN','QUERY_PROVIDER_STATUS',null],
['rate-limit-bad-header','RETRYABLE','CHECK_STATUS_BEFORE_RETRY',null]
];
try{
  for(const [type,state,action,retryAfterSeconds] of cases){
    assert.deepEqual(await debit(base,type),{state,action,retryAfterSeconds},'wrong outcome: '+type);
    assert.equal(requests.get(type),1,'blind debit retry: '+type);
  }
  assert.deepEqual([...applied].sort(),['reset','timeout']);
  assert.equal([...requests.values()].reduce((sum,n)=>sum+n,0),cases.length);
  console.log('wire-cases='+cases.length);
  console.log('success=1;rejected=1;retryable=3;unknown=6');
  console.log('timeout-and-reset=remote-may-have-applied');
  console.log('blind-debit-retries=0');
  console.log('target=local-node-fault-stub-not-wiremock');
}finally{
  server.closeAllConnections();
  await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));
}
