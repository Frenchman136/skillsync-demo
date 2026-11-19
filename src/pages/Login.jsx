import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import Field from "../components/Field.jsx";

export default function Login() {
  const { user, loading, login } = useAuth();
  const { state } = useLocation();
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading)
    return (
      <section className="wrap narrow pad">
        <p className="sub">Checking your sign-in…</p>
      </section>
    );
  if (user)
    return (
      <Navigate
        to={state?.from || (user.role === "admin" ? "/admin" : "/portal")}
        replace
      />
    );

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      await login(f.email.trim(), f.password);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="wrap narrow pad">
      <form className="box form" onSubmit={submit} noValidate>
        <h1>Sign in</h1>
        <p className="sub">
          For Skill Sync staff and contractors. Contractor accounts are created
          by our admin.
        </p>
        <Field id="email" label="Email" error={err}>
          <input
            id="email"
            type="email"
            autoComplete="username"
            autoFocus
            value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value })}
          />
        </Field>
        <Field id="password" label="Password">
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
          />
        </Field>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </section>
  );
}
