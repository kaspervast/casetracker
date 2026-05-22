import { FormEvent, useEffect, useState } from "react";
import { createCase, deleteCase, listCases, updateCase } from "../api/casegraph";
import type { CaseRecord } from "../types/api";
import { moveById } from "../utils/reorder";

export function CasesPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [caseNumber, setCaseNumber] = useState("");
  const [caseTitle, setCaseTitle] = useState("");
  const [error, setError] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<CaseRecord | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  async function load() {
    setCases(await listCases());
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await createCase({
        case_number: caseNumber,
        case_title: caseTitle,
        case_status: "Draft",
        priority: "Medium",
        confidentiality_level: "Normal"
      });
      setCaseNumber("");
      setCaseTitle("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Case creation failed");
    }
  }

  async function removeCase(item: CaseRecord) {
    const reason = window.prompt(`Reason for deleting case ${item.case_number}`);
    if (!reason?.trim()) return;
    setError("");
    try {
      await deleteCase(item.id, reason.trim());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Case delete failed");
    }
  }

  function startEdit(item: CaseRecord) {
    setEditing(item);
    setEditForm({
      case_number: item.case_number,
      case_title: item.case_title,
      police_station: item.police_station ?? "",
      district: item.district ?? "",
      city: item.city ?? "",
      case_type: item.case_type ?? "",
      case_status: item.case_status,
      priority: item.priority,
      confidentiality_level: item.confidentiality_level,
      short_summary: item.short_summary ?? ""
    });
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setError("");
    try {
      await updateCase(editing.id, {
        case_number: editForm.case_number?.trim(),
        case_title: editForm.case_title?.trim(),
        police_station: editForm.police_station?.trim() || null,
        district: editForm.district?.trim() || null,
        city: editForm.city?.trim() || null,
        case_type: editForm.case_type?.trim() || null,
        priority: editForm.priority?.trim(),
        case_status: editForm.case_status?.trim(),
        confidentiality_level: editForm.confidentiality_level?.trim(),
        short_summary: editForm.short_summary?.trim() || null
      });
      setEditing(null);
      setEditForm({});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Case update failed");
    }
  }

  function dropOn(targetId: string) {
    if (!draggedId) return;
    setCases((items) => moveById(items, draggedId, targetId));
    setDraggedId(null);
  }

  return (
    <section className="stack">
      <form className="inline-form" onSubmit={submit}>
        <input placeholder="FIR/CR number" value={caseNumber} onChange={(event) => setCaseNumber(event.target.value)} />
        <input placeholder="Case title" value={caseTitle} onChange={(event) => setCaseTitle(event.target.value)} />
        <button className="primary">Create Case</button>
      </form>
      {editing && (
        <form className="edit-panel" onSubmit={saveEdit}>
          <h2>Edit Case</h2>
          <div className="edit-grid">
            <input placeholder="FIR/CR number" value={editForm.case_number ?? ""} onChange={(event) => setEditForm({ ...editForm, case_number: event.target.value })} />
            <input placeholder="Case title" value={editForm.case_title ?? ""} onChange={(event) => setEditForm({ ...editForm, case_title: event.target.value })} />
            <input placeholder="Police station" value={editForm.police_station ?? ""} onChange={(event) => setEditForm({ ...editForm, police_station: event.target.value })} />
            <input placeholder="District" value={editForm.district ?? ""} onChange={(event) => setEditForm({ ...editForm, district: event.target.value })} />
            <input placeholder="City" value={editForm.city ?? ""} onChange={(event) => setEditForm({ ...editForm, city: event.target.value })} />
            <input placeholder="Case type" value={editForm.case_type ?? ""} onChange={(event) => setEditForm({ ...editForm, case_type: event.target.value })} />
            <input placeholder="Status" value={editForm.case_status ?? ""} onChange={(event) => setEditForm({ ...editForm, case_status: event.target.value })} />
            <input placeholder="Priority" value={editForm.priority ?? ""} onChange={(event) => setEditForm({ ...editForm, priority: event.target.value })} />
            <input placeholder="Confidentiality" value={editForm.confidentiality_level ?? ""} onChange={(event) => setEditForm({ ...editForm, confidentiality_level: event.target.value })} />
            <input placeholder="Short summary" value={editForm.short_summary ?? ""} onChange={(event) => setEditForm({ ...editForm, short_summary: event.target.value })} />
          </div>
          <div className="form-actions">
            <button className="primary">Save Changes</button>
            <button className="secondary-button" type="button" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}
      {error && <div className="error">{error}</div>}
      <div className="records">
        {cases.map((item) => (
          <article
            className="record draggable-record"
            draggable
            key={item.id}
            onDragStart={() => setDraggedId(item.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => dropOn(item.id)}
          >
            <div>
              <span className="drag-handle">Drag to reorder</span>
              <strong>{item.case_number}</strong>
              <h2>{item.case_title}</h2>
              <p>{item.short_summary ?? "No summary recorded."}</p>
            </div>
            <div className="badges">
              <span className="badge">{item.case_status}</span>
              <span className="badge">{item.priority}</span>
              <span className="badge">{item.confidentiality_level}</span>
              <button className="secondary-button" type="button" onClick={() => startEdit(item)}>
                Edit
              </button>
              <button className="danger-button" type="button" onClick={() => removeCase(item)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
