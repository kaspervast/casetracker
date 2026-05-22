from typing import Any

from pydantic import BaseModel


class GraphNode(BaseModel):
    id: str
    label: str
    type: str
    data: dict[str, Any] = {}


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str
    confidence: str
    data: dict[str, Any] = {}


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
