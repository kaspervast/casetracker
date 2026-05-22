import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5hierarchy from "@amcharts/amcharts5/hierarchy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import { caseGraph, listCases } from "../api/casegraph";
import type { CaseRecord, GraphEdge, GraphNode, GraphResponse } from "../types/api";

type LayoutMode = "force" | "top-down" | "left-right" | "clustered";

type ChartNode = {
  id: string;
  name: string;
  value: number;
  entityType: string;
  linkWith?: string[];
  children?: ChartNode[];
};

const colors: Record<string, number> = {
  case: 0x0f766e,
  person: 0x2563eb,
  mobile_number: 0x7c3aed,
  bank_account: 0xb45309,
  upi_id: 0xbe123c,
  evidence: 0x475569
};

const layoutLabels: Record<LayoutMode, string> = {
  force: "Zoomable force tree",
  "top-down": "Top down tree",
  "left-right": "Left-right tree",
  clustered: "Clustered hierarchy"
};

function rootGraphNode(graph: GraphResponse): GraphNode | undefined {
  return graph.nodes.find((node) => node.type === "case") ?? graph.nodes[0];
}

function nodeDegree(graph: GraphResponse, nodeId: string) {
  return graph.edges.filter((edge) => edge.source === nodeId || edge.target === nodeId).length;
}

function toChartNode(graph: GraphResponse, node: GraphNode, includeLinks: boolean): ChartNode {
  const linkedIds = includeLinks
    ? graph.edges
        .filter((edge) => edge.source === node.id || edge.target === node.id)
        .map((edge) => (edge.source === node.id ? edge.target : edge.source))
    : undefined;

  return {
    id: node.id,
    name: node.label,
    value: Math.max(nodeDegree(graph, node.id), 1),
    entityType: node.type,
    linkWith: linkedIds,
    children: []
  };
}

function buildForceData(graph: GraphResponse): ChartNode[] {
  const root = rootGraphNode(graph);
  if (!root) return [];
  const rootNode = toChartNode(graph, root, true);
  rootNode.children = graph.nodes
    .filter((node) => node.id !== root.id)
    .map((node) => toChartNode(graph, node, true));
  return [rootNode];
}

function buildTreeData(graph: GraphResponse): ChartNode[] {
  const root = rootGraphNode(graph);
  if (!root) return [];

  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, string[]>();
  graph.nodes.forEach((node) => adjacency.set(node.id, []));
  graph.edges.forEach((edge) => {
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
  });

  const visited = new Set<string>([root.id]);
  const chartNodeById = new Map<string, ChartNode>();
  const rootNode = toChartNode(graph, root, false);
  chartNodeById.set(root.id, rootNode);
  const queue = [root.id];

  while (queue.length) {
    const currentId = queue.shift()!;
    const currentChartNode = chartNodeById.get(currentId)!;
    const neighbors = [...(adjacency.get(currentId) ?? [])].sort((a, b) => {
      const typeA = nodeById.get(a)?.type ?? "";
      const typeB = nodeById.get(b)?.type ?? "";
      return typeA.localeCompare(typeB) || (nodeById.get(a)?.label ?? "").localeCompare(nodeById.get(b)?.label ?? "");
    });

    for (const neighborId of neighbors) {
      if (visited.has(neighborId)) continue;
      const neighbor = nodeById.get(neighborId);
      if (!neighbor) continue;
      visited.add(neighborId);
      const child = toChartNode(graph, neighbor, false);
      chartNodeById.set(neighborId, child);
      currentChartNode.children?.push(child);
      queue.push(neighborId);
    }
  }

  for (const node of graph.nodes) {
    if (visited.has(node.id)) continue;
    rootNode.children?.push(toChartNode(graph, node, false));
  }

  return [rootNode];
}

function describeLayout(layout: LayoutMode) {
  if (layout === "top-down") return "Tree layout with orthogonal/angular parent-child edges.";
  if (layout === "left-right") return "Horizontal hierarchy for wide investigations.";
  if (layout === "clustered") return "Clustered hierarchy keeps leaf nodes aligned by depth.";
  return "Force-directed investigation graph with draggable nodes and cross-links.";
}

function findGraphNode(graph: GraphResponse, chartNode: ChartNode | undefined) {
  if (!chartNode) return null;
  return graph.nodes.find((node) => node.id === chartNode.id) ?? null;
}

function configureSeries(series: am5hierarchy.LinkedHierarchy, graph: GraphResponse, onSelect: (node: GraphNode) => void) {
  series.nodes.template.setAll({
    cursorOverStyle: "pointer",
    draggable: true,
    tooltipText: "{name}\n{entityType}"
  });

  series.circles.template.setAll({
    strokeWidth: 2,
    strokeOpacity: 1
  });

  series.circles.template.adapters.add("fill", (fill, target) => {
    const data = target.dataItem?.dataContext as ChartNode | undefined;
    const color = colors[data?.entityType ?? ""];
    return color ? am5.color(color) : fill ?? am5.color(0x334155);
  });

  series.circles.template.adapters.add("stroke", (stroke, target) => {
    const data = target.dataItem?.dataContext as ChartNode | undefined;
    const color = colors[data?.entityType ?? ""];
    return color ? am5.color(color) : stroke ?? am5.color(0x334155);
  });

  series.links.template.setAll({
    strokeOpacity: 0.55,
    strokeWidth: 2
  });

  series.labels.template.setAll({
    fontSize: 12,
    oversizedBehavior: "wrap",
    maxWidth: 150,
    fill: am5.color(0x172033)
  });

  series.nodes.template.events.on("click", (event) => {
    const chartNode = event.target.dataItem?.dataContext as ChartNode | undefined;
    const graphNode = findGraphNode(graph, chartNode);
    if (graphNode) onSelect(graphNode);
  });
}

export function GraphPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [caseId, setCaseId] = useState("");
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [layout, setLayout] = useState<LayoutMode>("force");
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [error, setError] = useState("");
  const chartRef = useRef<HTMLDivElement | null>(null);

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
    caseGraph(caseId)
      .then((nextGraph) => {
        setGraph(nextGraph);
        setSelected(null);
      })
      .catch((err) => setError(err.message));
  }, [caseId]);

  const selectedCase = useMemo(
    () => cases.find((item) => item.id === caseId),
    [caseId, cases]
  );

  useLayoutEffect(() => {
    if (!chartRef.current || !graph) return;

    const root = am5.Root.new(chartRef.current);
    root.setThemes([am5themes_Animated.new(root)]);

    const zoomable = root.container.children.push(
      am5.ZoomableContainer.new(root, {
        width: am5.p100,
        height: am5.p100,
        wheelable: true,
        pinchZoom: true
      })
    );

    zoomable.children.push(
      am5.ZoomTools.new(root, {
        target: zoomable,
        x: am5.p100,
        centerX: am5.p100,
        y: am5.p100,
        centerY: am5.p100
      })
    );

    const commonSettings = {
      valueField: "value",
      categoryField: "name",
      childDataField: "children",
      idField: "id"
    };

    let series: am5hierarchy.LinkedHierarchy;
    if (layout === "force") {
      series = zoomable.contents.children.push(
        am5hierarchy.ForceDirected.new(root, {
          ...commonSettings,
          linkWithField: "linkWith",
          minRadius: 22,
          maxRadius: 44,
          nodePadding: 16,
          centerStrength: 0.8,
          manyBodyStrength: -18,
          linkWithStrength: 0.8,
          initialFrames: 220
        })
      );
      series.data.setAll(buildForceData(graph));
    } else {
      series = zoomable.contents.children.push(
        am5hierarchy.Tree.new(root, {
          ...commonSettings,
          orientation: layout === "left-right" ? "horizontal" : "vertical",
          clustered: layout === "clustered",
          singleBranchOnly: false,
          downDepth: 99,
          initialDepth: 99,
          nodeSeparation: () => 1.15
        })
      );
      series.data.setAll(buildTreeData(graph));
    }

    configureSeries(series, graph, setSelected);
    series.set("selectedDataItem", series.dataItems[0]);
    series.appear(800, 80);

    return () => root.dispose();
  }, [graph, layout]);

  const edgeSummary = useMemo(() => {
    if (!graph) return [];
    const counts = new Map<string, number>();
    graph.edges.forEach((edge: GraphEdge) => {
      counts.set(edge.label, (counts.get(edge.label) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b));
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
        <select value={layout} onChange={(event) => setLayout(event.target.value as LayoutMode)}>
          {Object.entries(layoutLabels).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
        <span className="graph-hint">{describeLayout(layout)}</span>
        {error && <span className="error-inline">{error}</span>}
      </div>

      <div className="graph-panel">
        <div className="amchart-graph" ref={chartRef} />
        <aside className="detail-panel">
          <h2>Graph Details</h2>
          {selectedCase && (
            <p className="muted">
              {selectedCase.case_number}: {selectedCase.case_title}
            </p>
          )}
          {selected ? (
            <>
              <strong>{selected.label}</strong>
              <span className="badge">{selected.type}</span>
              <pre>{JSON.stringify(selected.data, null, 2)}</pre>
            </>
          ) : (
            <p>Select a node to inspect entity details. Use mouse wheel or pinch to zoom; drag the canvas to pan. In force layout, nodes can be dragged.</p>
          )}
          <h2>Relationship Types</h2>
          <div className="edge-summary">
            {edgeSummary.map(([label, count]) => (
              <span className="badge" key={label}>
                {label}: {count}
              </span>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
