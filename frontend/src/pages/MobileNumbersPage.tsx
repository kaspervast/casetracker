import { FormEvent, useEffect, useState } from "react";
import {
  createMobileNumber,
  createRelationship,
  deleteMobileNumber,
  listCases,
  listMobileNumbers,
  listPersons,
  listRelationships,
  updateMobileNumber
} from "../api/casegraph";
import type { CaseRecord, MobileNumberRecord, PersonRecord, RelationshipRecord } from "../types/api";
import { moveById } from "../utils/reorder";

export function MobileNumbersPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [persons, setPersons] = useState<PersonRecord[]>([]);
  const [relationships, setRelationships] = useState<RelationshipRecord[]>([]);
  const [mobiles, setMobiles] = useState<MobileNumberRecord[]>([]);
  const [mobileNumber, setMobileNumber] = useState("");
  const [subscriberName, setSubscriberName] = useState("");
  const [provider, setProvider] = useState("");
  const [linkedPersonId, setLinkedPersonId] = useState("");
  const [cdrReported, setCdrReported] = useState("false");
  const [cdrReportedDate, setCdrReportedDate] = useState("");
  const [cdrAvailable, setCdrAvailable] = useState("false");
  const [briefDetails, setBriefDetails] = useState("");
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
      setPersons([]);
      setRelationships([]);
      setMobiles([]);
      return;
    }
    const [nextMobiles, nextPersons, nextRelationships] = await Promise.all([
      listMobileNumbers(caseId),
      listPersons(caseId),
      listRelationships(caseId)
    ]);
    setMobiles(nextMobiles);
    setPersons(nextPersons);
    setRelationships(nextRelationships);
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
      const created = await createMobileNumber({
        case_id: selectedCaseId,
        mobile_number: mobileNumber,
        country_code: "+91",
        subscriber_name: subscriberName || null,
        sim_provider: provider || null,
        current_status: "Unknown",
        source: "Manual entry",
        cdr_reported: cdrReported === "true",
        cdr_reported_date: cdrReportedDate || null,
        cdr_available: cdrAvailable === "true",
        brief_details: briefDetails.trim() || null
      });
      if (linkedPersonId) {
        await createRelationship({
          source_entity_type: "person",
          source_entity_id: linkedPersonId,
          target_entity_type: "mobile_number",
          target_entity_id: created.id,
          relationship_type: "HAS_MOBILE",
          confidence: "Confirmed",
          source_of_relationship: "Manual",
          case_id: selectedCaseId
        });
      }
      setMobileNumber("");
      setSubscriberName("");
      setProvider("");
      setLinkedPersonId("");
      setCdrReported("false");
      setCdrReportedDate("");
      setCdrAvailable("false");
      setBriefDetails("");
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
      cdr_reported: String(mobile.cdr_reported),
      cdr_reported_date: mobile.cdr_reported_date ?? "",
      cdr_available: String(mobile.cdr_available),
      brief_details: mobile.brief_details ?? "",
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
        cdr_reported: editForm.cdr_reported === "true",
        cdr_reported_date: editForm.cdr_reported_date || null,
        cdr_available: editForm.cdr_available === "true",
        brief_details: editForm.brief_details?.trim() || null,
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

  function linkedPerson(mobileId: string) {
    const relationship = relationships.find(
      (item) =>
        item.relationship_type === "HAS_MOBILE" &&
        item.target_entity_type === "mobile_number" &&
        item.target_entity_id === mobileId &&
        item.source_entity_type === "person"
    );
    if (!relationship) return null;
    return persons.find((item) => item.id === relationship.source_entity_id) ?? null;
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
        <select
          value={linkedPersonId}
          onChange={(event) => {
            const nextPersonId = event.target.value;
            setLinkedPersonId(nextPersonId);
            const person = persons.find((item) => item.id === nextPersonId);
            if (person && !subscriberName) {
              setSubscriberName(person.full_name);
            }
          }}
        >
          <option value="">Link to person / accused</option>
          {persons.map((person) => (
            <option key={person.id} value={person.id}>
              {person.full_name}{person.case_role ? ` (${person.case_role})` : ""}
            </option>
          ))}
        </select>
        <input placeholder="Subscriber name" value={subscriberName} onChange={(event) => setSubscriberName(event.target.value)} />
        <input placeholder="SIM provider" value={provider} onChange={(event) => setProvider(event.target.value)} />
        <select value={cdrReported} onChange={(event) => setCdrReported(event.target.value)}>
          <option value="false">CDR not reported</option>
          <option value="true">CDR reported</option>
        </select>
        <input type="date" value={cdrReportedDate} onChange={(event) => setCdrReportedDate(event.target.value)} />
        <select value={cdrAvailable} onChange={(event) => setCdrAvailable(event.target.value)}>
          <option value="false">CDR unavailable</option>
          <option value="true">CDR available</option>
        </select>
        <input placeholder="Brief details about number" value={briefDetails} onChange={(event) => setBriefDetails(event.target.value)} />
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
            <select value={editForm.cdr_reported ?? "false"} onChange={(event) => setEditForm({ ...editForm, cdr_reported: event.target.value })}>
              <option value="false">CDR not reported</option>
              <option value="true">CDR reported</option>
            </select>
            <input type="date" value={editForm.cdr_reported_date ?? ""} onChange={(event) => setEditForm({ ...editForm, cdr_reported_date: event.target.value })} />
            <select value={editForm.cdr_available ?? "false"} onChange={(event) => setEditForm({ ...editForm, cdr_available: event.target.value })}>
              <option value="false">CDR unavailable</option>
              <option value="true">CDR available</option>
            </select>
            <input placeholder="Brief details about number" value={editForm.brief_details ?? ""} onChange={(event) => setEditForm({ ...editForm, brief_details: event.target.value })} />
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
        {mobiles.map((mobile) => {
          const person = linkedPerson(mobile.id);
          return (
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
              {person && <p>Linked person: {person.full_name}{person.case_role ? ` (${person.case_role})` : ""}</p>}
              <p>
                CDR reported: {mobile.cdr_reported ? "Yes" : "No"}
                {mobile.cdr_reported_date ? ` on ${mobile.cdr_reported_date}` : ""}
                {" | "}
                CDR available: {mobile.cdr_available ? "Yes" : "No"}
              </p>
              {mobile.brief_details && <p>{mobile.brief_details}</p>}
            </div>
            <div className="badges">
              <span className="badge">{mobile.current_status}</span>
              <span className="badge">{mobile.verification_status}</span>
              <span className="badge">{mobile.cdr_available ? "CDR available" : "CDR pending"}</span>
              {person?.case_role && <span className="badge">{person.case_role}</span>}
              <button className="secondary-button" type="button" onClick={() => startEdit(mobile)}>
                Edit
              </button>
              <button className="danger-button" type="button" onClick={() => removeMobile(mobile)}>
                Delete
              </button>
            </div>
          </article>
          );
        })}
        {!mobiles.length && <div className="empty">No mobile numbers linked to the selected case.</div>}
      </div>
    </section>
  );
}
