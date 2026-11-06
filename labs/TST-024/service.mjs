import {createServer} from 'node:http';
import pg from 'pg';
const {Pool}=pg;
if(process.env.BANK_BASE_URL!=='http://bank:4081')throw Error('Test-only bank URL required');
const pool=new Pool({host:process.env.PGHOST,port:5432,user:'postgres',
 password:process.env.PGPASSWORD,database:'cs101',max:3,connectionTimeoutMillis:3000});
pool.on('error',error=>{console.error('PostgreSQL idle client error',error.message);});
const write=(res,status,body,extra={})=>{
 res.writeHead(status,{'content-type':'application/json',...extra});
 res.end(JSON.stringify(body));
};
function dto(row){
 return {transferId:row.transfer_id,clientReference:row.client_reference,
  sourceAccountId:row.source_account_id,destinationAccountId:row.destination_account_id,
  amount:row.amount,currency:row.currency,status:row.status,
  createdAt:new Date(row.created_at).toISOString(),
  providerOutcome:row.provider_outcome,providerReference:row.provider_reference};
}
async function parseBody(req){
 let data='',bytes=0;
 for await(const chunk of req){
  bytes+=chunk.length;
  if(bytes>2048)throw Error('request body too large');
  data+=chunk;
 }
 return JSON.parse(data);
}
async function handle(req,res){
 if(req.method==='GET'&&req.url==='/health'){
  await pool.query('SELECT 1');write(res,200,{status:'ready'});return;
 }
 if(req.method==='GET'&&req.url?.startsWith('/transfers/')){
  const id=decodeURIComponent(req.url.slice('/transfers/'.length));
  const row=await pool.query('SELECT * FROM transfers WHERE transfer_id=$1',[id]);
  if(row.rowCount===0){write(res,404,{error:'not found'});return;}
  write(res,200,dto(row.rows[0]));return;
 }
 if(req.method!=='POST'||req.url!=='/transfers'){
  write(res,404,{error:'not found'});return;
 }
 let b;
 try{b=await parseBody(req);}catch{write(res,400,{error:'invalid JSON'});return;}
 const fields=['clientReference','sourceAccountId','destinationAccountId','amount','currency'];
 if(!b||typeof b!=='object'||Array.isArray(b)||
  Object.keys(b).sort().join('|')!==fields.slice().sort().join('|')||
  typeof b.clientReference!=='string'||!/^client-(success|timeout)-001$/.test(b.clientReference)||
  typeof b.sourceAccountId!=='string'||!b.sourceAccountId||
  typeof b.destinationAccountId!=='string'||!b.destinationAccountId||
  typeof b.amount!=='string'||!(/^[1-9][0-9]*(\.[0-9]{1,2})?$/.test(b.amount))||
  b.currency!=='IDR'){
  write(res,400,{error:'invalid transfer'});return;
 }
 const id='tr-'+b.clientReference;
 const inserted=await pool.query(
  'INSERT INTO transfers(transfer_id,client_reference,source_account_id,destination_account_id,amount,currency) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT (client_reference) DO NOTHING RETURNING *',
  [id,b.clientReference,b.sourceAccountId,b.destinationAccountId,b.amount,b.currency]);
 if(inserted.rowCount!==1){write(res,409,{error:'duplicate client reference'});return;}
 let providerOutcome='UNKNOWN',providerReference=null;
 try{
  const result=await fetch(process.env.BANK_BASE_URL+'/bank/debits',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({clientReference:b.clientReference,amount:b.amount,currency:b.currency}),
   signal:AbortSignal.timeout(400)
  });
  const payload=await result.json();
  if(result.status===200&&payload.result==='ACCEPTED'&&
    payload.clientReference===b.clientReference&&
    typeof payload.providerReference==='string'&&payload.providerReference.length>0){
   providerOutcome='ACCEPTED';
   providerReference=payload.providerReference;
  }
 }catch{
  // HTTP timeout after dispatch does not establish rejection.
  providerOutcome='UNKNOWN';
 }
 const updated=await pool.query(
  'UPDATE transfers SET provider_outcome=$1, provider_reference=$2 WHERE transfer_id=$3 RETURNING *',
  [providerOutcome,providerReference,id]);
 write(res,201,dto(updated.rows[0]),{location:'/transfers/'+id});
}
const server=createServer((req,res)=>{
 handle(req,res).catch(error=>{
  console.error('service error',error.message);
  if(!res.headersSent)write(res,500,{error:'internal'});
  else res.end();
 });
});
server.listen(4080,'0.0.0.0');
process.on('SIGTERM',()=>{server.close();pool.end();});
