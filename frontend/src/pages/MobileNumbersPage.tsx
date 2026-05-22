import { FormEvent, useEffect, useState } from "react";
import { createMobileNumber, deleteMobileNumber, listCases, listMobileNumbers, updateMobileNumber } from "../api/casegraph";
import type { CaseRecord, MobileNumberRecord } from "../types/api";
import { moveById } from "../utils/reorder";

export function MobileNumbersPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [mobiles, setMobiles] = useState<MobileNumberRecord[]>([]);
  const [mobileNumber, setMobileNumber] = useState("");
  const [subscriberName, setSubscriberName] = useState("");
  const [provider, setProvider] = useState("");
  const [error, setError] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<MobileNumberRecord | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  async function loadCasesContext() {
    const items = await listCases();
    setCases(items);
    setSelectedCaseId((current) => current || items[0]?.id || "");
  }

  async function load(caseId: string) {
    if (!caseId) {
      setMobiles([]);
      return;
    }
    setMobiles(await listMobileNumbers(caseId));
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
      setError("Select a case before creating a mobile number");
      return;
    }
    setError("");
    try {
      await createMobileNumber({
        case_id: selectedCaseId,
        mobile_number: mobileNumber,
        country_code: "+91",
        subscriber_name: subscriberName || null,
        sim_provider: provider || null,
        current_status: "Unknown",
        source: "Manual entry"
      });
      setMobileNumber("");
      setSubscriberName("");
      setProvider("");
      await load(selectedCaseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mobile number creation failed");
    }
  }

  async function removeMobile(mobile: MobileNumberRecord) {
    const reason = window.prompt(`Reason for deleting mobile number ${mobile.mobile_number}`);
    if (!reason?.trim()) return;
    setError("");
    try {
      await deleteMobileNumber(mobile.id, reason.trim());
      await load(selectedCaseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mobile number delete failed");
    }
  }

  function startEdit(mobile: MobileNumberRecord) {
    setEditing(mobile);
    setEditForm({
      mobile_number: mobile.mobile_number,
      country_code: mobile.country_code,
      subscriber_name: mobile.subscriber_name ?? "",
      sim_provider: mobile.sim_provider ?? "",
      current_status: mobile.current_status,
      source: mobile.source ?? "",
      verification_status: mobile.verification_status,
      notes: mobile.notes ?? ""
    });
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setError("");
    try {
      await updateMobileNumber(editing.id, {
        mobile_number: editForm.mobile_number?.trim(),
        country_code: editForm.country_code?.trim() || "+91",
        subscriber_name: editForm.subscriber_name?.trim() || null,
        sim_provider: editForm.sim_provider?.trim() || null,
        current_status: editForm.current_status?.trim() || "Unknown",
        source: editForm.source?.trim() || null,
        verification_status: editForm.verification_status?.trim() || "Unverified",
        notes: editForm.notes?.trim() || null
      });
      setEditing(null);
      setEditForm({});
      await load(selectedCaseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mobile number update failed");
    }
  }

  function dropOn(targetId: string) {
    if (!draggedId) return;
    setMobiles((items) => moveById(items, draggedId, targetId));
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
          Mobile numbers listed and created here are linked to the selected case.
        </p>
      </div>
      <form className="inline-form" onSubmit={submit}>
        <input placeholder="Mobile number" value={mobileNumber} onChange={(event) => setMobileNumber(event.target.value)} />
        <input placeholder="Subscriber name" value={subscriberName} onChange={(event) => setSubscriberName(event.target.value)} />
        <input placeholder="SIM provider" value={provider} onChange={(event) => setProvider(event.target.value)} />
        <button className="primary" disabled={!selectedCaseId}>Create Mobile Number</button>
      </form>
      {editing && (
        <form className="edit-panel" onSubmit={saveEdit}>
          <h2>Edit Mobile Number</h2>
          <div className="edit-grid">
            <input placeholder="Mobile number" value={editForm.mobile_number ?? ""} onChange={(event) => setEditForm({ ...editForm, mobile_number: event.target.value })} />
            <input placeholder="Country code" value={editForm.country_code ?? ""} onChange={(event) => setEditForm({ ...editForm, country_code: event.target.value })} />
            <input placeholder="Subscriber name" value={editForm.subscriber_name ?? ""} onChange={(event) => setEditForm({ ...editForm, subscriber_name: event.target.value })} />
            <input placeholder="SIM provider" value={editForm.sim_provider ?? ""} onChange={(event) => setEditForm({ ...editForm, sim_provider: event.target.value })} />
            <input placeholder="Current status" value={editForm.current_status ?? ""} onChange={(event) => setEditForm({ ...editForm, current_status: event.target.value })} />
            <input placeholder="Source" value={editForm.source ?? ""} onChange={(event) => setEditForm({ ...editForm, source: event.target.value })} />
            <input placeholder="Verification status" value={editForm.verification_status ?? ""} onChange={(event) => setEditForm({ ...editForm, verification_status: event.target.value })} />
            <input placeholder="Notes" value={editForm.notes ?? ""} onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })} />
          </div>
          <div className="form-actions">
            <button className="primary">Save Changes</button>
            <button className="secondary-button" type="button" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}
      {error && <div className="error">{error}</div>}
      <div className="records">
        {mobiles.map((mobile) => (
          <article
            className="record draggable-record"
            draggable
            key={mobile.id}
            onDragStart={() => setDraggedId(mobile.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => dropOn(mobile.id)}
          >
            <div>
              <span className="drag-handle">Drag to reorder</span>
              <strong>{mobile.country_code} {mobile.mobile_number}</strong>
              <h2>{mobile.subscriber_name ?? "Unknown subscriber"}</h2>
              <p>{mobile.sim_provider ?? "Provider not recorded"}</p>
            </div>
            <div className="badges">
              <span className="badge">{mobile.current_status}</span>
              <span className="badge">{mobile.verification_status}</span>
              <button className="secondary-button" type="button" onClick={() => startEdit(mobile)}>
                Edit
              </button>
              <button className="danger-button" type="button" onClick={() => removeMobile(mobile)}>
                Delete
              </button>
            </div>
          </article>
        ))}
        {!mobiles.length && <div className="empty">No mobile numbers linked to the selected case.</div>}
      </div>
    </section>
  );
}
