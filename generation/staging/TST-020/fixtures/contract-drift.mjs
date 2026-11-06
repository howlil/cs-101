import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

let root=dirname(fileURLToPath(import.meta.url));
while(!existsSync(join(root,'contracts/SYS-008/transfer-api.openapi.json'))){
  const parent=dirname(root);
  if(parent===root)throw new Error('SYS-008 OpenAPI not found');
  root=parent;
}
const api=JSON.parse(readFileSync(join(root,'contracts/SYS-008/transfer-api.openapi.json'),'utf8'));
const transfer=api.components.schemas.Transfer;
const response=api.paths['/transfers'].post.responses['201'].content['application/json'];
assert.equal(response.schema.$ref,'#/components/schemas/Transfer');
assert.equal(transfer.additionalProperties,true);
assert.deepEqual(transfer.required,api['x-cs101-compatibility'].baselineRequiredTransferProperties);
assert.equal(transfer.required.length,8);
const clone=value=>structuredClone(value);

function assertBody(schema,body){
  assert.ok(body && typeof body==='object' && !Array.isArray(body),'not an object');
  for(const key of schema.required||[])assert.ok(Object.hasOwn(body,key),'required field missing '+key);
  for(const [key,value] of Object.entries(body)){
    const prop=schema.properties?.[key];
    if(!prop){assert.notEqual(schema.additionalProperties,false,'unknown field '+key);continue;}
    if(prop.type==='string'){
      assert.equal(typeof value,'string','type mismatch '+key);
      if(prop.pattern)assert.match(value,new RegExp(prop.pattern));
      if(prop.format==='date-time')assert.ok(Number.isFinite(Date.parse(value)));
    }else if(prop.type==='integer')assert.ok(Number.isInteger(value),'type mismatch '+key);
    else throw new Error('unsupported type '+key);
    if(prop.enum)assert.ok(prop.enum.includes(value),'invalid enum '+key);
  }
}
function assertCompatible(oldSchema,candidate){
  assert.equal(candidate.type,oldSchema.type,'object type changed');
  assert.equal(candidate.additionalProperties,oldSchema.additionalProperties,'unknown-field policy changed');
  for(const key of oldSchema.required){
    assert.ok(candidate.required.includes(key),'removed required guarantee '+key);
    const oldProp=oldSchema.properties[key],newProp=candidate.properties?.[key];
    assert.ok(newProp,'removed property '+key);
    assert.equal(newProp.type,oldProp.type,'changed type '+key);
    assert.equal(newProp.pattern,oldProp.pattern,'changed pattern '+key);
    assert.deepEqual(newProp.enum,oldProp.enum,'changed enum '+key);
  }
  for(const key of candidate.required)assert.ok(oldSchema.required.includes(key),'new required '+key);
}
const base=response.example;
assertBody(transfer,base);
const optional=clone(transfer);
optional.properties.memo={type:'string'};
const added={...base,memo:'Example recipient label'};
assertCompatible(transfer,optional);
assertBody(optional,added);
assertBody(transfer,added); // tolerant client with additionalProperties true

const removed=clone(transfer);
removed.required=removed.required.filter(x=>x!=='currency');
assert.throws(()=>assertCompatible(transfer,removed),/removed required guarantee currency/);
const retyped=clone(transfer);
retyped.properties.amount.type='number';
assert.throws(()=>assertCompatible(transfer,retyped),/changed type amount/);
const newRequired=clone(optional);
newRequired.required.push('memo');
assert.throws(()=>assertCompatible(transfer,newRequired),/new required memo/);

const absent=clone(base);
delete absent.currency;
assert.throws(()=>assertBody(transfer,absent),/required field missing currency/);
assert.throws(()=>assertBody(transfer,{...base,amount:125000}),/type mismatch amount/);
assert.throws(()=>assertBody(transfer,{...base,currency:'EUR'}),/invalid enum currency/);

function strictLegacy(data){
  for(const key of Object.keys(data))assert.ok(Object.hasOwn(transfer.properties,key),'strict unknown '+key);
}
assert.throws(()=>strictLegacy(added),/strict unknown memo/);

console.log('baseline-response=valid');
console.log('additive-optional=tolerant-accept');
console.log('required-removal=detected');
console.log('amount-type-change=detected');
console.log('new-required=detected');
console.log('payload-missing-and-type=detected');
console.log('payload-enum=detected');
console.log('strict-consumer=rejects-unknown');
console.log('runtime=static-fixture-only');
