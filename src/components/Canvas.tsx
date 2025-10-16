import React, { useMemo, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  ReactFlowInstance
} from 'react-flow-renderer';
import { useFlashcards } from '../store/useFlashcards';

export default function Canvas() {
  const { cards, select } = useFlashcards();

  const { nodes, edges } = useMemo(() => {
    // Build adjacency and in-degree to find roots
    const idToCard = new Map(cards.map((c) => [c.id, c]));
    const inDegree = new Map<string, number>();
    for (const c of cards) inDegree.set(c.id, 0);
    for (const c of cards) {
      for (const childId of [c.children.false, c.children.true]) {
        if (childId && inDegree.has(childId)) {
          inDegree.set(childId, (inDegree.get(childId) || 0) + 1);
        }
      }
    }

    const roots = cards.filter((c) => (inDegree.get(c.id) || 0) === 0);

    // BFS layering from all roots
    const layerById = new Map<string, number>();
    const layers: string[][] = [];
    const queue: string[] = [];
    for (const r of roots) {
      layerById.set(r.id, 0);
      queue.push(r.id);
    }
    while (queue.length) {
      const cur = queue.shift()!;
      const curLayer = layerById.get(cur) || 0;
      const card = idToCard.get(cur);
      if (!card) continue;
      for (const childId of [card.children.false, card.children.true]) {
        if (!childId) continue;
        if (!layerById.has(childId)) {
          layerById.set(childId, curLayer + 1);
          queue.push(childId);
        }
      }
    }

    // Group IDs by layer, preserving input order for stability
    for (const c of cards) {
      const l = layerById.get(c.id) ?? 0;
      if (!layers[l]) layers[l] = [];
      layers[l].push(c.id);
    }

    // Compute positions: each layer is a row, nodes spaced horizontally
    const xGap = 280;
    const yGap = 200;
    const ns: Node[] = [];
    layers.forEach((ids, layerIndex) => {
      const totalWidth = (ids.length - 1) * xGap;
      const startX = -totalWidth / 2; // center the row
      ids.forEach((id, i) => {
        const c = idToCard.get(id)!;
        ns.push({
          id: c.id,
          data: { label: c.title, card: c },
          position: { x: startX + i * xGap, y: layerIndex * yGap },
          style: {
            background: c.bgColor || 'var(--card)',
            border: '1px solid #0002',
            borderRadius: 12,
            padding: 12,
            minWidth: 220,
            color: 'var(--fg)'
          }
        });
      });
    });

    const es: Edge[] = [];
    for (const c of cards) {
      if (c.children.false) {
        es.push({
          id: `${c.id}->${c.children.false}:F`,
          source: c.id,
          target: c.children.false,
          label: 'false',
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 8,
          labelStyle: { fontSize: 11, color: 'var(--fg)' },
          markerEnd: { type: 'arrowclosed' as any }
        });
      }
      if (c.children.true) {
        es.push({
          id: `${c.id}->${c.children.true}:T`,
          source: c.id,
          target: c.children.true,
          label: 'true',
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 8,
          labelStyle: { fontSize: 11, color: 'var(--fg)' },
          markerEnd: { type: 'arrowclosed' as any }
        });
      }
    }
    return { nodes: ns, edges: es };
  }, [cards]);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    // Fit the current graph on load; ignore tiny graphs to avoid over-zooming.
    try {
      instance.fitView({ padding: 0.2, includeHiddenNodes: false });
    } catch {
      /* noop */
    }
  }, []);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={(_, n) => select(n.id)}
        onInit={onInit}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
