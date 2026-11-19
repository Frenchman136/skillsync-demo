import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";

/** Shows its children only to a signed-in user with the given role. The server checks again on every call. */
export default function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  if (loading)
    return (
      <section className="wrap narrow pad">
        <p className="sub">Checking your sign-in…</p>
      </section>
    );
  if (!user) return <Navigate to="/login" state={{ from: pathname }} replace />;
  if (user.role !== role)
    return (
      <Navigate to={user.role === "admin" ? "/admin" : "/portal"} replace />
    );
  return children;
}
