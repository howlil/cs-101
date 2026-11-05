import { test } from 'node:test';
import assert from 'node:assert/strict';
import manifest from '../curriculum/manifest.v2.json';
import overlay from '../curriculum/learning-graph.v1.json';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { buildLearningGraph, getFocusedConcept, learningGraphHref } from '../src/domain/learning-graph';
import { buildCanvasScene, CANVAS_HEIGHT, CANVAS_WIDTH } from '../src/domain/graph-canvas-layout';

const graph=buildLearningGraph(overlay,buildCurriculumGraph(manifest));
function scene(id:string,level:string){
  const view=getFocusedConcept(graph,id,level);
  return buildCanvasScene({id:view.concept.id,title:view.concept.title,href:learningGraphHref(view.concept.id,view.level)},
    view.neighbors.map(({concept,relation,direction})=>({
      id:concept.id,title:concept.title,href:learningGraphHref(concept.id,view.level),
      relationType:relation.type,status:relation.status,direction,
    })));
}
test('canvas uses only real selected-level one-hop concept relations',()=>{
  const g1=scene('http-request-lifecycle','G1');
  assert.equal(g1.nodes.length,5);
  assert.equal(g1.edges.length,4);
  assert.equal(g1.nodes[0].active,true);
  assert.deepEqual(g1.nodes.slice(1).map(x=>x.id),['tcp-connection','server-binding','http-controller','service-readiness']);
  assert.ok(g1.nodes.slice(1).every(n=>n.href.includes('level=G1')));
  assert.ok(g1.edges.every(e=>e.status==='proposed'&&e.type==='related'));
  assert.ok(g1.nodes.every(n=>n.x>=0&&n.x<=CANVAS_WIDTH&&n.y>=0&&n.y<=CANVAS_HEIGHT));
});
test('G2 graph excludes G1-only nodes; uncurated level never invents a relationship',()=>{
  const g2=scene('http-request-lifecycle','G2');
  assert.deepEqual(g2.nodes.map(n=>n.id),['http-request-lifecycle','service-readiness']);
  assert.equal(g2.edges.length,1);
  const g4=scene('http-request-lifecycle','G4');
  assert.equal(g4.nodes.length,1);
  assert.equal(g4.edges.length,0);
});
test('scene order and reverse edges are deterministic, duplicates rejected',()=>{
  const a=scene('service-readiness','G1');
  assert.equal(a.edges[0].from,'http-request-lifecycle');
  assert.equal(a.edges[0].to,'service-readiness');
  assert.deepEqual(a,scene('service-readiness','G1'));
  const n={id:'x',title:'X',href:'/?mode=graph&concept=x',relationType:'related' as const,status:'proposed' as const,direction:'out' as const};
  assert.throws(()=>buildCanvasScene({id:'root',title:'Root',href:'/'},[n,n]),/Duplicate canvas neighbor/);
});

test('new concept neighborhoods expose only authored proposed relations at G1',()=>{
  assert.deepEqual(scene('java-build-toolchain','G1').nodes.map(n=>n.id),
    ['java-build-toolchain','http-controller','api-contract-testing']);
  assert.deepEqual(scene('api-design-contract','G1').nodes.map(n=>n.id),
    ['api-design-contract','http-controller','api-contract-testing','relational-schema']);
  assert.deepEqual(scene('relational-schema','G1').nodes.map(n=>n.id),
    ['relational-schema','api-design-contract']);
  assert.deepEqual(scene('api-contract-testing','G2').nodes.map(n=>n.id),['api-contract-testing']);
  assert.equal(scene('api-contract-testing','G2').edges.length,0);
});
