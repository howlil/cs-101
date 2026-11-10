import type { GraphNeighborhood } from './learning-graph';

/** Deterministic one-hop and curated two-hop scenes. No inferred links or persisted positions. */
export type CanvasNeighbor = {
  id: string;
  title: string;
  href: string;
  relationType: 'related' | 'deepens' | 'requires';
  status: 'proposed' | 'reviewed';
  direction: 'in' | 'out';
};
export type CanvasNode = {
  id: string; title: string; href: string; x: number; y: number;
  active: boolean; hop?:0|1|2; relationType?: CanvasNeighbor['relationType'];
  status?: CanvasNeighbor['status'];
};
export type CanvasEdge = { from: string; to: string; type: CanvasNeighbor['relationType']; status: CanvasNeighbor['status']; };
export const CANVAS_WIDTH = 920;
export const CANVAS_HEIGHT = 490;

export function buildCanvasScene(focus: { id: string; title: string; href: string }, neighbors: CanvasNeighbor[]): {
  nodes: CanvasNode[]; edges: CanvasEdge[];
} {
  const seen = new Set<string>([focus.id]);
  const nodes: CanvasNode[] = [{ ...focus, x: 460, y: 245, active: true }];
  const edges: CanvasEdge[] = [];
  const n = neighbors.length;
  neighbors.forEach((neighbor, index) => {
    if (seen.has(neighbor.id)) throw new Error('Duplicate canvas neighbor: ' + neighbor.id);
    seen.add(neighbor.id);
    const angle = n === 1 ? 0 : n === 2 ? -Math.PI / 4 + index * Math.PI / 2 : -Math.PI / 2 + index * Math.PI * 2 / n;
    const x = Math.round(460 + Math.cos(angle) * 318);
    const y = Math.round(245 + Math.sin(angle) * 174);
    nodes.push({ id: neighbor.id, title: neighbor.title, href: neighbor.href, x, y, active: false,
      relationType: neighbor.relationType, status: neighbor.status });
    edges.push({ from: neighbor.direction === 'in' ? neighbor.id : focus.id,
      to: neighbor.direction === 'in' ? focus.id : neighbor.id,
      type: neighbor.relationType, status: neighbor.status });
  });
  return { nodes, edges };
}

export const EXPANDED_CANVAS_WIDTH=1320;
export const EXPANDED_CANVAS_HEIGHT=760;
/** Radial rings keep the original focus centered and preserve real edge direction. */
export function buildExpandedCanvasScene(neighborhood:GraphNeighborhood):{
  nodes:CanvasNode[];edges:CanvasEdge[];
}{
  const centerX=EXPANDED_CANVAS_WIDTH/2,centerY=EXPANDED_CANVAS_HEIGHT/2;
  const ids=new Set(neighborhood.nodes.map(n=>n.id));
  if(ids.size!==neighborhood.nodes.length)throw new Error('Duplicate expanded canvas node');
  if(!ids.has(neighborhood.focusId))throw new Error('Expanded canvas missing focus');
  const nodes:CanvasNode[]=neighborhood.nodes.map(node=>{
    if(node.hop===0)return {...node,x:centerX,y:centerY,active:true};
    const ring=neighborhood.nodes.filter(n=>n.hop===node.hop);
    const index=ring.findIndex(n=>n.id===node.id);
    const angle=ring.length===1?0:-Math.PI/2+index*Math.PI*2/ring.length;
    const rx=node.hop===1?285:540,ry=node.hop===1?185:295;
    return {...node,x:Math.round(centerX+Math.cos(angle)*rx),
      y:Math.round(centerY+Math.sin(angle)*ry),active:false};
  });
  const edges=neighborhood.edges.map(edge=>{
    if(!ids.has(edge.from)||!ids.has(edge.to))throw new Error('Expanded canvas dangling edge');
    return {from:edge.from,to:edge.to,type:edge.type,status:edge.status};
  });
  return {nodes,edges};
}

