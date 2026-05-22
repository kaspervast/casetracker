import { FormEvent, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { login } from "../api/casegraph";

type Props = {
  onLogin: (token: string) => Promise<void>;
};

export function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState("superadmin");
  const [password, setPassword] = useState("ChangeMe#2026");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await login(username, password);
      await onLogin(response.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <ShieldCheck size={42} />
        <h1>CaseGraph LE</h1>
        <p className="notice">
          This system is intended only for authorized official use. All access,
          exports, and evidence downloads are logged.
        </p>
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="primary" disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
