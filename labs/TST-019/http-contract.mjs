import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

let repoRoot=dirname(fileURLToPath(import.meta.url));
while(!existsSync(join(repoRoot,'contracts/SYS-008/transfer-api.openapi.json'))){
 const parent=dirname(repoRoot);
 if(parent===repoRoot)throw new Error('Missing SYS-008 contract');
 repoRoot=parent;
}
const spec=JSON.parse(readFileSync(join(repoRoot,'contracts/SYS-008/transfer-api.openapi.json'),'utf8'));
const matrix={'POST /transfers':[201,400,401,403,409,500],
  'GET /transfers/{id}':[200,401,403,404,500],
  'GET /accounts/{id}':[200,401,403,404,500]};
for(const [operation,expected] of Object.entries(matrix)){
  const [verb,path]=operation.split(' ');
  assert.deepEqual(Object.keys(spec.paths[path][verb.toLowerCase()].responses).map(Number).sort((a,b)=>a-b),
    expected.slice().sort((a,b)=>a-b));
}
assert.equal(spec.paths['/transfers'].post.responses['422'],undefined,
 '422 needs explicit SYS-008 contract revision; it cannot pass by assumption');

const errorKinds={
  400:['invalid-request','Invalid transfer request'],
  401:['unauthenticated','Authentication required'],
  403:['forbidden','Access denied'],
  404:['not-found','Resource not found'],
  409:['reference-conflict','Client reference conflict'],
  500:['internal-error','Internal server error']
};
const transfers=new Map(), used=new Set();
function send(res,status,body,headers={}){
 res.writeHead(status,{'Content-Type':status>=400?'application/problem+json':'application/json',...headers});
 res.end(JSON.stringify(body));
}
function problem(res,status){
 const [code,title]=errorKinds[status];
 send(res,status,{type:'urn:cs101:problem:'+code,title,status,detail:'Educational error.'},
   status===401?{'WWW-Authenticate':'Bearer realm="transfers"'}:{});
}
// This is a deterministic in-memory HTTP server, not Spring or real authentication.
const server=createServer(async(req,res)=>{
 try{
  if(req.headers['x-lab-error']==='yes')return problem(res,500);
  if(req.headers.authorization!=='Bearer lab-ok')
    return problem(res,req.headers.authorization==='Bearer lab-deny'?403:401);
  const path=new URL(req.url||'/','http://localhost').pathname;
  if(req.method==='POST' && path==='/transfers'){
   let raw='';
   for await(const chunk of req)raw+=chunk;
   let body;
   try{body=JSON.parse(raw);}catch{return problem(res,400);}
   if(req.headers['content-type']!=='application/json' ||
     typeof body?.clientReference!=='string' || body.clientReference.length<8 ||
     typeof body?.sourceAccountId!=='string' || typeof body?.destinationAccountId!=='string' ||
     typeof body?.amount!=='string' || !/^[1-9][0-9]*(\.[0-9]{1,2})?$/.test(body.amount) ||
     !['IDR','USD'].includes(body.currency))return problem(res,400);
   if(used.has(body.clientReference))return problem(res,409);
   used.add(body.clientReference);
   const result={transferId:'tr-001',...body,status:'PENDING',createdAt:'2026-11-06T08:00:00Z'};
   transfers.set('tr-001',result);
   return send(res,201,result,{Location:'/transfers/tr-001'});
  }
  let match=/^\/transfers\/([^/]+)$/.exec(path);
  if(req.method==='GET'&&match)
    return transfers.has(match[1])?send(res,200,transfers.get(match[1])):problem(res,404);
  match=/^\/accounts\/([^/]+)$/.exec(path);
  if(req.method==='GET'&&match)
    return ['acc-01','acc-02'].includes(match[1])
      ?send(res,200,{accountId:match[1],currency:'IDR',status:'ACTIVE'}):problem(res,404);
  return problem(res,404);
 }catch{return problem(res,500);}
});
function deref(o){return o?.$ref?o.$ref.slice(2).split('/').reduce((x,k)=>x[k],spec):o;}
function shape(schema,body){
 schema=deref(schema);
 if(schema.type==='object'){
  assert.ok(body&&typeof body==='object'&&!Array.isArray(body),'expected object');
  for(const field of schema.required||[])assert.ok(Object.hasOwn(body,field),'missing '+field);
  for(const [field,value] of Object.entries(body)){
   if(!schema.properties?.[field]){assert.notEqual(schema.additionalProperties,false,'unknown '+field);continue;}
   shape(schema.properties[field],value);
  }
 }else if(schema.type==='string'){
  assert.equal(typeof body,'string','expected string');
  if(schema.pattern)assert.match(body,new RegExp(schema.pattern));
  if(schema.minLength!==undefined)assert.ok(body.length>=schema.minLength);
  if(schema.format==='date-time')assert.ok(Number.isFinite(Date.parse(body)));
 }else if(schema.type==='integer')assert.ok(Number.isInteger(body),'expected integer');
 if(schema.enum)assert.ok(schema.enum.includes(body),'bad enum');
 if(schema.minimum!==undefined)assert.ok(body>=schema.minimum);
 if(schema.maximum!==undefined)assert.ok(body<=schema.maximum);
}
function verify(verb,path,status,wire){
 assert.equal(wire.status,status,'HTTP status mismatch');
 const response=deref(spec.paths[path][verb.toLowerCase()].responses[String(status)]||{});
 const media=status>=400?'application/problem+json':'application/json';
 assert.ok(response.content?.[media],'not declared in contract');
 assert.equal(wire.headers.get('content-type')?.split(';')[0],media,'media type mismatch');
 shape(response.content[media].schema,wire.body);
 if(status===201){
  assert.equal(wire.headers.get('location'),'/transfers/'+wire.body.transferId);
  assert.equal(response.headers?.Location?.required,true);
 }
 if(status===401)assert.match(wire.headers.get('www-authenticate')||'',/^Bearer(?:\s|$)/);
 if(status>=400){
  assert.equal(wire.body.status,status,'Problem status mismatch');
  assert.match(wire.body.type,/^urn:cs101:problem:/);
  assert.doesNotMatch(JSON.stringify(wire.body),/stacktrace|select \*|secret-value/i);
 }
}
await new Promise((resolve,reject)=>{
 server.once('error',reject);
 server.listen(0,'127.0.0.1',resolve);
});
try{
 const origin='http://127.0.0.1:'+server.address().port;
 const payload={clientReference:'client-ref-001',sourceAccountId:'acc-01',
  destinationAccountId:'acc-02',amount:'125000.00',currency:'IDR'};
 let cases=0;
 async function hit(verb,path,status,options={},template=path.replace(/\/(?:tr-|acc-)[^/]+$/,'/{id}')){
  const r=await fetch(origin+path,{method:verb,
    headers:{Authorization:'Bearer lab-ok',...options.headers},body:options.body});
  verify(verb,template,status,{status:r.status,headers:r.headers,body:await r.json()});
  cases++;
 }
 await hit('POST','/transfers',201,{headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 await hit('GET','/transfers/tr-001',200);
 await hit('GET','/accounts/acc-01',200);
 await hit('POST','/transfers',400,{headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,amount:'0'})});
 await hit('GET','/accounts/acc-01',401,{headers:{Authorization:''}});
 await hit('GET','/transfers/tr-001',403,{headers:{Authorization:'Bearer lab-deny'}});
 await hit('GET','/transfers/tr-missing',404);
 await hit('GET','/accounts/acc-missing',404);
 await hit('POST','/transfers',409,{headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 await hit('GET','/accounts/acc-01',500,{headers:{'x-lab-error':'yes'}});
 assert.equal(cases,10);
 const headers=new Headers({'Content-Type':'application/problem+json'});
 const problemBody={type:'urn:cs101:problem:reference-conflict',title:'Client reference conflict',status:409};
 assert.throws(()=>verify('POST','/transfers',409,
   {status:409,headers,body:{...problemBody,status:500}}),/Problem status mismatch/);
 assert.throws(()=>verify('GET','/accounts/{id}',401,
   {status:401,headers,body:{...problemBody,status:401}}),/Bearer/);
 assert.throws(()=>verify('POST','/transfers',201,{
   status:201,headers:new Headers({'Content-Type':'application/json','Location':'/transfers/tr-001'}),
   body:{...transfers.get('tr-001'),amount:125000}}),/expected string/);
 console.log('http-paths=3');
 console.log('http-roundtrips=10');
 console.log('status-matrix=200,201,400,401,403,404,409,500');
 console.log('negative-mutations=3-detected');
 console.log('422=undeclared');
 console.log('target=local-educational-stub');
}finally{
 await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));
}
