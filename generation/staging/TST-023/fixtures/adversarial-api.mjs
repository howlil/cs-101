import assert from 'node:assert/strict';
import {createServer} from 'node:http';

const transfers=[],keys=new Map();
const accepted=['clientReference','sourceAccountId','destinationAccountId','amount','currency'];
const titles={INVALID_PAGE:'Invalid page',INVALID_LIMIT:'Invalid limit',INVALID_SORT:'Unsupported sort',
INVALID_FILTER:'Unsupported filter',INVALID_QUERY:'Invalid query',DUPLICATE_QUERY:'Duplicate query',
BODY_TOO_LARGE:'Body too large',UNSUPPORTED_MEDIA:'Unsupported media type',INVALID_JSON:'Malformed JSON',
FORBIDDEN_FIELD:'Forbidden field',INVALID_TRANSFER:'Invalid transfer',INVALID_KEY:'Invalid idempotency key',
IDEMPOTENCY_KEY_CONFLICT:'Idempotency key conflict',NOT_FOUND:'Not found'};
function fail(res,status,code){
  assert.ok(titles[code]);
  res.writeHead(status,{'content-type':'application/problem+json','cache-control':'no-store'});
  res.end(JSON.stringify({type:'urn:cs101:problem:'+code.toLowerCase().replaceAll('_','-'),title:titles[code],status,code}));
}
function numberInRange(s,min,max){
  return /^[1-9][0-9]*$/.test(s)&&Number.isSafeInteger(Number(s))&&Number(s)>=min&&Number(s)<=max;
}
function validBody(b){
  return b&&typeof b==='object'&&!Array.isArray(b)&&
    accepted.every(k=>Object.hasOwn(b,k))&&
    typeof b.clientReference==='string'&&b.clientReference.length>=8&&b.clientReference.length<=64&&
    typeof b.sourceAccountId==='string'&&b.sourceAccountId.length>0&&
    typeof b.destinationAccountId==='string'&&b.destinationAccountId.length>0&&
    typeof b.amount==='string'&&/^[1-9][0-9]*(\.[0-9]{1,2})?$/.test(b.amount)&&
    ['IDR','USD'].includes(b.currency);
}
async function service(req,res){
  const u=new URL(req.url,'http://127.0.0.1');
  if(u.pathname!=='/transfers'){fail(res,404,'NOT_FOUND');return;}
  if(req.method==='GET'){
    for(const [k] of u.searchParams){
      if(!['page','limit','sort','filter'].includes(k)){fail(res,400,'INVALID_QUERY');return;}
      if(u.searchParams.getAll(k).length!==1){fail(res,400,'DUPLICATE_QUERY');return;}
    }
    const p=u.searchParams.get('page')??'1',l=u.searchParams.get('limit')??'20';
    if(!numberInRange(p,1,10000)){fail(res,400,'INVALID_PAGE');return;}
    if(!numberInRange(l,1,50)){fail(res,400,'INVALID_LIMIT');return;}
    if((u.searchParams.get('sort')??'createdAt')!=='createdAt'){fail(res,400,'INVALID_SORT');return;}
    const filter=u.searchParams.get('filter')??'all';
    if(!['all','currency:IDR','currency:USD'].includes(filter)){fail(res,400,'INVALID_FILTER');return;}
    const entries=transfers.filter(t=>filter==='all'||t.currency===filter.slice(9));
    entries.sort((a,b)=>a.transferId.localeCompare(b.transferId));
    const page=Number(p),limit=Number(l);
    res.writeHead(200,{'content-type':'application/json'});
    res.end(JSON.stringify({page,limit,total:entries.length,items:entries.slice((page-1)*limit,page*limit)}));
    return;
  }
  if(req.method!=='POST'){fail(res,404,'NOT_FOUND');return;}
  if(u.search){fail(res,400,'INVALID_QUERY');return;}
  let bytes=0,large=false;
  const parts=[];
  for await(const chunk of req){
    bytes+=chunk.length;
    if(bytes>1024)large=true;
    if(!large)parts.push(chunk);
  }
  if(large){fail(res,413,'BODY_TOO_LARGE');return;}
  if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']??'')){fail(res,415,'UNSUPPORTED_MEDIA');return;}
  const key=req.headers['idempotency-key'];
  if(typeof key!=='string'||!(/^[A-Za-z0-9-]{8,64}$/.test(key))){fail(res,400,'INVALID_KEY');return;}
  let body;
  try{body=JSON.parse(Buffer.concat(parts).toString('utf8'));}
  catch{fail(res,400,'INVALID_JSON');return;}
  if(body&&typeof body==='object'&&!Array.isArray(body)&&Object.keys(body).some(k=>!accepted.includes(k))){
    fail(res,400,'FORBIDDEN_FIELD');return;
  }
  if(!validBody(body)){fail(res,400,'INVALID_TRANSFER');return;}
  const fingerprint=JSON.stringify(accepted.map(k=>body[k]));
  const prior=keys.get(key);
  if(prior){
    if(prior.fingerprint!==fingerprint){fail(res,409,'IDEMPOTENCY_KEY_CONFLICT');return;}
    res.writeHead(201,{'content-type':'application/json',location:'/transfers/'+prior.saved.transferId,'idempotent-replayed':'true'});
    res.end(JSON.stringify(prior.saved));return;
  }
  const saved={transferId:'tr-'+String(transfers.length+1).padStart(4,'0'),
    ...Object.fromEntries(accepted.map(k=>[k,body[k]])),
    status:'PENDING',createdAt:'2026-11-07T00:00:00Z'};
  transfers.push(saved);
  keys.set(key,{fingerprint,saved});
  res.writeHead(201,{'content-type':'application/json',location:'/transfers/'+saved.transferId});
  res.end(JSON.stringify(saved));
}
const server=createServer((req,res)=>{service(req,res).catch(e=>{console.error(e);res.destroy();});});
const base=await new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve('http://127.0.0.1:'+server.address().port)));
async function call(method,path,body,key,media='application/json'){
  const headers={};
  if(method==='POST'){headers['content-type']=media;if(key!==undefined)headers['idempotency-key']=key;}
  const r=await fetch(base+path,{method,headers,body:method==='POST'?body:undefined});
  return {status:r.status,media:r.headers.get('content-type'),location:r.headers.get('location'),
  replayed:r.headers.get('idempotent-replayed'),body:await r.json()};
}
function isProblem(r,status,code){
  assert.equal(r.status,status);
  assert.match(r.media??'',/^application\/problem\+json/);
  assert.deepEqual(r.body,{type:'urn:cs101:problem:'+code.toLowerCase().replaceAll('_','-'),
    title:titles[code],status,code});
}
const payload={clientReference:'client-ref-001',sourceAccountId:'acc-01',
  destinationAccountId:'acc-02',amount:'125.00',currency:'IDR'};
const invalidQueries=[
 ['/transfers?page=-1','INVALID_PAGE'],['/transfers?page=0','INVALID_PAGE'],
 ['/transfers?page=abc','INVALID_PAGE'],['/transfers?page=9007199254740993','INVALID_PAGE'],
 ['/transfers?limit=1000000','INVALID_LIMIT'],['/transfers?limit=0','INVALID_LIMIT'],
 ['/transfers?limit=1.5','INVALID_LIMIT'],['/transfers?page=1&page=2','DUPLICATE_QUERY'],
 ['/transfers?sort=balance','INVALID_SORT'],['/transfers?filter=admin','INVALID_FILTER'],
 ['/transfers?debug=true','INVALID_QUERY'],['/transfers?limit=1&limit=2','DUPLICATE_QUERY'],
 ['/transfers?filter=currency:XYZ','INVALID_FILTER']
];
const invalidPosts=[
 [JSON.stringify(payload),undefined,400,'INVALID_KEY'],
 [JSON.stringify(payload),'wrong-media-001',415,'UNSUPPORTED_MEDIA','text/plain'],
 ['{"amount":','invalid-json-001',400,'INVALID_JSON'],
 [JSON.stringify({...payload,padding:'x'.repeat(2400)}),'too-large-001',413,'BODY_TOO_LARGE'],
 [JSON.stringify({...payload,isAdmin:true}),'forbidden-001',400,'FORBIDDEN_FIELD'],
 [JSON.stringify({...payload,balanceAdjustment:1000}),'forbidden-002',400,'FORBIDDEN_FIELD'],
 [JSON.stringify(Object.fromEntries(Object.entries(payload).filter(([k])=>k!=='amount'))),'missing-amount-001',400,'INVALID_TRANSFER'],
 [JSON.stringify({...payload,currency:'EUR'}),'wrong-currency-001',400,'INVALID_TRANSFER']
];
try{
  for(const [path,code] of invalidQueries){
    isProblem(await call('GET',path),400,code);
    assert.equal(transfers.length,0);assert.equal(keys.size,0);
  }
  assert.deepEqual((await call('GET','/transfers?page=-1')).body,(await call('GET','/transfers?page=-1')).body);
  for(const [body,key,status,code,media] of invalidPosts){
    isProblem(await call('POST','/transfers',body,key,media),status,code);
    assert.equal(transfers.length,0);assert.equal(keys.size,0);
  }
  const key='client-req-001';
  const first=await call('POST','/transfers',JSON.stringify(payload),key);
  assert.equal(first.status,201);assert.equal(first.body.transferId,'tr-0001');
  assert.equal(first.location,'/transfers/tr-0001');assert.equal(first.body.status,'PENDING');
  const replay=await call('POST','/transfers',JSON.stringify(payload),key);
  assert.equal(replay.status,201);assert.equal(replay.replayed,'true');
  assert.deepEqual(replay.body,first.body);
  isProblem(await call('POST','/transfers',JSON.stringify({...payload,amount:'126.00'}),key),
    409,'IDEMPOTENCY_KEY_CONFLICT');
  assert.equal(transfers.length,1);assert.equal(keys.size,1);
  assert.deepEqual(transfers[0],first.body);
  const get=await call('GET','/transfers?page=1&limit=2&sort=createdAt&filter=currency:IDR');
  assert.equal(get.status,200);assert.equal(get.body.total,1);assert.deepEqual(get.body.items,[first.body]);
  const empty=await call('GET','/transfers?filter=currency:USD');
  assert.equal(empty.status,200);assert.equal(empty.body.total,0);
  console.log('invalid-requests='+String(invalidQueries.length+invalidPosts.length));
  console.log('stable-problem-details=verified');
  console.log('same-key-replay=201');
  console.log('different-payload-conflict=409');
  console.log('created-transfers='+transfers.length);
  console.log('idempotency-records='+keys.size);
  console.log('unauthorized-mutations=0');
  console.log('runtime=local-node-http-only');
}finally{
  server.closeAllConnections();
  await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
}
