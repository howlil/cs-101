/** Deterministic focus + one-hop neighbors. No inferred relations or stored positions. */
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
  active: boolean; relationType?: CanvasNeighbor['relationType'];
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
