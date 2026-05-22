import { FormEvent, useEffect, useState } from "react";
import { createCase, deleteCase, listCases, updateCase } from "../api/casegraph";
import type { CaseRecord } from "../types/api";
import { moveById } from "../utils/reorder";

const legalActOptions = ["BNS", "BNSS", "IT Act", "IPC", "CrPC", "Evidence Act", "PMLA", "NDPS Act"];
const pendingLimitOptions = [30, 45, 60, 90];

function pendingDays(item: CaseRecord) {
  if (!item.date_of_registration) return null;
  const filedAt = new Date(`${item.date_of_registration}T00:00:00`);
  if (Number.isNaN(filedAt.getTime())) return null;
  const elapsed = Date.now() - filedAt.getTime();
  return Math.max(0, Math.floor(elapsed / 86_400_000));
}

function pendingClassName(days: number | null, limit: number) {
  if (days === null) return "badge";
  if (days >= limit) return "badge danger";
  if (days >= Math.min(60, limit * 0.75)) return "badge warning";
  if (days >= Math.min(30, limit * 0.5)) return "badge notice";
  return "badge success";
}

function pendingLabel(item: CaseRecord) {
  const days = pendingDays(item);
  if (days === null) return "FIR date pending";
  return `${days} days pending / ${item.pending_limit_days} day limit`;
}

export function CasesPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [caseNumber, setCaseNumber] = useState("");
  const [caseTitle, setCaseTitle] = useState("");
  const [firFiledDate, setFirFiledDate] = useState("");
  const [primaryLegalAct, setPrimaryLegalAct] = useState("BNS");
  const [firSections, setFirSections] = useState("");
  const [pendingLimitDays, setPendingLimitDays] = useState("30");
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
        primary_legal_act: primaryLegalAct || null,
        sections_acts_applied: firSections.trim() || null,
        date_of_registration: firFiledDate || null,
        pending_limit_days: Number(pendingLimitDays),
        case_status: "Draft",
        priority: "Medium",
        confidentiality_level: "Normal"
      });
      setCaseNumber("");
      setCaseTitle("");
      setFirFiledDate("");
      setPrimaryLegalAct("BNS");
      setFirSections("");
      setPendingLimitDays("30");
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
      primary_legal_act: item.primary_legal_act ?? "",
      sections_acts_applied: item.sections_acts_applied ?? "",
      date_of_registration: item.date_of_registration ?? "",
      pending_limit_days: String(item.pending_limit_days ?? 30),
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
        primary_legal_act: editForm.primary_legal_act?.trim() || null,
        sections_acts_applied: editForm.sections_acts_applied?.trim() || null,
        date_of_registration: editForm.date_of_registration || null,
        pending_limit_days: Number(editForm.pending_limit_days || 30),
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
        <input aria-label="FIR filed date" type="date" value={firFiledDate} onChange={(event) => setFirFiledDate(event.target.value)} />
        <select value={primaryLegalAct} onChange={(event) => setPrimaryLegalAct(event.target.value)}>
          {legalActOptions.map((act) => (
            <option key={act} value={act}>{act}</option>
          ))}
        </select>
        <input placeholder="FIR sections" value={firSections} onChange={(event) => setFirSections(event.target.value)} />
        <select value={pendingLimitDays} onChange={(event) => setPendingLimitDays(event.target.value)}>
          {pendingLimitOptions.map((days) => (
            <option key={days} value={days}>{days} days pending</option>
          ))}
        </select>
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
            <select value={editForm.primary_legal_act ?? ""} onChange={(event) => setEditForm({ ...editForm, primary_legal_act: event.target.value })}>
              <option value="">Select act</option>
              {legalActOptions.map((act) => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
            <input placeholder="FIR sections" value={editForm.sections_acts_applied ?? ""} onChange={(event) => setEditForm({ ...editForm, sections_acts_applied: event.target.value })} />
            <input aria-label="FIR filed date" type="date" value={editForm.date_of_registration ?? ""} onChange={(event) => setEditForm({ ...editForm, date_of_registration: event.target.value })} />
            <select value={editForm.pending_limit_days ?? "30"} onChange={(event) => setEditForm({ ...editForm, pending_limit_days: event.target.value })}>
              {pendingLimitOptions.map((days) => (
                <option key={days} value={days}>{days} days pending</option>
              ))}
            </select>
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
              <p className="case-meta">
                FIR filed: {item.date_of_registration ?? "Not recorded"}
                {item.primary_legal_act && <> | Act: {item.primary_legal_act}</>}
                {item.sections_acts_applied && <> | Sections: {item.sections_acts_applied}</>}
              </p>
            </div>
            <div className="badges">
              <span className={pendingClassName(pendingDays(item), item.pending_limit_days)}>{pendingLabel(item)}</span>
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
