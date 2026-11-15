import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { request } from "../../api";

export default function Register({ onAuthenticated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function register(event) {
    event.preventDefault();
    setError("");
    const form = Object.fromEntries(new FormData(event.currentTarget));
    if (form.password !== form.confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await request("/register", {
        data: {
          userName: form.userName.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          password: form.password,
        },
      });
      const session = await onAuthenticated();
      navigate(session.authenticated ? "/dealers" : "/login", { replace: true });
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="form-card auth-card register-card">
      <h1>Register</h1>
      <p className="muted">Create an account to share your dealership experience.</p>
      <form onSubmit={register}>
        <div className="fields">
          <label>First name<input name="firstName" autoComplete="given-name" required maxLength={150} /></label>
          <label>Last name<input name="lastName" autoComplete="family-name" required maxLength={150} /></label>
        </div>
        <label>Username<input name="userName" autoComplete="username" required maxLength={150} /></label>
        <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
        <div className="fields">
          <label>
            Password
            <input name="password" type="password" autoComplete="new-password" required minLength={8} />
          </label>
          <label>
            Confirm password
            <input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} />
          </label>
        </div>
        {error && <p className="notice error" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Creating account…" : "Register"}
        </button>
      </form>
      <p className="form-footer">Already have an account? <Link to="/login">Log in</Link>.</p>
    </section>
  );
}
