import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { request } from "../../api";

export default function Login({ onAuthenticated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  async function login(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await request("/login", {
        data: { userName: form.get("userName").trim(), password: form.get("password") },
      });
      await onAuthenticated();
      navigate(location.state?.returnTo || "/dealers", { replace: true });
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="form-card auth-card">
      <h1>Log in</h1>
      <p className="muted">Sign in to write dealer reviews.</p>
      <form onSubmit={login}>
        <label>
          Username
          <input name="userName" autoComplete="username" required maxLength={150} />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {error && <p className="notice error" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Login"}
        </button>
      </form>
      <p className="form-footer">New here? <Link to="/register">Register for an account</Link>.</p>
    </section>
  );
}
