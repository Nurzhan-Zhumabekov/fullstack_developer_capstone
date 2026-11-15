import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

export default function Header({ session, onLogout }) {
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="site-header">
      <nav className="nav-shell" aria-label="Main navigation">
        <a className="brand" href="/">Dealerships</a>
        <div className="primary-links">
          <a href="/">Home</a>
          <a href="/about">About Us</a>
          <a href="/contact">Contact Us</a>
          <NavLink to="/dealers">Dealers</NavLink>
        </div>
        <div className="account-links">
          {session.loading ? null : session.authenticated ? (
            <>
              <span className="username">{session.userName}</span>
              <button type="button" className="btn subtle" disabled={loggingOut} onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link className="btn subtle" to="/register">Register</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
