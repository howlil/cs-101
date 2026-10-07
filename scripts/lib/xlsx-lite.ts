import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

export type WorkbookRows=Map<string,string[][]>;

const decodeXml=(value:string)=>value
  .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'")
  .replace(/&#(\d+);/g,(_m,code)=>String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi,(_m,code)=>String.fromCodePoint(Number.parseInt(code,16)))
  .replace(/&amp;/g,'&');

function zipEntries(buffer:Buffer){
  let eocd=-1;
  for(let index=buffer.length-22;index>=Math.max(0,buffer.length-65_557);index--){
    if(buffer.readUInt32LE(index)===0x06054b50){eocd=index;break;}
  }
  if(eocd<0)throw new Error('XLSX ZIP directory tidak ditemukan.');
  const count=buffer.readUInt16LE(eocd+10),directoryOffset=buffer.readUInt32LE(eocd+16),entries=new Map<string,Buffer>();
  let cursor=directoryOffset;
  for(let index=0;index<count;index++){
    if(buffer.readUInt32LE(cursor)!==0x02014b50)throw new Error('XLSX ZIP central directory rusak.');
    const compression=buffer.readUInt16LE(cursor+10),compressedSize=buffer.readUInt32LE(cursor+20),uncompressedSize=buffer.readUInt32LE(cursor+24),filenameLength=buffer.readUInt16LE(cursor+28),extraLength=buffer.readUInt16LE(cursor+30),commentLength=buffer.readUInt16LE(cursor+32),localOffset=buffer.readUInt32LE(cursor+42);
    const filename=buffer.subarray(cursor+46,cursor+46+filenameLength).toString('utf8');
    const localFilenameLength=buffer.readUInt16LE(localOffset+26),localExtraLength=buffer.readUInt16LE(localOffset+28),dataOffset=localOffset+30+localFilenameLength+localExtraLength,compressed=buffer.subarray(dataOffset,dataOffset+compressedSize);
    const data=compression===0?compressed:compression===8?inflateRawSync(compressed):undefined;
    if(!data)throw new Error('Kompresi XLSX tidak didukung: '+compression);
    if(data.length!==uncompressedSize)throw new Error('Ukuran XLSX entry tidak cocok: '+filename);
    entries.set(filename,data);cursor+=46+filenameLength+extraLength+commentLength;
  }
  return entries;
}
const attribute=(source:string,name:string)=>new RegExp('\\b'+name.replace(':','\\:')+'="([^"]*)"').exec(source)?.[1];
function sharedStrings(xml?:string){if(!xml)return[];const values:string[]=[];for(const match of xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g))values.push([...match[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(part=>decodeXml(part[1])).join(''));return values;}
function columnIndex(reference:string){const letters=reference.match(/^[A-Z]+/)?.[0];if(!letters)throw new Error('Cell reference tidak valid: '+reference);let value=0;for(const letter of letters)value=value*26+letter.charCodeAt(0)-64;return value-1;}
function worksheetRows(xml:string,shared:string[]){
  const rows:string[][]=[];
  for(const rowMatch of xml.matchAll(/<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/g)){
    const row:string[]=[];
    for(const cellMatch of rowMatch[1].matchAll(/<c\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){
      const attrs=cellMatch[1],body=cellMatch[2]??'',reference=attribute(attrs,'r');if(!reference)continue;
      const type=attribute(attrs,'t');let value='';
      if(type==='inlineStr')value=[...body.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(part=>decodeXml(part[1])).join('');
      else{const raw=/<v>([\s\S]*?)<\/v>/.exec(body)?.[1]??'';value=type==='s'?shared[Number(raw)]??'':decodeXml(raw);}
      row[columnIndex(reference)]=value;
    }
    rows.push(row);
  }
  return rows;
}
export function readXlsxWorkbook(path:string):WorkbookRows{
  const entries=zipEntries(readFileSync(path)),shared=sharedStrings(entries.get('xl/sharedStrings.xml')?.toString('utf8')),workbookXml=entries.get('xl/workbook.xml')?.toString('utf8'),relationshipsXml=entries.get('xl/_rels/workbook.xml.rels')?.toString('utf8');
  if(!workbookXml||!relationshipsXml)throw new Error('Struktur workbook XLSX tidak lengkap.');
  const relationships=new Map<string,string>();
  for(const match of relationshipsXml.matchAll(/<Relationship\b([^>]*)\/>/g)){const id=attribute(match[1],'Id'),target=attribute(match[1],'Target');if(id&&target)relationships.set(id,target);}
  const result:WorkbookRows=new Map();
  for(const match of workbookXml.matchAll(/<sheet\b([^>]*)\/>/g)){const name=attribute(match[1],'name'),relationshipId=attribute(match[1],'r:id');if(!name||!relationshipId)continue;const target=relationships.get(relationshipId);if(!target)throw new Error('Relationship sheet tidak ditemukan: '+name);const entry=target.startsWith('/')?target.slice(1):'xl/'+target,xml=entries.get(entry)?.toString('utf8');if(!xml)throw new Error('Worksheet XML tidak ditemukan: '+name);result.set(decodeXml(name),worksheetRows(xml,shared));}
  return result;
}
