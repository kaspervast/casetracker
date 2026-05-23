import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5hierarchy from "@amcharts/amcharts5/hierarchy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import { caseGraph, listCases } from "../api/casegraph";
import type { CaseRecord, GraphEdge, GraphNode, GraphResponse } from "../types/api";

type LayoutMode = "force" | "force-bullets" | "top-down" | "left-right" | "clustered" | "hierarchical";

type ChartNode = {
  id: string;
  name: string;
  shortName: string;
  value: number;
  entityType: string;
  linkWith?: string[];
  children?: ChartNode[];
};

const nodeDimensions: Record<string, { width: number; height: number; radius: number }> = {
  case: { width: 176, height: 54, radius: 8 },
  person: { width: 154, height: 46, radius: 8 },
  mobile_number: { width: 150, height: 44, radius: 6 },
  bank_account: { width: 164, height: 46, radius: 6 },
  upi_id: { width: 142, height: 42, radius: 6 },
  evidence: { width: 158, height: 44, radius: 6 },
  default: { width: 150, height: 44, radius: 6 }
};

const colors: Record<string, number> = {
  case: 0x0f766e,
  person: 0x2563eb,
  mobile_number: 0x7c3aed,
  bank_account: 0xb45309,
  upi_id: 0xbe123c,
  evidence: 0x475569
};

const entityTypePriority: Record<string, number> = {
  case: 0,
  person: 1,
  mobile_number: 2,
  bank_account: 3,
  upi_id: 4,
  evidence: 5,
  default: 6
};

const layoutLabels: Record<LayoutMode, string> = {
  force: "Zoomable force tree",
  "force-bullets": "Animated link bullets",
  "top-down": "Top down tree",
  "left-right": "Left-right tree",
  clustered: "Clustered hierarchy",
  hierarchical: "Hierarchical layering"
};

function rootGraphNode(graph: GraphResponse): GraphNode | undefined {
  return graph.nodes.find((node) => node.type === "case") ?? graph.nodes[0];
}

function nodeDegree(graph: GraphResponse, nodeId: string) {
  return graph.edges.filter((edge) => edge.source === nodeId || edge.target === nodeId).length;
}

function compactLabel(label: string) {
  return label.length > 22 ? `${label.slice(0, 19)}...` : label;
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
    shortName: compactLabel(node.label),
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

function chartNodePriority(node: ChartNode) {
  return entityTypePriority[node.entityType] ?? entityTypePriority.default;
}

function sortHierarchyTree(node: ChartNode) {
  if (!node.children?.length) return 1;

  const weights = new Map<string, number>();
  for (const child of node.children) {
    weights.set(child.id, sortHierarchyTree(child));
  }

  node.children.sort((a, b) => {
    const priorityDelta = chartNodePriority(a) - chartNodePriority(b);
    if (priorityDelta !== 0) return priorityDelta;

    const weightDelta = (weights.get(b.id) ?? 0) - (weights.get(a.id) ?? 0);
    if (weightDelta !== 0) return weightDelta;

    return a.name.localeCompare(b.name);
  });

  return 1 + Array.from(weights.values()).reduce((sum, value) => sum + value, 0);
}

function buildTreeData(graph: GraphResponse, layout: LayoutMode): ChartNode[] {
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
      const nodeA = nodeById.get(a);
      const nodeB = nodeById.get(b);
      const priorityA = entityTypePriority[nodeA?.type ?? "default"] ?? entityTypePriority.default;
      const priorityB = entityTypePriority[nodeB?.type ?? "default"] ?? entityTypePriority.default;

      if (priorityA !== priorityB) return priorityA - priorityB;

      if (layout === "hierarchical") {
        const degreeDelta = nodeDegree(graph, b) - nodeDegree(graph, a);
        if (degreeDelta !== 0) return degreeDelta;
      }

      return (nodeA?.label ?? "").localeCompare(nodeB?.label ?? "");
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

  if (layout === "hierarchical") {
    sortHierarchyTree(rootNode);
  }

  return [rootNode];
}

function describeLayout(layout: LayoutMode) {
  if (layout === "force-bullets") return "Force-directed graph with animated bullets traveling along relationship links.";
  if (layout === "top-down") return "Vertical tree layout for a clean top-down investigation view.";
  if (layout === "left-right") return "Horizontal hierarchy for wide investigations.";
  if (layout === "clustered") return "Clustered hierarchy keeps leaf nodes aligned by depth.";
  if (layout === "hierarchical") return "Compact layered hierarchy ordered by entity group and branch weight.";
  return "Force-directed investigation graph with draggable nodes and cross-links.";
}

function findGraphNode(graph: GraphResponse, chartNode: ChartNode | undefined) {
  if (!chartNode) return null;
  return graph.nodes.find((node) => node.id === chartNode.id) ?? null;
}

function configureSeries(
  series: am5hierarchy.LinkedHierarchy,
  graph: GraphResponse,
  layout: LayoutMode,
  onSelect: (node: GraphNode) => void
) {
  series.nodes.template.setAll({
    cursorOverStyle: "pointer",
    draggable: true,
    tooltipText: "{name}\n{entityType}",
    width: 170,
    height: 58
  });

  series.circles.template.setAll({
    forceHidden: true,
    radius: 1
  });

  series.links.template.setAll({
    stroke: am5.color(layout === "hierarchical" ? 0x7c6f79 : 0x94a3b8),
    strokeOpacity: layout === "hierarchical" ? 0.75 : 0.55,
    strokeWidth: layout === "hierarchical" ? 1.75 : 2
  });

  series.labels.template.setAll({
    forceHidden: true,
    visible: false
  });

  series.bullets.push((root, _series, dataItem) => {
    const data = dataItem.dataContext as ChartNode | undefined;
    const dimensions = nodeDimensions[data?.entityType ?? "default"] ?? nodeDimensions.default;
    const fill = am5.color(colors[data?.entityType ?? ""] ?? 0x334155);
    const container = am5.Container.new(root, {
      centerX: am5.p50,
      centerY: am5.p50,
      width: dimensions.width,
      height: dimensions.height,
      x: 0,
      y: 0,
      interactive: false
    });

    container.children.push(
      am5.RoundedRectangle.new(root, {
        width: dimensions.width,
        height: dimensions.height,
        x: -dimensions.width / 2,
        y: -dimensions.height / 2,
        fill,
        fillOpacity: 0.96,
        stroke: am5.color(0xffffff),
        strokeOpacity: 0.95,
        strokeWidth: 2,
        cornerRadiusTL: dimensions.radius,
        cornerRadiusTR: dimensions.radius,
        cornerRadiusBR: dimensions.radius,
        cornerRadiusBL: dimensions.radius,
        shadowColor: am5.color(0x0f172a),
        shadowBlur: 4,
        shadowOpacity: 0.16,
        shadowOffsetY: 2
      })
    );

    container.children.push(
      am5.Label.new(root, {
        text: data?.shortName ?? "",
        centerX: am5.p50,
        centerY: am5.p50,
        x: 0,
        y: 0,
        width: dimensions.width - 22,
        oversizedBehavior: "truncate",
        textAlign: "center",
        fontSize: 12,
        fontWeight: "600",
        populateText: true,
        fill: am5.color(0xffffff)
      })
    );

    return am5.Bullet.new(root, {
      sprite: container
    });
  });

  series.nodes.template.events.on("click", (event) => {
    const chartNode = event.target.dataItem?.dataContext as ChartNode | undefined;
    const graphNode = findGraphNode(graph, chartNode);
    if (graphNode) onSelect(graphNode);
  });
}

function addAnimatedLinkBullets(root: am5.Root, series: am5hierarchy.LinkedHierarchy) {
  series.linkBullets.push((_root, source, target) => {
    const sourceNode = source.dataContext as ChartNode | undefined;
    const targetNode = target.dataContext as ChartNode | undefined;
    const sourceColor = am5.color(colors[sourceNode?.entityType ?? ""] ?? 0x0f766e);
    const bullet = am5.Bullet.new(root, {
      locationX: 0,
      sprite: am5.Circle.new(root, {
        radius: 4,
        fill: sourceColor,
        stroke: am5.color(0xffffff),
        strokeWidth: 1,
        tooltipText: `${sourceNode?.name ?? "Source"} -> ${targetNode?.name ?? "Target"}`
      })
    });

    bullet.animate({
      key: "locationX",
      from: 0,
      to: 1,
      duration: 1800 + Math.round(Math.random() * 1400),
      loops: Infinity,
      easing: am5.ease.linear
    });

    return bullet;
  });
}

function treeSeparation(layout: LayoutMode) {
  return (a: any, b: any) => {
    const sameParent = a.get("parent") === b.get("parent");

    if (layout === "hierarchical") {
      return sameParent ? 0.92 : 1.22;
    }

    if (layout === "clustered") {
      return sameParent ? 1.08 : 1.38;
    }

    if (layout === "left-right") {
      return sameParent ? 1 : 1.28;
    }

    return sameParent ? 1.05 : 1.3;
  };
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
    if (layout === "force" || layout === "force-bullets") {
      series = zoomable.contents.children.push(
        am5hierarchy.ForceDirected.new(root, {
          ...commonSettings,
          linkWithField: "linkWith",
          minRadius: 22,
          maxRadius: 30,
          nodePadding: 56,
          centerStrength: 0.8,
          manyBodyStrength: -18,
          linkWithStrength: 0.8,
          initialFrames: 220
        })
      );
      if (layout === "force-bullets") {
        addAnimatedLinkBullets(root, series);
      }
      series.data.setAll(buildForceData(graph));
    } else {
      series = zoomable.contents.children.push(
        am5hierarchy.Tree.new(root, {
          ...commonSettings,
          orientation: layout === "left-right" ? "horizontal" : "vertical",
          clustered: layout === "clustered",
          paddingLeft: layout === "hierarchical" ? 72 : 20,
          paddingRight: layout === "hierarchical" ? 72 : 20,
          paddingTop: layout === "hierarchical" ? 30 : 20,
          paddingBottom: layout === "hierarchical" ? 30 : 20,
          singleBranchOnly: false,
          downDepth: 99,
          initialDepth: 99,
          nodeSeparation: treeSeparation(layout)
        })
      );
      series.data.setAll(buildTreeData(graph, layout));
    }

    configureSeries(series, graph, layout, setSelected);
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
