import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import RequestsTab from "../components/admin/RequestsTab.jsx";
import WorkersTab from "../components/admin/WorkersTab.jsx";
import ContractorsTab from "../components/admin/ContractorsTab.jsx";

export default function Admin() {
  const { logout } = useAuth();
  const [tab, setTab] = useState("requests");
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  const refreshStats = useCallback(
    () =>
      api
        .get("/stats")
        .then(setStats)
        .catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const tabs = [
    ["requests", "Requests"],
    ["workers", "Workers"],
    ["contractors", "Contractors"],
  ];
  return (
    <section className="wrap pad">
      <div className="headrow">
        <div>
          <h1>Admin</h1>
          <p className="sub">
            Review requests, check workers and place them on jobs.
          </p>
        </div>
        <div className="row">
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
      <div className="kpis">
        <div className="kpi">
          <span>New requests</span>
          <b>{stats?.newRequests ?? "–"}</b>
        </div>
        <div className="kpi">
          <span>To verify</span>
          <b>{stats?.toVerify ?? "–"}</b>
        </div>
        <div className="kpi">
          <span>To approve</span>
          <b>{stats?.toApprove ?? "–"}</b>
        </div>
        <div className="kpi">
          <span>Approved workers</span>
          <b>{stats?.approved ?? "–"}</b>
        </div>
        <div className="kpi">
          <span>Placements</span>
          <b>{stats?.placements ?? "–"}</b>
        </div>
      </div>
      <div className="tabs" role="tablist">
        {tabs.map(([k, l]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            className={tab === k ? "on" : ""}
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
      </div>
      {tab === "requests" && <RequestsTab onChange={refreshStats} />}
      {tab === "workers" && <WorkersTab onChange={refreshStats} />}
      {tab === "contractors" && <ContractorsTab onChange={refreshStats} />}
    </section>
  );
}
