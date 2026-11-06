import assert from 'node:assert/strict';
import {createServer} from 'node:http';
const calls=[];
const server=createServer(async(req,res)=>{
 if(req.method==='GET'&&req.url==='/__calls'){
  res.writeHead(200,{'content-type':'application/json'});
  res.end(JSON.stringify({calls,productionRequests:0}));
  return;
 }
 if(req.method!=='POST'||req.url!=='/bank/debits'){res.writeHead(404);res.end();return;}
 let raw='';
 for await(const part of req) raw+=part;
 const body=JSON.parse(raw);
 assert.equal(body.amount,'125.00');
 assert.equal(body.currency,'IDR');
 assert.equal(typeof body.clientReference,'string');
 calls.push(body.clientReference);
 if(body.clientReference==='client-success-001'){
  res.writeHead(200,{'content-type':'application/json'});
  res.end(JSON.stringify({result:'ACCEPTED',clientReference:body.clientReference,providerReference:'bank-success-001'}));
  return;
 }
 if(body.clientReference==='client-timeout-001'){
  const delay=setTimeout(()=>{
   if(!res.destroyed){
    res.writeHead(200,{'content-type':'application/json'});
    res.end(JSON.stringify({result:'ACCEPTED',clientReference:body.clientReference,providerReference:'bank-late-001'}));
   }
  },1100);
  delay.unref();
  return;
 }
 res.writeHead(400,{'content-type':'application/json'});
 res.end(JSON.stringify({result:'REJECTED'}));
});
server.listen(4081,'0.0.0.0');
