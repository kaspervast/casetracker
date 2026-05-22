from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.passwords import hash_password
from app.db.session import SessionLocal
from app.models.core import (
    BankAccount,
    Case,
    CaseAssignment,
    CasePersonRole,
    EvidenceItem,
    MobileNumber,
    Permission,
    Person,
    Relationship,
    Role,
    RolePermission,
    UpiId,
    User,
    UserRole,
)

PERMISSIONS = [
    "*",
    "cases:read_all",
    "cases:create",
    "cases:update",
    "cases:delete",
    "persons:create",
    "persons:update",
    "relationships:create",
    "audit:read",
]

ROLE_PERMISSIONS = {
    "Super Admin": ["*"],
    "Admin Officer": ["cases:read_all", "cases:create", "cases:update", "persons:create", "persons:update", "relationships:create", "audit:read"],
    "Investigating Officer": ["cases:create", "cases:update", "persons:create", "persons:update", "relationships:create"],
    "Assistant Officer": ["persons:create", "relationships:create"],
    "Read-only Viewer": [],
    "Auditor": ["cases:read_all", "audit:read"],
}

USERS = [
    ("superadmin", "Super Admin", "Super Admin", "ChangeMe#2026"),
    ("adminofficer", "Admin Officer", "Admin Officer", "Admin#2026"),
    ("iofficer", "Investigating Officer", "Investigating Officer", "Officer#2026"),
]


def get_or_create(db: Session, model, defaults: dict | None = None, **lookup):
    item = db.scalar(select(model).filter_by(**lookup))
    if item:
        return item
    item = model(**lookup, **(defaults or {}))
    db.add(item)
    db.flush()
    return item


def seed() -> None:
    db = SessionLocal()
    try:
        permissions = {
            code: get_or_create(db, Permission, code=code, defaults={"description": code})
            for code in PERMISSIONS
        }
        roles = {
            name: get_or_create(db, Role, name=name, defaults={"description": name})
            for name in ROLE_PERMISSIONS
        }
        for role_name, permission_codes in ROLE_PERMISSIONS.items():
            for code in permission_codes:
                get_or_create(
                    db,
                    RolePermission,
                    role_id=roles[role_name].id,
                    permission_id=permissions[code].id,
                )

        users = {}
        for username, full_name, role_name, password in USERS:
            user = get_or_create(
                db,
                User,
                username=username,
                defaults={
                    "full_name": full_name,
                    "password_hash": hash_password(password),
                    "police_station": "Cyber Crime Police Station",
                    "district": "Ahmedabad",
                },
            )
            users[username] = user
            get_or_create(db, UserRole, user_id=user.id, role_id=roles[role_name].id)

        creator = users["superadmin"]
        case = get_or_create(
            db,
            Case,
            case_number="FIR/CR No. 112/2026",
            defaults={
                "case_title": "Sample cyber fraud investigation",
                "police_station": "Cyber Crime Police Station",
                "district": "Ahmedabad",
                "city": "Ahmedabad",
                "case_type": "Cyber fraud",
                "case_status": "Investigation in progress",
                "priority": "High",
                "short_summary": "Seed case for validating CaseGraph LE workflows.",
                "confidentiality_level": "Sensitive",
                "tags": ["seed", "cyber-fraud"],
                "created_by": creator.id,
                "updated_by": creator.id,
            },
        )
        for user in users.values():
            get_or_create(db, CaseAssignment, case_id=case.id, user_id=user.id)

        people = [
            ("Accused One", "Accused"),
            ("Accused Two", "Accused"),
            ("Accused Three", "Accused"),
            ("Complainant One", "Complainant"),
            ("Witness One", "Witness"),
            ("Witness Two", "Witness"),
        ]
        person_records = []
        for name, role in people:
            person = get_or_create(
                db,
                Person,
                full_name=name,
                defaults={"risk_level": "High" if role == "Accused" else "Unknown", "created_by": creator.id, "updated_by": creator.id},
            )
            person_records.append((person, role))
            get_or_create(db, CasePersonRole, case_id=case.id, person_id=person.id, role=role)
            rel_type = f"{role.upper()}_IN"
            get_or_create(
                db,
                Relationship,
                source_entity_type="person",
                source_entity_id=person.id,
                target_entity_type="case",
                target_entity_id=case.id,
                relationship_type=rel_type,
                case_id=case.id,
                defaults={"confidence": "Confirmed", "created_by": creator.id, "updated_by": creator.id},
            )

        mobiles = [
            get_or_create(db, MobileNumber, mobile_number="9876500001", defaults={"subscriber_name": "Accused One", "created_by": creator.id, "updated_by": creator.id}),
            get_or_create(db, MobileNumber, mobile_number="9876500002", defaults={"subscriber_name": "Accused Two", "created_by": creator.id, "updated_by": creator.id}),
            get_or_create(db, MobileNumber, mobile_number="9876500003", defaults={"subscriber_name": "Complainant One", "created_by": creator.id, "updated_by": creator.id}),
        ]
        accounts = [
            get_or_create(db, BankAccount, account_number="123456789001", defaults={"bank_name": "Sample Bank", "account_holder_name": "Accused One", "created_by": creator.id, "updated_by": creator.id}),
            get_or_create(db, BankAccount, account_number="123456789002", defaults={"bank_name": "Sample Bank", "account_holder_name": "Accused Two", "created_by": creator.id, "updated_by": creator.id}),
            get_or_create(db, BankAccount, account_number="123456789003", defaults={"bank_name": "Sample Bank", "account_holder_name": "Complainant One", "created_by": creator.id, "updated_by": creator.id}),
        ]
        upis = [
            get_or_create(db, UpiId, upi_handle="accused1@upi", defaults={"display_name": "Accused One", "created_by": creator.id, "updated_by": creator.id}),
            get_or_create(db, UpiId, upi_handle="accused2@upi", defaults={"display_name": "Accused Two", "created_by": creator.id, "updated_by": creator.id}),
        ]
        evidence = [
            get_or_create(db, EvidenceItem, evidence_title="Bank statement extract", defaults={"evidence_type": "Bank record", "linked_case_id": case.id, "created_by": creator.id, "updated_by": creator.id}),
            get_or_create(db, EvidenceItem, evidence_title="Complainant statement", defaults={"evidence_type": "Statement", "linked_case_id": case.id, "created_by": creator.id, "updated_by": creator.id}),
        ]
        rels = [
            (person_records[0][0], "HAS_MOBILE", "mobile_number", mobiles[0].id),
            (person_records[1][0], "HAS_MOBILE", "mobile_number", mobiles[1].id),
            (person_records[0][0], "HAS_BANK_ACCOUNT", "bank_account", accounts[0].id),
            (person_records[1][0], "HAS_BANK_ACCOUNT", "bank_account", accounts[1].id),
            (person_records[0][0], "USES_UPI", "upi_id", upis[0].id),
            (person_records[1][0], "USES_UPI", "upi_id", upis[1].id),
        ]
        for source_person, rel_type, target_type, target_id in rels:
            get_or_create(
                db,
                Relationship,
                source_entity_type="person",
                source_entity_id=source_person.id,
                target_entity_type=target_type,
                target_entity_id=target_id,
                relationship_type=rel_type,
                case_id=case.id,
                defaults={"confidence": "Confirmed", "created_by": creator.id, "updated_by": creator.id},
            )
        for ev in evidence:
            get_or_create(
                db,
                Relationship,
                source_entity_type="evidence",
                source_entity_id=ev.id,
                target_entity_type="case",
                target_entity_id=case.id,
                relationship_type="MENTIONS",
                case_id=case.id,
                defaults={"confidence": "High", "created_by": creator.id, "updated_by": creator.id},
            )
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
