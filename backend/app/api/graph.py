import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_case_access
from app.db.session import get_db
from app.models.core import (
    BankAccount,
    Case,
    CasePersonRole,
    EvidenceItem,
    MobileNumber,
    Person,
    Relationship,
    UpiId,
    User,
)
from app.schemas.graph import GraphEdge, GraphNode, GraphResponse

router = APIRouter(prefix="/graph", tags=["graph"])


def _node_id(entity_type: str, entity_id: uuid.UUID) -> str:
    return f"{entity_type}:{entity_id}"


def _entity_label(db: Session, entity_type: str, entity_id: uuid.UUID) -> str:
    model_map = {
        "case": (Case, "case_title"),
        "person": (Person, "full_name"),
        "mobile_number": (MobileNumber, "mobile_number"),
        "bank_account": (BankAccount, "account_number"),
        "upi_id": (UpiId, "upi_handle"),
        "evidence": (EvidenceItem, "evidence_title"),
    }
    item = model_map.get(entity_type)
    if not item:
        return str(entity_id)
    model, attr = item
    record = db.get(model, entity_id)
    return str(getattr(record, attr)) if record else str(entity_id)


@router.get("/case/{case_id}", response_model=GraphResponse)
def case_graph(
    case_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_case_access(case_id, db, user)
    case = db.get(Case, case_id)
    nodes: dict[str, GraphNode] = {
        _node_id("case", case_id): GraphNode(
            id=_node_id("case", case_id),
            label=case.case_title if case else str(case_id),
            type="case",
            data={"case_number": case.case_number if case else None},
        )
    }
    edges: list[GraphEdge] = []

    for cpr in db.scalars(select(CasePersonRole).where(CasePersonRole.case_id == case_id)):
        person = db.get(Person, cpr.person_id)
        if not person or person.deleted_at:
            continue
        person_node_id = _node_id("person", person.id)
        nodes[person_node_id] = GraphNode(
            id=person_node_id, label=person.full_name, type="person", data={"role": cpr.role}
        )
        edges.append(
            GraphEdge(
                id=f"case-person:{cpr.id}",
                source=_node_id("case", case_id),
                target=person_node_id,
                label=f"{cpr.role.upper()}_IN",
                confidence="Confirmed",
                data={},
            )
        )

    relationships = db.scalars(
        select(Relationship).where(
            Relationship.case_id == case_id, Relationship.deleted_at.is_(None)
        )
    )
    for rel in relationships:
        source_id = _node_id(rel.source_entity_type, rel.source_entity_id)
        target_id = _node_id(rel.target_entity_type, rel.target_entity_id)
        nodes.setdefault(
            source_id,
            GraphNode(
                id=source_id,
                label=_entity_label(db, rel.source_entity_type, rel.source_entity_id),
                type=rel.source_entity_type,
            ),
        )
        nodes.setdefault(
            target_id,
            GraphNode(
                id=target_id,
                label=_entity_label(db, rel.target_entity_type, rel.target_entity_id),
                type=rel.target_entity_type,
            ),
        )
        edges.append(
            GraphEdge(
                id=str(rel.id),
                source=source_id,
                target=target_id,
                label=rel.relationship_type,
                confidence=rel.confidence,
                data={"source": rel.source_of_relationship, "notes": rel.notes},
            )
        )

    return GraphResponse(nodes=list(nodes.values()), edges=edges)


@router.get("/person/{person_id}", response_model=GraphResponse)
def person_graph(
    person_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    person = db.get(Person, person_id)
    nodes: dict[str, GraphNode] = {
        _node_id("person", person_id): GraphNode(
            id=_node_id("person", person_id),
            label=person.full_name if person else str(person_id),
            type="person",
        )
    }
    edges: list[GraphEdge] = []
    relationships = db.scalars(
        select(Relationship).where(
            Relationship.deleted_at.is_(None),
            (
                (Relationship.source_entity_type == "person")
                & (Relationship.source_entity_id == person_id)
            )
            | (
                (Relationship.target_entity_type == "person")
                & (Relationship.target_entity_id == person_id)
            ),
        )
    )
    for rel in relationships:
        if rel.case_id:
            require_case_access(rel.case_id, db, user)
        source_id = _node_id(rel.source_entity_type, rel.source_entity_id)
        target_id = _node_id(rel.target_entity_type, rel.target_entity_id)
        nodes.setdefault(
            source_id,
            GraphNode(
                id=source_id,
                label=_entity_label(db, rel.source_entity_type, rel.source_entity_id),
                type=rel.source_entity_type,
            ),
        )
        nodes.setdefault(
            target_id,
            GraphNode(
                id=target_id,
                label=_entity_label(db, rel.target_entity_type, rel.target_entity_id),
                type=rel.target_entity_type,
            ),
        )
        edges.append(
            GraphEdge(
                id=str(rel.id),
                source=source_id,
                target=target_id,
                label=rel.relationship_type,
                confidence=rel.confidence,
            )
        )
    return GraphResponse(nodes=list(nodes.values()), edges=edges)
