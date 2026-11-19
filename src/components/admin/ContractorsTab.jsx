import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api.js";
import { cleanPhone } from "../../lib/checks.js";
import Field from "../Field.jsx";

const blank = { name: "", company: "", email: "", phone: "", password: "" };

export default function ContractorsTab({ onChange }) {
  const [users, setUsers] = useState(null);
  const [f, setF] = useState(blank);
  const [err, setErr] = useState({});
  const [made, setMade] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const load = useCallback(
    () =>
      api
        .get("/users")
        .then(setUsers)
        .catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

  async function create(e) {
    e.preventDefault();
    if (busy) return;
    const x = {};
    if (!f.name.trim()) x.name = "Please enter a name.";
    if (!/^\S+@\S+\.\S+$/.test(f.email))
      x.email = "Enter a valid email address.";
    if (f.password.length < 8)
      x.password = "The password must be at least 8 characters.";
    if (f.phone && !cleanPhone(f.phone))
      x.phone = "Enter a Kenyan mobile number, like 0712 345 678.";
    setErr(x);
    if (Object.keys(x).length) return;
    setBusy(true);
    setError("");
    try {
      await api.post("/users", {
        ...f,
        phone: f.phone ? cleanPhone(f.phone) : "",
      });
      setMade({ email: f.email, password: f.password });
      setF(blank);
      await load();
      onChange();
    } catch (ex) {
      if (ex instanceof ApiError && ex.fields && Object.keys(ex.fields).length)
        setErr(ex.fields);
      else setError(ex.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(u) {
    if (
      !window.confirm(
        `Delete the account for ${u.email}? Their requests are kept.`,
      )
    )
      return;
    try {
      await api.del(`/users/${u.id}`);
      await load();
      onChange();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <>
      <form className="box form" onSubmit={create} noValidate>
        <h2 className="h3">Create a contractor account</h2>
        <p className="small">
          Contractors cannot register themselves. Give them the email and
          password you set here.
        </p>
        <div className="two">
          <Field id="c-name" label="Contact name" error={err.name}>
            <input id="c-name" value={f.name} onChange={set("name")} />
          </Field>
          <Field id="c-company" label="Company (optional)" error={err.company}>
            <input id="c-company" value={f.company} onChange={set("company")} />
          </Field>
          <Field id="c-email" label="Email (their login)" error={err.email}>
            <input
              id="c-email"
              type="email"
              autoComplete="off"
              value={f.email}
              onChange={set("email")}
            />
          </Field>
          <Field id="c-phone" label="Phone (optional)" error={err.phone}>
            <input
              id="c-phone"
              type="tel"
              value={f.phone}
              onChange={set("phone")}
            />
          </Field>
          <Field
            id="c-pw"
            label="Starting password"
            error={err.password}
            hint="At least 8 characters."
          >
            <input
              id="c-pw"
              type="text"
              autoComplete="off"
              value={f.password}
              onChange={set("password")}
            />
          </Field>
        </div>
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
        {made && (
          <p className="ok" role="status">
            Account created. Login: <code>{made.email}</code> with password{" "}
            <code>{made.password}</code>
          </p>
        )}
        <div>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </div>
      </form>

      <div className="box list">
        {!users && <p className="empty">Loading…</p>}
        {users && !users.length && (
          <p className="empty">No contractor accounts yet.</p>
        )}
        {users?.map((u) => (
          <article key={u.id} className="item">
            <div className="grow">
              <b>{u.company || u.name}</b>{" "}
              <span className="small">· {u.name}</span>
              <p className="small">
                {u.email}
                {u.phone ? ` · ${u.phone}` : ""} · {u.requests} request
                {u.requests === 1 ? "" : "s"}
              </p>
            </div>
            <div className="actions">
              <button className="linkbtn" onClick={() => remove(u)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
