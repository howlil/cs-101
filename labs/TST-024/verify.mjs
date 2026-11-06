import assert from 'node:assert/strict';
const base='http://service:4080',bank='http://bank:4081';
let ready=false;
for(let i=0;i<60;i++){
 try{
  const response=await fetch(base+'/health',{signal:AbortSignal.timeout(900)});
  if(response.status===200){ready=true;break;}
 }catch{}
 await new Promise(done=>setTimeout(done,200));
}
assert.ok(ready,'Service backed by PostgreSQL never became healthy');
async function transfer(reference){
 const body={clientReference:reference,sourceAccountId:'acc-01',
  destinationAccountId:'acc-02',amount:'125.00',currency:'IDR'};
 const response=await fetch(base+'/transfers',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)
 });
 assert.equal(response.status,201);
 const record=await response.json();
 assert.equal(record.status,'PENDING');
 assert.equal(record.clientReference,reference);
 assert.equal(response.headers.get('location'),'/transfers/'+record.transferId);
 const read=await fetch(base+response.headers.get('location'));
 assert.equal(read.status,200);
 assert.deepEqual(await read.json(),record);
 return record;
}
const ok=await transfer('client-success-001');
assert.equal(ok.providerOutcome,'ACCEPTED');
assert.equal(ok.providerReference,'bank-success-001');
console.log('transfer-success=persisted-accepted');
const unknown=await transfer('client-timeout-001');
assert.equal(unknown.providerOutcome,'UNKNOWN');
assert.equal(unknown.providerReference,null);
assert.equal(unknown.status,'PENDING');
console.log('transfer-timeout=persisted-unknown');
const calls=await (await fetch(bank+'/__calls')).json();
assert.deepEqual(calls.calls,['client-success-001','client-timeout-001']);
assert.equal(calls.productionRequests,0);
console.log('bank-requests=2');
