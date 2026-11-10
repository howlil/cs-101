import {test} from 'node:test';
import assert from 'node:assert/strict';
import manifest from '../curriculum/manifest.v2.json';
import overlay from '../curriculum/learning-graph.v2.json';
import {buildCurriculumGraph} from '../src/domain/curriculum-v2/graph';
import {buildLearningGraph,getConceptNeighborhood,getFocusedConcept} from '../src/domain/learning-graph';
import {buildExpandedCanvasScene,EXPANDED_CANVAS_WIDTH,EXPANDED_CANVAS_HEIGHT} from '../src/domain/graph-canvas-layout';
const graph=buildLearningGraph(overlay,buildCurriculumGraph(manifest));

test('two-hop neighborhood follows only same-level curated edges, preserving actual reviewed direction',()=>{
  const focus=getFocusedConcept(graph,'provider-contract-verification','G1');
  const n=getConceptNeighborhood(graph,focus,2);
  assert.equal(n.nodes[0].id,'provider-contract-verification');
  assert.deepEqual(n.nodes.filter(x=>x.hop===1).map(x=>x.id),[
    'api-contract-testing','provider-fault-handling']);
  assert.ok(n.nodes.some(x=>x.id==='api-design-contract'&&x.hop===2));
  assert.ok(n.nodes.some(x=>x.id==='service-readiness'&&x.hop===2));
  assert.ok(n.edges.some(e=>e.from==='api-contract-testing'
    &&e.to==='provider-contract-verification'&&e.type==='requires'&&e.status==='reviewed'));
  assert.ok(n.edges.every(e=>n.nodes.some(x=>x.id===e.from)&&n.nodes.some(x=>x.id===e.to)));
  assert.equal(new Set(n.nodes.map(x=>x.id)).size,n.nodes.length);
  assert.equal(new Set(n.edges.map(e=>e.type==='related'
    ?'related:'+ [e.from,e.to].sort().join('~')
    :e.type+':'+e.from+'>'+e.to)).size,n.edges.length);
  assert.ok(n.nodes.every(x=>x.href.endsWith('&level=G1')));
  assert.deepEqual(n,getConceptNeighborhood(graph,focus,2));
});
test('one hop does not reveal second-hop nodes and missing G2 never invents a graph',()=>{
  const focus=getFocusedConcept(graph,'provider-contract-verification','G1');
  const one=getConceptNeighborhood(graph,focus,1);
  assert.ok(one.nodes.every(x=>x.hop<=1));
  assert.ok(!one.nodes.some(x=>x.id==='api-design-contract'));
  const none=getConceptNeighborhood(graph,getFocusedConcept(graph,'provider-contract-verification','G2'));
  assert.equal(none.nodes.length,1);assert.deepEqual(none.edges,[]);
});
test('expanded scene uses real edges, bounded deterministic positions and no dangling refs',()=>{
  const n=getConceptNeighborhood(graph,getFocusedConcept(graph,'api-contract-testing','G1'));
  const scene=buildExpandedCanvasScene(n);
  assert.equal(scene.nodes.length,n.nodes.length);
  assert.equal(scene.edges.length,n.edges.length);
  assert.equal(scene.nodes.filter(x=>x.active).length,1);
  assert.ok(scene.nodes.every(x=>x.x>=0&&x.x<=EXPANDED_CANVAS_WIDTH
    &&x.y>=0&&x.y<=EXPANDED_CANVAS_HEIGHT));
  assert.deepEqual(scene,buildExpandedCanvasScene(n));
  assert.throws(()=>buildExpandedCanvasScene({...n,
    edges:[...n.edges,{from:'missing',to:n.focusId,type:'related',status:'proposed',rationale:'invalid'}]
  }),/dangling/);
});
test('bounded expansion reports truncation, never fabricates extra nodes or edges',()=>{
  const focus=getFocusedConcept(graph,'provider-contract-verification','G1');
  const n=getConceptNeighborhood(graph,focus,2,3);
  assert.equal(n.nodes.length,3);
  assert.equal(n.truncated,true);
  assert.ok(n.edges.every(e=>n.nodes.some(x=>x.id===e.from)&&n.nodes.some(x=>x.id===e.to)));
});
test('new proposed links stay discovery-only and do not add reviewed dependencies',()=>{
  const links=graph.relations.filter(r=>r.from==='service-readiness'&&r.to==='provider-fault-handling');
  assert.equal(links.length,1);
  assert.equal(links[0].status,'proposed');
  assert.equal(links[0].type,'related');
  assert.equal(graph.competencyDependencies.filter(d=>d.status==='reviewed').length,4);
});
