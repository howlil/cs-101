import {existsSync,readdirSync} from 'node:fs';
import manifest from '../curriculum/manifest.v2.json';
import {parseManifestV2} from '../src/domain/curriculum-v2/schema';

const parsed=parseManifestV2(manifest);
const published=new Set(existsSync('src/content/lessons') ? readdirSync('src/content/lessons').filter(n=>n.endsWith('.mdx')).map(n=>n.slice(0,-4)) : []);
const tracks=parsed.tracks.map(track=>{
  const units=parsed.items.filter(item=>item.kind==='unit' && item.trackId===track.id);
  const rank=(item:typeof units[number])=>item.kind==='unit' ? item.marketExpectation[0]?.slice(0,2)??'unknown' : 'unknown';
  const byPriority=Object.fromEntries(['P0','P1','P2'].map(rankName=>[rankName,units.filter(item=>rank(item)===rankName).length]));
  const released=units.filter(item=>published.has(item.id)).map(item=>item.id);
  return {domain:track.title,trackId:track.id,total:units.length,byPriority,published:released.length,unpublishedP0:units.filter(item=>rank(item)==='P0'&&!published.has(item.id)).map(item=>item.id)};
});
const totalPublished=tracks.reduce((s,t)=>s+t.published,0);
const missing=[...published].filter(id=>!parsed.items.some(item=>item.id===id));
if(missing.length)throw new Error('Orphan published lessons: '+missing.join(', '));
console.log(JSON.stringify({totalOutlines:parsed.items.length,totalPublished,policy:'Outline != verified MDX; generate one reviewed unit at a time',tracks},null,2));
