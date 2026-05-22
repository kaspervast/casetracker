import { FormEvent, useEffect, useState } from "react";
import { createMobileNumber, deleteMobileNumber, listMobileNumbers, updateMobileNumber } from "../api/casegraph";
import type { MobileNumberRecord } from "../types/api";
import { moveById } from "../utils/reorder";

export function MobileNumbersPage() {
  const [mobiles, setMobiles] = useState<MobileNumberRecord[]>([]);
  const [mobileNumber, setMobileNumber] = useState("");
  const [subscriberName, setSubscriberName] = useState("");
  const [provider, setProvider] = useState("");
  const [error, setError] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  async function load() {
    setMobiles(await listMobileNumbers());
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await createMobileNumber({
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
      await load();
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
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mobile number delete failed");
    }
  }

  async function editMobile(mobile: MobileNumberRecord) {
    const mobileNumber = window.prompt("Mobile number", mobile.mobile_number);
    if (mobileNumber === null) return;
    const subscriber = window.prompt("Subscriber name", mobile.subscriber_name ?? "");
    if (subscriber === null) return;
    const provider = window.prompt("SIM provider", mobile.sim_provider ?? "");
    if (provider === null) return;
    const status = window.prompt("Current status", mobile.current_status);
    if (status === null) return;
    setError("");
    try {
      await updateMobileNumber(mobile.id, {
        mobile_number: mobileNumber.trim(),
        subscriber_name: subscriber.trim() || null,
        sim_provider: provider.trim() || null,
        current_status: status.trim()
      });
      await load();
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
      <form className="inline-form" onSubmit={submit}>
        <input placeholder="Mobile number" value={mobileNumber} onChange={(event) => setMobileNumber(event.target.value)} />
        <input placeholder="Subscriber name" value={subscriberName} onChange={(event) => setSubscriberName(event.target.value)} />
        <input placeholder="SIM provider" value={provider} onChange={(event) => setProvider(event.target.value)} />
        <button className="primary">Create Mobile Number</button>
      </form>
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
              <button className="secondary-button" type="button" onClick={() => editMobile(mobile)}>
                Edit
              </button>
              <button className="danger-button" type="button" onClick={() => removeMobile(mobile)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
