import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getCurrentAdminSession } from "../services/api.js";
import { clearAdminSession, getAdminToken } from "../services/adminSession.js";

export default function ProtectedAdminRoute() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let active = true;
    if (!getAdminToken()) {
      clearAdminSession(); // Limpia tokens antiguos persistentes.
      setStatus("unauthorized");
      return () => { active = false; };
    }
    getCurrentAdminSession()
      .then(() => { if (active) setStatus("authorized"); })
      .catch((error) => {
        if (!active) return;
        if (error.response?.status === 401 || error.response?.status === 403) {
          clearAdminSession();
          setStatus("unauthorized");
        } else {
          setStatus("unavailable");
        }
      });
    return () => { active = false; };
  }, []);

  if (status === "unauthorized") return <Navigate to="/admin/login" replace />;
  if (status === "checking") {
    return <main className="min-h-screen flex items-center justify-center" role="status">
      Verificando sesión segura…
    </main>;
  }
  if (status === "unavailable") {
    return <main className="min-h-screen flex flex-col gap-4 items-center justify-center p-6">
      <p>No pudimos comprobar tu sesión. Verifica la conexión e inténtalo nuevamente.</p>
      <button type="button" onClick={() => window.location.reload()} className="rounded-xl px-6 py-3 bg-slate-800 text-white">
        Reintentar
      </button>
    </main>;
  }
  return <Outlet />;
}
