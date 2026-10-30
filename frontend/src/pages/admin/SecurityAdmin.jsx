import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api.js";
import { clearAdminSession } from "../../services/adminSession.js";

export default function SecurityAdmin() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmation) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    if (newPassword.length < 12) {
      setError("La nueva contraseña debe tener al menos 12 caracteres.");
      return;
    }
    setSending(true);
    try {
      await api.post("/auth/password/change", { currentPassword, newPassword });
      // Todas las sesiones quedan invalidadas inmediatamente.
      clearAdminSession();
      navigate("/admin/login", { replace: true });
    } catch (cause) {
      setError(cause.response?.data?.message || "No se pudo cambiar la contraseña.");
    } finally {
      setSending(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
    }
  }

  return <section className="max-w-xl mx-auto p-6 md:p-10">
    <h1 className="text-3xl font-semibold text-slate-900">Seguridad de la cuenta</h1>
    <p className="mt-3 text-slate-600">Actualiza tu contraseña. Al guardarla, se cerrarán todas las sesiones de esta cuenta.</p>
    <form onSubmit={submit} className="mt-8 space-y-5 bg-white border border-slate-200 rounded-2xl p-6">
      {[
        ["Contraseña actual", currentPassword, setCurrentPassword, "current-password"],
        ["Nueva contraseña (mínimo 12 caracteres)", newPassword, setNewPassword, "new-password"],
        ["Confirmar contraseña nueva", confirmation, setConfirmation, "new-password"],
      ].map(([label, value, setValue, autoComplete], index) => (
        <label key={label} className="block text-sm font-semibold text-slate-700">
          {label}
          <input type="password" required value={value}
            minLength={index ? 12 : undefined}
            autoComplete={autoComplete}
            onChange={(event) => setValue(event.target.value)}
            className="block w-full mt-2 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-600"/>
        </label>
      ))}
      {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
      <button type="submit" disabled={sending} className="rounded-xl bg-slate-900 text-white px-6 py-3 disabled:opacity-50">
        {sending ? "Actualizando…" : "Cambiar contraseña y cerrar sesiones"}
      </button>
    </form>
  </section>;
}
