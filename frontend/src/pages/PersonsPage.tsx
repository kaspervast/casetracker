import { FormEvent, useEffect, useState } from "react";
import { createPerson, deletePerson, listCases, listPersons, updatePerson } from "../api/casegraph";
import type { CaseRecord, PersonRecord } from "../types/api";
import { moveById } from "../utils/reorder";

const personRoleOptions = ["Accused", "Suspect", "Complainant", "Witness", "Victim", "Other"];

export function PersonsPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [persons, setPersons] = useState<PersonRecord[]>([]);
  const [fullName, setFullName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [personRole, setPersonRole] = useState("Witness");
  const [error, setError] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PersonRecord | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  async function loadCasesContext() {
    const items = await listCases();
    setCases(items);
    setSelectedCaseId((current) => current || items[0]?.id || "");
  }

  async function load(caseId: string) {
    if (!caseId) {
      setPersons([]);
      return;
    }
    setPersons(await listPersons(caseId));
  }

  useEffect(() => {
    loadCasesContext().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load(selectedCaseId).catch((err) => setError(err.message));
  }, [selectedCaseId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedCaseId) {
      setError("Select a case before creating a person");
      return;
    }
    setError("");
    try {
      await createPerson({
        case_id: selectedCaseId,
        role: personRole,
        full_name: fullName,
        father_name: fatherName || null
      });
      setFullName("");
      setFatherName("");
      setPersonRole("Witness");
      await load(selectedCaseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Person creation failed");
    }
  }

  async function removePerson(person: PersonRecord) {
    const reason = window.prompt(`Reason for deleting person ${person.full_name}`);
    if (!reason?.trim()) return;
    setError("");
    try {
      await deletePerson(person.id, reason.trim());
      await load(selectedCaseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Person delete failed");
    }
  }

  function startEdit(person: PersonRecord) {
    setEditing(person);
    setEditForm({
      full_name: person.full_name,
      alias_or_nickname: person.alias_or_nickname ?? "",
      father_name: person.father_name ?? "",
      risk_level: person.risk_level,
      verification_status: person.verification_status,
      is_absconding: String(person.is_absconding),
      is_arrested: String(person.is_arrested)
    });
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setError("");
    try {
      await updatePerson(editing.id, {
        full_name: editForm.full_name?.trim(),
        alias_or_nickname: editForm.alias_or_nickname?.trim() || null,
        father_name: editForm.father_name?.trim() || null,
        risk_level: editForm.risk_level?.trim() || "Unknown",
        verification_status: editForm.verification_status?.trim() || "Unverified",
        is_absconding: editForm.is_absconding === "true",
        is_arrested: editForm.is_arrested === "true"
      });
      setEditing(null);
      setEditForm({});
      await load(selectedCaseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Person update failed");
    }
  }

  function dropOn(targetId: string) {
    if (!draggedId) return;
    setPersons((items) => moveById(items, draggedId, targetId));
    setDraggedId(null);
  }

  return (
    <section className="stack">
      <div className="context-toolbar">
        <select value={selectedCaseId} onChange={(event) => setSelectedCaseId(event.target.value)}>
          {cases.map((item) => (
            <option key={item.id} value={item.id}>
              {item.case_number} - {item.case_title}
            </option>
          ))}
        </select>
        <p className="context-note">
          People listed and created here are linked to the selected case.
        </p>
      </div>
      <form className="inline-form" onSubmit={submit}>
        <select value={personRole} onChange={(event) => setPersonRole(event.target.value)}>
          {personRoleOptions.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
        <input placeholder="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
        <input placeholder="Father name" value={fatherName} onChange={(event) => setFatherName(event.target.value)} />
        <button className="primary" disabled={!selectedCaseId}>Create Person</button>
      </form>
      {editing && (
        <form className="edit-panel" onSubmit={saveEdit}>
          <h2>Edit Person</h2>
          <div className="edit-grid">
            <input placeholder="Full name" value={editForm.full_name ?? ""} onChange={(event) => setEditForm({ ...editForm, full_name: event.target.value })} />
            <input placeholder="Alias or nickname" value={editForm.alias_or_nickname ?? ""} onChange={(event) => setEditForm({ ...editForm, alias_or_nickname: event.target.value })} />
            <input placeholder="Father name" value={editForm.father_name ?? ""} onChange={(event) => setEditForm({ ...editForm, father_name: event.target.value })} />
            <input placeholder="Risk level" value={editForm.risk_level ?? ""} onChange={(event) => setEditForm({ ...editForm, risk_level: event.target.value })} />
            <input placeholder="Verification status" value={editForm.verification_status ?? ""} onChange={(event) => setEditForm({ ...editForm, verification_status: event.target.value })} />
            <select value={editForm.is_absconding ?? "false"} onChange={(event) => setEditForm({ ...editForm, is_absconding: event.target.value })}>
              <option value="false">Not absconding</option>
              <option value="true">Absconding</option>
            </select>
            <select value={editForm.is_arrested ?? "false"} onChange={(event) => setEditForm({ ...editForm, is_arrested: event.target.value })}>
              <option value="false">Not arrested</option>
              <option value="true">Arrested</option>
            </select>
          </div>
          <div className="form-actions">
            <button className="primary">Save Changes</button>
            <button className="secondary-button" type="button" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}
      {error && <div className="error">{error}</div>}
      <div className="records">
        {persons.map((person) => (
          <article
            className="record draggable-record"
            draggable
            key={person.id}
            onDragStart={() => setDraggedId(person.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => dropOn(person.id)}
          >
            <div>
              <span className="drag-handle">Drag to reorder</span>
              <strong>{person.full_name}</strong>
              <p>Father: {person.father_name ?? "Not recorded"}</p>
            </div>
            <div className="badges">
              {person.case_role && <span className="badge">{person.case_role}</span>}
              <span className="badge">{person.risk_level}</span>
              <span className="badge">{person.verification_status}</span>
              {person.is_arrested && <span className="badge danger">Arrested</span>}
              <button className="secondary-button" type="button" onClick={() => startEdit(person)}>
                Edit
              </button>
              <button className="danger-button" type="button" onClick={() => removePerson(person)}>
                Delete
              </button>
            </div>
          </article>
        ))}
        {!persons.length && <div className="empty">No persons linked to the selected case.</div>}
      </div>
    </section>
  );
}
