import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { tradeName } from "../../lib/data.js";
import { fmt, refNo, WORKER_STATUS } from "../../lib/format.js";
import Status from "../Status.jsx";

export default function WorkersTab({ onChange }) {
  const [workers, setWorkers] = useState(null);
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(0);
  const [checking, setChecking] = useState(null); // id of the worker whose ID-check box is showing
  const [idChecked, setIdChecked] = useState(false);

  const load = useCallback(
    () =>
      api
        .get("/workers")
        .then(setWorkers)
        .catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(w, status, extra = {}) {
    setBusy(w.id);
    setError("");
    try {
      await api.patch(`/workers/${w.id}`, { status, ...extra });
      setChecking(null);
      setIdChecked(false);
      await load();
      onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(0);
    }
  }
  async function remove(w) {
    if (!window.confirm(`Delete ${w.name}'s application?`)) return;
    setBusy(w.id);
    setError("");
    try {
      await api.del(`/workers/${w.id}`);
      await load();
      onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(0);
    }
  }

  if (!workers)
    return (
      <div className="box">
        <p className="empty">{error || "Loading…"}</p>
      </div>
    );
  const shown =
    filter === "All" ? workers : workers.filter((w) => w.status === filter);

  return (
    <>
      <div className="tabs" aria-label="Filter workers">
        {["All", ...WORKER_STATUS].map((s) => (
          <button
            key={s}
            className={filter === s ? "on" : ""}
            onClick={() => setFilter(s)}
          >
            {s} (
            {s === "All"
              ? workers.length
              : workers.filter((w) => w.status === s).length}
            )
          </button>
        ))}
      </div>
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
      <div className="box list">
        {!shown.length && <p className="empty">No workers here.</p>}
        {shown.map((w) => (
          <article key={w.id} className="item">
            <div className="grow">
              <b>{w.name}</b> <Status value={w.status} />{" "}
              <span className="small">· {fmt(w.createdAt)}</span>
              <p>
                {tradeName(w.trade)} ·{" "}
                {w.kind === "skilled" ? "Skilled" : "General"} · age {w.age} ·{" "}
                {w.county}
              </p>
              <p className="small">
                {w.phone} · ID {w.nationalId}
              </p>
              {w.experience && <p className="small">“{w.experience}”</p>}
              {w.placement && (
                <p className="small">
                  Placed on request {refNo(w.placement.requestId)} as{" "}
                  {tradeName(w.placement.trade).toLowerCase()}.
                </p>
              )}
              {checking === w.id && (
                <label className="check idcheck">
                  <input
                    type="checkbox"
                    checked={idChecked}
                    onChange={(e) => setIdChecked(e.target.checked)}
                  />
                  <span>
                    I checked national ID {w.nationalId} against the person's
                    documents.
                  </span>
                </label>
              )}
            </div>
            <div className="actions">
              {w.status === "Pending" && checking !== w.id && (
                <button
                  className="btn sm"
                  onClick={() => {
                    setChecking(w.id);
                    setIdChecked(false);
                  }}
                >
                  Verify…
                </button>
              )}
              {w.status === "Pending" && checking === w.id && (
                <>
                  <button
                    className="btn sm"
                    disabled={!idChecked || busy === w.id}
                    onClick={() =>
                      setStatus(w, "Verified", { idChecked: true })
                    }
                  >
                    Confirm verified
                  </button>
                  <button className="linkbtn" onClick={() => setChecking(null)}>
                    Cancel
                  </button>
                </>
              )}
              {w.status === "Verified" && (
                <button
                  className="btn sm"
                  disabled={busy === w.id}
                  onClick={() => setStatus(w, "Approved")}
                >
                  Approve
                </button>
              )}
              {w.status === "Rejected" && (
                <button
                  className="btn line sm"
                  disabled={busy === w.id}
                  onClick={() => setStatus(w, "Pending")}
                >
                  Reopen
                </button>
              )}
              {["Pending", "Verified", "Approved"].includes(w.status) &&
                !w.placement && (
                  <button
                    className="linkbtn"
                    disabled={busy === w.id}
                    onClick={() => setStatus(w, "Rejected")}
                  >
                    Reject
                  </button>
                )}
              {!w.placement && (
                <button
                  className="linkbtn"
                  disabled={busy === w.id}
                  onClick={() => remove(w)}
                >
                  Delete
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
