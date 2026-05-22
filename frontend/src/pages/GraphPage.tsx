import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { caseGraph, listCases } from "../api/casegraph";
import type { CaseRecord, GraphNode, GraphResponse } from "../types/api";

type LayoutMode = "radial" | "top-down" | "left-right" | "grid" | "degree";
type Position = { x: number; y: number };

const VIEWBOX = { width: 860, height: 520 };
const NODE_MARGIN = 72;

const colors: Record<string, string> = {
  case: "#0f766e",
  person: "#2563eb",
  mobile_number: "#7c3aed",
  bank_account: "#b45309",
  upi_id: "#be123c",
  evidence: "#475569"
};

const layoutLabels: Record<LayoutMode, string> = {
  radial: "Radial",
  "top-down": "Top down",
  "left-right": "Left-right",
  grid: "Grid",
  degree: "Degree weighted"
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getRootNode(graph: GraphResponse): GraphNode | undefined {
  return graph.nodes.find((node) => node.type === "case") ?? graph.nodes[0];
}

function buildDepths(graph: GraphResponse) {
  const root = getRootNode(graph);
  const adjacency = new Map<string, string[]>();
  graph.nodes.forEach((node) => adjacency.set(node.id, []));
  graph.edges.forEach((edge) => {
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
  });
  const depths = new Map<string, number>();
  if (!root) return depths;

  const queue = [root.id];
  depths.set(root.id, 0);
  while (queue.length) {
    const current = queue.shift()!;
    const nextDepth = (depths.get(current) ?? 0) + 1;
    for (const next of adjacency.get(current) ?? []) {
      if (depths.has(next)) continue;
      depths.set(next, nextDepth);
      queue.push(next);
    }
  }
  graph.nodes.forEach((node) => {
    if (!depths.has(node.id)) depths.set(node.id, 1);
  });
  return depths;
}

function groupByDepth(graph: GraphResponse) {
  const depths = buildDepths(graph);
  const groups = new Map<number, GraphNode[]>();
  graph.nodes.forEach((node) => {
    const depth = depths.get(node.id) ?? 1;
    groups.set(depth, [...(groups.get(depth) ?? []), node]);
  });
  return Array.from(groups.entries()).sort(([a], [b]) => a - b);
}

function computeLayout(graph: GraphResponse, layout: LayoutMode): Map<string, Position> {
  const positions = new Map<string, Position>();
  const root = getRootNode(graph);
  const center = { x: VIEWBOX.width / 2, y: VIEWBOX.height / 2 };

  if (!graph.nodes.length) return positions;

  if (layout === "radial") {
    if (root) positions.set(root.id, center);
    const otherNodes = graph.nodes.filter((node) => node.id !== root?.id);
    otherNodes.forEach((node, index) => {
      const angle = (index / Math.max(otherNodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const radiusX = 285;
      const radiusY = 180;
      positions.set(node.id, {
        x: center.x + Math.cos(angle) * radiusX,
        y: center.y + Math.sin(angle) * radiusY
      });
    });
    return positions;
  }

  if (layout === "top-down" || layout === "left-right") {
    const levels = groupByDepth(graph);
    const levelCount = Math.max(levels.length, 1);
    levels.forEach(([_, nodes], levelIndex) => {
      nodes.forEach((node, nodeIndex) => {
        const spread = nodes.length + 1;
        if (layout === "top-down") {
          positions.set(node.id, {
            x: (VIEWBOX.width / spread) * (nodeIndex + 1),
            y: NODE_MARGIN + ((VIEWBOX.height - NODE_MARGIN * 2) / Math.max(levelCount - 1, 1)) * levelIndex
          });
        } else {
          positions.set(node.id, {
            x: NODE_MARGIN + ((VIEWBOX.width - NODE_MARGIN * 2) / Math.max(levelCount - 1, 1)) * levelIndex,
            y: (VIEWBOX.height / spread) * (nodeIndex + 1)
          });
        }
      });
    });
    return positions;
  }

  if (layout === "grid") {
    const columns = Math.ceil(Math.sqrt(graph.nodes.length));
    const rows = Math.ceil(graph.nodes.length / columns);
    graph.nodes.forEach((node, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      positions.set(node.id, {
        x: NODE_MARGIN + ((VIEWBOX.width - NODE_MARGIN * 2) / Math.max(columns - 1, 1)) * column,
        y: NODE_MARGIN + ((VIEWBOX.height - NODE_MARGIN * 2) / Math.max(rows - 1, 1)) * row
      });
    });
    return positions;
  }

  const degree = new Map<string, number>();
  graph.nodes.forEach((node) => degree.set(node.id, 0));
  graph.edges.forEach((edge) => {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  });
  const sorted = [...graph.nodes].sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0));
  sorted.forEach((node, index) => {
    if (index === 0) {
      positions.set(node.id, center);
      return;
    }
    const ring = Math.ceil(index / 8);
    const indexInRing = (index - 1) % 8;
    const nodesInRing = Math.min(8, sorted.length - (ring - 1) * 8 - 1);
    const angle = (indexInRing / Math.max(nodesInRing, 1)) * Math.PI * 2 - Math.PI / 2;
    const radius = 115 + ring * 82;
    positions.set(node.id, {
      x: clamp(center.x + Math.cos(angle) * radius, NODE_MARGIN, VIEWBOX.width - NODE_MARGIN),
      y: clamp(center.y + Math.sin(angle) * radius, NODE_MARGIN, VIEWBOX.height - NODE_MARGIN)
    });
  });
  return positions;
}

export function GraphPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [caseId, setCaseId] = useState("");
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [layout, setLayout] = useState<LayoutMode>("radial");
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [error, setError] = useState("");
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    listCases()
      .then((items) => {
        setCases(items);
        if (items[0]) setCaseId(items[0].id);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!caseId) return;
    caseGraph(caseId).then(setGraph).catch((err) => setError(err.message));
  }, [caseId]);

  useEffect(() => {
    if (!graph) {
      setPositions(new Map());
      return;
    }
    setPositions(computeLayout(graph, layout));
  }, [graph, layout]);

  const selectedLayoutDescription = useMemo(() => {
    if (layout === "top-down") return "Breadth-first hierarchy from the case node.";
    if (layout === "left-right") return "Horizontal breadth-first hierarchy.";
    if (layout === "grid") return "Equal grid spacing for scanning dense graphs.";
    if (layout === "degree") return "Highly connected nodes are placed closer to the center.";
    return "Case-centric radial graph.";
  }, [layout]);

  function svgPoint(event: PointerEvent<SVGSVGElement>): Position | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const transformed = point.matrixTransform(svg.getScreenCTM()?.inverse());
    return {
      x: clamp(transformed.x, NODE_MARGIN / 2, VIEWBOX.width - NODE_MARGIN / 2),
      y: clamp(transformed.y, NODE_MARGIN / 2, VIEWBOX.height - NODE_MARGIN / 2)
    };
  }

  function startDrag(event: PointerEvent<SVGGElement>, node: GraphNode) {
    event.preventDefault();
    event.stopPropagation();
    setSelected(node);
    setDraggingNodeId(node.id);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function dragNode(event: PointerEvent<SVGSVGElement>) {
    if (!draggingNodeId) return;
    const nextPoint = svgPoint(event);
    if (!nextPoint) return;
    setPositions((current) => {
      const next = new Map(current);
      next.set(draggingNodeId, nextPoint);
      return next;
    });
  }

  function stopDrag() {
    setDraggingNodeId(null);
  }

  return (
    <section className="graph-layout">
      <div className="graph-toolbar">
        <select value={caseId} onChange={(event) => setCaseId(event.target.value)}>
          {cases.map((item) => (
            <option value={item.id} key={item.id}>
              {item.case_number} - {item.case_title}
            </option>
          ))}
        </select>
        <select value={layout} onChange={(event) => setLayout(event.target.value as LayoutMode)}>
          {Object.entries(layoutLabels).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => graph && setPositions(computeLayout(graph, layout))}>
          Reset layout
        </button>
        <span className="graph-hint">{selectedLayoutDescription}</span>
        {error && <span className="error-inline">{error}</span>}
      </div>
      <div className="graph-panel">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
          role="img"
          aria-label="Case relationship graph"
          onPointerMove={dragNode}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          onPointerLeave={stopDrag}
        >
          {graph?.edges.map((edge) => {
            const source = positions.get(edge.source);
            const target = positions.get(edge.target);
            if (!source || !target) return null;
            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;
            return (
              <g key={edge.id}>
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  className={edge.confidence === "Confirmed" ? "edge confirmed" : "edge"}
                />
                <text x={midX} y={midY} className="edge-label">
                  {edge.label}
                </text>
              </g>
            );
          })}
          {graph?.nodes.map((node) => {
            const position = positions.get(node.id);
            if (!position) return null;
            return (
              <g
                key={node.id}
                onPointerDown={(event) => startDrag(event, node)}
                className={draggingNodeId === node.id ? "node dragging" : "node"}
              >
                <circle cx={position.x} cy={position.y} r={node.type === "case" ? 34 : 26} fill={colors[node.type] ?? "#334155"} />
                <text x={position.x} y={position.y + 46} textAnchor="middle" className="node-label">
                  {node.label.slice(0, 28)}
                </text>
              </g>
            );
          })}
        </svg>
        <aside className="detail-panel">
          <h2>Node Details</h2>
          {selected ? (
            <>
              <strong>{selected.label}</strong>
              <span className="badge">{selected.type}</span>
              <pre>{JSON.stringify(selected.data, null, 2)}</pre>
            </>
          ) : (
            <p>Select a node to inspect entity details.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
