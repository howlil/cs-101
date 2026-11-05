"use client";

import { useId, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { Button } from '../arc/button/button';
import { buildCanvasScene, CANVAS_WIDTH, CANVAS_HEIGHT, type CanvasNeighbor } from '../../domain/graph-canvas-layout';

interface Props { focus: { id: string; title: string; href: string }; neighbors: CanvasNeighbor[]; level: string }
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
function labelLines(label: string): string[] {
  const words = label.split(/\s+/);
  const lines: string[] = [];
  for (const word of words) {
    if (lines.length === 0 || (lines[lines.length - 1].length + word.length + 1 > 19 && lines.length < 3)) lines.push(word);
    else lines[lines.length - 1] += ' ' + word;
  }
  return lines;
}

export default function ConceptCanvas({ focus, neighbors, level }: Props) {
  const scene = buildCanvasScene(focus, neighbors);
  const dots = useId().replace(/:/g, '_');
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const viewWidth = CANVAS_WIDTH / zoom, viewHeight = CANVAS_HEIGHT / zoom;
  const viewX = (CANVAS_WIDTH - viewWidth) / 2 + offset.x;
  const viewY = (CANVAS_HEIGHT - viewHeight) / 2 + offset.y;

  const startDrag = (event: PointerEvent<SVGRectElement>) => {
    if (event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: PointerEvent<SVGRectElement>) => {
    if (!drag.current) return;
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!bounds?.width || !bounds.height) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    drag.current = { x: event.clientX, y: event.clientY };
    setOffset(prev => ({
      x: clamp(prev.x - dx * viewWidth / bounds.width, -CANVAS_WIDTH / 2, CANVAS_WIDTH / 2),
      y: clamp(prev.y - dy * viewHeight / bounds.height, -CANVAS_HEIGHT / 2, CANVAS_HEIGHT / 2),
    }));
  };
  const endDrag = (event: PointerEvent<SVGRectElement>) => {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const keyPan = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.target !== event.currentTarget) return; // Let focused node links use native keyboard semantics.
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-38, 0], ArrowRight: [38, 0], ArrowUp: [0, -38], ArrowDown: [0, 38],
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    setOffset(prev => ({
      x: clamp(prev.x + delta[0], -CANVAS_WIDTH / 2, CANVAS_WIDTH / 2),
      y: clamp(prev.y + delta[1], -CANVAS_HEIGHT / 2, CANVAS_HEIGHT / 2),
    }));
  };

  return <section className="concept-canvas" aria-label="Interactive concept graph">
    <div className="concept-canvas-bar">
      <div className="concept-canvas-heading">
        <strong>Concept connections</strong>
        <span>{level} · {neighbors.length} reviewed-source links shown as proposed unless reviewed</span>
      </div>
      <div className="concept-canvas-tools" aria-label="Graph viewport controls">
        <Button type="button" variant="ghost" size="sm" aria-label="Zoom out" title="Zoom out" onClick={() => setZoom(z => clamp(Math.round((z - 0.2) * 10) / 10, 0.8, 1.8))} disabled={zoom <= 0.8}><Minus size={15}/></Button>
        <output aria-label="Current zoom" aria-live="polite">{Math.round(zoom * 100)}%</output>
        <Button type="button" variant="ghost" size="sm" aria-label="Zoom in" title="Zoom in" onClick={() => setZoom(z => clamp(Math.round((z + 0.2) * 10) / 10, 0.8, 1.8))} disabled={zoom >= 1.8}><Plus size={15}/></Button>
        <Button type="button" variant="ghost" size="sm" aria-label="Reset graph view" title="Reset graph view" onClick={() => { setZoom(1); setOffset({x:0,y:0}); }}><RotateCcw size={14}/></Button>
      </div>
    </div>
    <div className="concept-canvas-scroll">
      <svg className="concept-canvas-svg" viewBox={`${viewX} ${viewY} ${viewWidth} ${viewHeight}`}
        role="group" tabIndex={0} aria-label={`Graph at ${level}. Drag empty space or use arrow keys to pan. Tab to visit concept links.`} onKeyDown={keyPan}>
        <defs><pattern id={dots} width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="1" fill="var(--border-strong)" /></pattern></defs>
        <rect x="-900" y="-900" width="2800" height="2400" fill="var(--surface)" />
        <rect x="-900" y="-900" width="2800" height="2400" fill={`url(#${dots})`}
          className="concept-canvas-drag" onPointerDown={startDrag} onPointerMove={moveDrag}
          onPointerUp={endDrag} onPointerCancel={endDrag} />
        {scene.edges.map(edge => {
          const from = scene.nodes.find(node => node.id === edge.from)!;
          const to = scene.nodes.find(node => node.id === edge.to)!;
          return <line key={edge.from + '-' + edge.to} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
            className={edge.status === 'proposed' ? 'concept-canvas-link is-proposed' : 'concept-canvas-link'} />;
        })}
        {scene.nodes.map(node => {
          const lines = labelLines(node.title);
          const w = node.active ? 246 : 190, h = node.active ? 112 : 94;
          return <a key={node.id} href={node.href} aria-label={`${node.title}${node.active ? ', selected' : ', related, ' + node.status}`}
            aria-current={node.active ? 'page' : undefined} className={node.active ? 'concept-canvas-node is-focus' : 'concept-canvas-node'}>
            <title>{node.title}{node.status ? ` · ${node.relationType} / ${node.status}` : ` · ${level} selected concept`}</title>
            <rect x={node.x-w/2} y={node.y-h/2} width={w} height={h} rx="18" />
            <text x={node.x} y={node.y - (lines.length - 1)*9} textAnchor="middle">
              {lines.map((line, i) => <tspan key={i} x={node.x} dy={i === 0 ? 0 : 18}>{line}</tspan>)}
            </text>
            <text className="concept-canvas-node-subtitle" x={node.x} y={node.y+h/2-16} textAnchor="middle">
              {node.active ? 'FOCUS · ' + level : `${node.relationType} · ${node.status}`}
            </text>
          </a>;
        })}
      </svg>
    </div>
    <p className="concept-canvas-footnote">Dashed connections = proposed editorial relationships, not mandatory prerequisites. Select any node to explore. Buttons and keyboard work without dragging.</p>
  </section>;
}
