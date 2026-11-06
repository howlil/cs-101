import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtempSync, readdirSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {Pact, Verifier, MatchersV3}=require('@pact-foundation/pact');
const {like}=MatchersV3;
const root=mkdtempSync(join(tmpdir(),'cs101-pact-tst021-'));
const response={
  transferId:'tr-001',clientReference:'client-001',sourceAccountId:'acc-01',
  destinationAccountId:'acc-02',amount:'125000.00',currency:'IDR',
  status:'PENDING',createdAt:'2026-11-06T08:00:00Z'
};
const problem={
  type:'urn:cs101:problem:not-found',title:'Resource not found',status:404,
  detail:'The requested resource was not found.'
};

async function consumerGetTransfer(base,id){
  const url=new URL('/transfers/'+encodeURIComponent(id),base);
  const res=await fetch(url,{headers:{Accept:'application/json'}});
  const data=await res.json();
  if(res.status===404){
    assert.match(res.headers.get('content-type')||'',/^application\/problem\+json/);
    assert.equal(typeof data.type,'string');
    assert.equal(typeof data.title,'string');
    assert.equal(data.status,404);
    return {found:false,error:data};
  }
  assert.equal(res.status,200);
  assert.equal(typeof data.transferId,'string');
  assert.equal(typeof data.amount,'string');
  assert.equal(typeof data.currency,'string');
  return {found:true,transfer:data};
}

function startProvider(changedAmount){
  let seenGood=0,seenMissing=0;
  const server=createServer((req,res)=>{
    if(req.method==='GET' && req.url==='/transfers/tr-001'){
      seenGood++;
      res.writeHead(200,{'Content-Type':'application/json'});
      res.end(JSON.stringify({...response,amount:changedAmount?125000:response.amount}));
    }else if(req.method==='GET' && req.url==='/transfers/missing'){
      seenMissing++;
      res.writeHead(404,{'Content-Type':'application/problem+json'});
      res.end(JSON.stringify(problem));
    }else{
      res.writeHead(404,{'Content-Type':'application/problem+json'});
      res.end(JSON.stringify(problem));
    }
  });
  return {
    start:()=>new Promise((resolve,reject)=>{
      server.once('error',reject);
      server.listen(0,'127.0.0.1',()=>resolve('http://127.0.0.1:'+server.address().port));
    }),
    counts:()=>({good:seenGood,missing:seenMissing}),
    stop:()=>new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()))
  };
}
const states={
  'transfer tr-001 exists':async()=>{},
  'transfer missing does not exist':async()=>{}
};
async function verifyProvider(pactPath,changedAmount){
  const service=startProvider(changedAmount);
  const base=await service.start();
  try {
    let failure=null;
    try {
      await new Verifier({
        provider:'MockBankProvider',
        providerBaseUrl:base,
        pactUrls:[pactPath],
        stateHandlers:states,
        logLevel:'error'
      }).verifyProvider();
    }catch(err){failure=err;}
    assert.ok(service.counts().good>=1,'Pact never replayed success interaction');
    assert.ok(service.counts().missing>=1,'Pact never replayed missing interaction');
    return failure;
  } finally {
    await service.stop();
  }
}
try {
  const pact=new Pact({consumer:'MockBankClient',provider:'MockBankProvider',dir:root,spec:4,logLevel:'error'});
  await pact.addInteraction()
    .given('transfer tr-001 exists')
    .uponReceiving('a transfer detail read')
    .withRequest('GET','/transfers/tr-001',(b)=>b.headers({Accept:'application/json'}))
    .willRespondWith(200,(b)=>{
      b.headers({'Content-Type':'application/json'});
      b.jsonBody({
        transferId:like('tr-001'),
        amount:like('125000.00'),
        currency:like('IDR'),
        status:like('PENDING')
      });
    })
    .executeTest(async (mock)=>{
      const data=await consumerGetTransfer(mock.url,'tr-001');
      assert.equal(data.found,true);
      assert.equal(data.transfer.amount,'125000.00');
      assert.equal(data.transfer.currency,'IDR');
    });

  await pact.addInteraction()
    .given('transfer missing does not exist')
    .uponReceiving('a missing transfer detail read')
    .withRequest('GET','/transfers/missing',(b)=>b.headers({Accept:'application/json'}))
    .willRespondWith(404,(b)=>{
      b.headers({'Content-Type':'application/problem+json'});
      b.jsonBody({
        type:like('urn:cs101:problem:not-found'),
        title:like('Resource not found'),
        status:like(404)
      });
    })
    .executeTest(async (mock)=>{
      const data=await consumerGetTransfer(mock.url,'missing');
      assert.equal(data.found,false);
      assert.equal(data.error.status,404);
      assert.equal(data.error.title,'Resource not found');
    });

  const pactFiles=readdirSync(root).filter(n=>n.endsWith('.json'));
  assert.equal(pactFiles.length,1,'Expected exactly one Pact contract document');
  const pactPath=join(root,pactFiles[0]);
  const generated=JSON.parse(readFileSync(pactPath,'utf8'));
  assert.equal(generated.interactions.length,2);
  assert.ok(generated.interactions.some(x=>x.response.status===200));
  assert.ok(generated.interactions.some(x=>x.response.status===404));
  console.log('consumer-pact=generated-two-interactions');

  const good=await verifyProvider(pactPath,false);
  assert.equal(good,null,'healthy local provider must pass Pact verifier');
  console.log('healthy-provider=pact-verified');

  const broken=await verifyProvider(pactPath,true);
  assert.ok(broken,'Pact must reject a JSON number where the consumer expects a string');
  console.log('numeric-amount-provider=pact-verifier-rejected');
  console.log('target=educational-local-node-provider');
} finally {
  rmSync(root,{recursive:true,force:true});
}
