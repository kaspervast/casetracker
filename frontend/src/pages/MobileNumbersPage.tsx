import { FormEvent, useEffect, useState } from "react";
import { createMobileNumber, listMobileNumbers } from "../api/casegraph";
import type { MobileNumberRecord } from "../types/api";

export function MobileNumbersPage() {
  const [mobiles, setMobiles] = useState<MobileNumberRecord[]>([]);
  const [mobileNumber, setMobileNumber] = useState("");
  const [subscriberName, setSubscriberName] = useState("");
  const [provider, setProvider] = useState("");
  const [error, setError] = useState("");

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
          <article className="record" key={mobile.id}>
            <div>
              <strong>{mobile.country_code} {mobile.mobile_number}</strong>
              <h2>{mobile.subscriber_name ?? "Unknown subscriber"}</h2>
              <p>{mobile.sim_provider ?? "Provider not recorded"}</p>
            </div>
            <div className="badges">
              <span className="badge">{mobile.current_status}</span>
              <span className="badge">{mobile.verification_status}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
