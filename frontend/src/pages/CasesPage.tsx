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

  async function editCase(item: CaseRecord) {
    const caseNumber = window.prompt("FIR/CR number", item.case_number);
    if (caseNumber === null) return;
    const caseTitle = window.prompt("Case title", item.case_title);
    if (caseTitle === null) return;
    const priority = window.prompt("Priority", item.priority);
    if (priority === null) return;
    const caseStatus = window.prompt("Status", item.case_status);
    if (caseStatus === null) return;
    setError("");
    try {
      await updateCase(item.id, {
        case_number: caseNumber.trim(),
        case_title: caseTitle.trim(),
        priority: priority.trim(),
        case_status: caseStatus.trim()
      });
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
              <button className="secondary-button" type="button" onClick={() => editCase(item)}>
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
