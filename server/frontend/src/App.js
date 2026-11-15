import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { request } from "./api";
import Header from "./components/Header/Header";
import Login from "./components/Login/Login";
import Register from "./components/Register/Register";
import Dealers from "./components/Dealers/Dealers";
import Dealer from "./components/Dealers/Dealer";
import PostReview from "./components/Dealers/PostReview";
import "./App.css";

function RequireSession({ session, children }) {
  const { pathname } = useLocation();
  if (session.loading) return <p role="status">Checking your session…</p>;
  if (!session.authenticated) {
    return <Navigate replace to="/login" state={{ returnTo: pathname }} />;
  }
  return children;
}

export default function App() {
  const [session, setSession] = useState({ loading: true, authenticated: false });
  const [sessionError, setSessionError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    request("/session", { signal: controller.signal })
      .then((session) => {
        if (!controller.signal.aborted) setSession(session);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSession({ authenticated: false });
          setSessionError("The service is temporarily unavailable. Refresh to try again.");
        }
      });
    return () => controller.abort();
  }, []);

  async function updateSession() {
    const activeSession = await request("/session");
    setSession(activeSession);
    setSessionError("");
    return activeSession;
  }

  async function logout() {
    try {
      await request("/logout", { data: {} });
      setSession({ authenticated: false });
      navigate("/dealers", { replace: true });
    } catch (error) {
      setSessionError(error.message);
    }
  }

  return (
    <>
      <a className="skip-link" href="#content">Skip to content</a>
      <Header session={session} onLogout={logout} />
      <main className="page" id="content">
        {sessionError && <p className="notice error" role="alert">{sessionError}</p>}
        <Routes>
          <Route path="/login" element={<Login onAuthenticated={updateSession} />} />
          <Route path="/register" element={<Register onAuthenticated={updateSession} />} />
          <Route path="/dealers" element={<Dealers session={session} />} />
          <Route path="/dealer/:id" element={<Dealer session={session} />} />
          <Route
            path="/postreview/:id"
            element={
              <RequireSession session={session}>
                <PostReview />
              </RequireSession>
            }
          />
          <Route path="*" element={<Navigate replace to="/dealers" />} />
        </Routes>
      </main>
    </>
  );
}
