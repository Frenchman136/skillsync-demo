import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <section className="wrap narrow center pad">
      <h1>Page not found</h1>
      <p className="sub">That page does not exist.</p>
      <p>
        <Link className="btn" to="/">
          Go home
        </Link>
      </p>
    </section>
  );
}
