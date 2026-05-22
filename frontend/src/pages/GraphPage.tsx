import { useEffect, useMemo, useState } from "react";
import { caseGraph, listCases } from "../api/casegraph";
import type { CaseRecord, GraphNode, GraphResponse } from "../types/api";

const colors: Record<string, string> = {
  case: "#0f766e",
  person: "#2563eb",
  mobile_number: "#7c3aed",
  bank_account: "#b45309",
  upi_id: "#be123c",
  evidence: "#475569"
};

export function GraphPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [caseId, setCaseId] = useState("");
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [error, setError] = useState("");

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

  const positions = useMemo(() => {
    if (!graph) return new Map<string, { x: number; y: number }>();
    const map = new Map<string, { x: number; y: number }>();
    const center = { x: 430, y: 260 };
    graph.nodes.forEach((node, index) => {
      if (node.type === "case") {
        map.set(node.id, center);
        return;
      }
      const angle = (index / Math.max(graph.nodes.length - 1, 1)) * Math.PI * 2;
      map.set(node.id, {
        x: center.x + Math.cos(angle) * 260,
        y: center.y + Math.sin(angle) * 180
      });
    });
    return map;
  }, [graph]);

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
        {error && <span className="error-inline">{error}</span>}
      </div>
      <div className="graph-panel">
        <svg viewBox="0 0 860 520" role="img" aria-label="Case relationship graph">
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
              <g key={node.id} onClick={() => setSelected(node)} className="node">
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
