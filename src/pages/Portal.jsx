import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { tradeName } from "../lib/data.js";
import { fmt, fmtDate, refNo, filledText } from "../lib/format.js";
import Status from "../components/Status.jsx";

// The contractor's own view. The server only returns this contractor's requests,
// and only counts of placed workers (no worker names or phone numbers).
export default function Portal() {
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/requests")
      .then(setRequests)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <section className="wrap narrow pad">
      <div className="headrow">
        <div>
          <h1>My requests</h1>
          <p className="sub">
            {user.company || user.name} · {user.email}
          </p>
        </div>
        <div className="row">
          <Link className="btn sm" to="/request">
            New request
          </Link>
          <button className="btn line sm" onClick={logout}>
            Sign out
          </button>
        </div>
      </div>
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
      <div className="box list portal">
        {!requests && !error && <p className="empty">Loading…</p>}
        {requests && !requests.length && (
          <p className="empty">No requests yet. Send one with “New request”.</p>
        )}
        {requests?.map((r) => (
          <article key={r.id} className="item">
            <div className="grow">
              <b>{refNo(r.id)}</b> <Status value={r.status} />{" "}
              <span className="small">· sent {fmt(r.createdAt)}</span>
              <p className="small">
                {r.site} · starts {fmtDate(r.start)} · {r.length}
              </p>
              <ul className="progress">
                {r.lines.map((l) => (
                  <li key={l.id}>
                    <span>{tradeName(l.trade)}</span>
                    <span
                      className="bar"
                      role="img"
                      aria-label={`${l.filled} of ${l.quantity} placed`}
                    >
                      <i
                        style={{ width: `${(l.filled / l.quantity) * 100}%` }}
                      />
                    </span>
                    <span className="small">
                      {l.filled} of {l.quantity}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="small">{filledText(r.lines)}</p>
              {r.notes && <p className="small">“{r.notes}”</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
