import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api.js";

export default function RecoverAdminPassword() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const resetToken = new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
    if (resetToken) {
      setToken(resetToken);
      // Remove the link from browser history immediately.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (token && (newPassword !== confirmation || newPassword.length < 12)) {
      setError("La contraseña debe tener al menos 12 caracteres y coincidir con la confirmación.");
      return;
    }
    setSending(true);
    try {
      if (token) {
        await api.post("/auth/password/recovery/confirm", { token, newPassword });
        setToken("");
        setNewPassword("");
        setConfirmation("");
        setMessage("Contraseña actualizada. Puedes iniciar sesión de nuevo.");
      } else {
        await api.post("/auth/password/recovery/request", { email });
        setMessage("Si la cuenta existe y tiene recuperación habilitada, recibirás un correo con instrucciones.");
      }
    } catch (cause) {
      setError(cause.response?.data?.message || "No se pudo completar la solicitud.");
    } finally {
      setSending(false);
    }
  }

  return <main className="min-h-screen bg-slate-50 flex items-center justify-center px-5 py-12">
    <section className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
      <h1 className="text-3xl font-serif text-slate-900">{token ? "Restablecer contraseña" : "Recuperar acceso"}</h1>
      <p className="mt-3 text-slate-600 text-sm">{token
        ? "Ingresa una contraseña distinta de la anterior. El enlace es válido solo una vez."
        : "Solicita un enlace de recuperación para una cuenta autorizada del hospedaje."}</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {token ? <>
          <label className="block text-sm font-medium">Nueva contraseña
            <input type="password" required minLength={12} value={newPassword} autoComplete="new-password"
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full mt-2 border border-slate-300 rounded-lg p-3"/>
          </label>
          <label className="block text-sm font-medium">Confirmar nueva contraseña
            <input type="password" required minLength={12} value={confirmation} autoComplete="new-password"
              onChange={(event) => setConfirmation(event.target.value)}
              className="w-full mt-2 border border-slate-300 rounded-lg p-3"/>
          </label>
        </> : <label className="block text-sm font-medium">Correo de la cuenta
          <input type="email" required value={email} autoComplete="email" onChange={(event) => setEmail(event.target.value)}
            className="w-full mt-2 border border-slate-300 rounded-lg p-3"/>
        </label>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="text-sm text-emerald-800">{message}</p>}
        <button type="submit" disabled={sending || Boolean(message && !token)}
          className="w-full rounded-xl bg-slate-900 text-white p-3 disabled:opacity-50">
          {sending ? "Procesando…" : token ? "Guardar nueva contraseña" : "Solicitar recuperación"}
        </button>
      </form>
      <Link to="/admin/login" className="block mt-6 text-sm font-semibold underline text-slate-700">Volver al inicio de sesión</Link>
    </section>
  </main>;
}
