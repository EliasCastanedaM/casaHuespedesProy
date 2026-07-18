import { useEffect, useState } from "react";
import {
  createBlockedSlot,
  deleteBlockedSlot,
  getAvailabilitySettings,
  getBlockedSlots,
  getRooms,
  updateAvailabilitySettings,
} from "../../services/api";

const days = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function ScheduleAdmin() {
  const [settings, setSettings] = useState({
    start_time: "08:00",
    end_time: "23:00",
    slot_minutes: 60,
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: true,
    sunday: true,
    is_active: true,
  });

  const [rooms, setRooms] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);

  const [blockForm, setBlockForm] = useState({
    room_id: "",
    blocked_date: "",
    blocked_time: "14:00",
    block_type: "day",
    reason: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingBlock, setIsSavingBlock] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    try {
      setIsLoading(true);
      setError("");

      const [settingsData, roomsData, blockedData] = await Promise.all([
        getAvailabilitySettings(),
        getRooms(),
        getBlockedSlots(),
      ]);

      if (settingsData) {
        setSettings({
          start_time: String(settingsData.start_time).slice(0, 5),
          end_time: String(settingsData.end_time).slice(0, 5),
          slot_minutes: settingsData.slot_minutes || 60,
          monday: Boolean(settingsData.monday),
          tuesday: Boolean(settingsData.tuesday),
          wednesday: Boolean(settingsData.wednesday),
          thursday: Boolean(settingsData.thursday),
          friday: Boolean(settingsData.friday),
          saturday: Boolean(settingsData.saturday),
          sunday: Boolean(settingsData.sunday),
          is_active: Boolean(settingsData.is_active),
        });
      }

      setRooms(Array.isArray(roomsData) ? roomsData : []);
      setBlockedSlots(Array.isArray(blockedData) ? blockedData : []);
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo cargar la configuración.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleSettingsChange(event) {
    const { name, value, type, checked } = event.target;

    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleBlockChange(event) {
    const { name, value } = event.target;

    setBlockForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSaveSettings(event) {
    event.preventDefault();

    try {
      setIsSavingSettings(true);
      setError("");
      setMessage("");

      await updateAvailabilitySettings({
        ...settings,
        slot_minutes: Number(settings.slot_minutes),
      });

      setMessage("Configuración de horarios actualizada.");
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo guardar la configuración.");
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function handleCreateBlock(event) {
    event.preventDefault();

    if (!blockForm.room_id || !blockForm.blocked_date) {
      setError("Selecciona habitación y fecha para crear el bloqueo.");
      return;
    }

    try {
      setIsSavingBlock(true);
      setError("");
      setMessage("");

      await createBlockedSlot({
        room_id: Number(blockForm.room_id),
        blocked_date: blockForm.blocked_date,
        blocked_time:
          blockForm.block_type === "day" ? null : blockForm.blocked_time,
        block_type: blockForm.block_type,
        reason: blockForm.reason || null,
      });

      setMessage("Bloqueo creado correctamente.");

      setBlockForm({
        room_id: "",
        blocked_date: "",
        blocked_time: "14:00",
        block_type: "day",
        reason: "",
      });

      await loadData();
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo crear el bloqueo.");
    } finally {
      setIsSavingBlock(false);
    }
  }

  async function handleDeleteBlock(id) {
    try {
      setError("");
      setMessage("");

      await deleteBlockedSlot(id);
      setMessage("Bloqueo eliminado correctamente.");
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo eliminar el bloqueo.");
    }
  }

  const activeDays = days.filter((day) => settings[day.key]).length;

  return (
    <main className="min-h-screen bg-[#f7f1e8] px-5 py-6 md:px-8 md:py-8">
      <section className="max-w-7xl mx-auto">
        {/* ENCABEZADO */}
        <div className="relative overflow-hidden rounded-[1.7rem] bg-[#2b1d12] border border-[#eadfce] shadow-sm">
          <div className="absolute inset-0 opacity-20">
            <img
              src="https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1800&auto=format&fit=crop"
              alt="Casa Huéspedes Pimentel"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="absolute inset-0 bg-gradient-to-r from-[#2b1d12] via-[#2b1d12]/92 to-[#2b1d12]/65" />

          <div className="relative p-6 md:p-8 lg:p-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <p className="uppercase tracking-[0.26em] text-xs font-black text-[#d9b48f]">
                Panel administrativo
              </p>

              <h1 className="font-serif text-4xl md:text-6xl leading-none tracking-[-0.045em] text-white mt-3">
                Horarios y bloqueos
              </h1>

              <p className="text-white/75 leading-relaxed mt-4 max-w-2xl">
                Configura los horarios de atención y bloquea fechas u horas no
                disponibles para reservas.
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="w-fit bg-[#d9b48f] text-[#2b1d12] px-5 py-3 rounded-xl font-black hover:bg-[#c99c6c] transition disabled:opacity-60"
            >
              {isLoading ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </div>

        {/* MENSAJES */}
        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 font-bold">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-2xl bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] px-4 py-3 font-bold">
            {message}
          </div>
        )}

        {isLoading ? (
          <div className="mt-8 bg-white rounded-[1.5rem] border border-[#eadfce] p-8 text-center font-bold text-[#6f6258] shadow-sm">
            Cargando configuración...
          </div>
        ) : (
          <>
            {/* RESUMEN */}
            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <SummaryCard
                title="Horario"
                value={`${settings.start_time} - ${settings.end_time}`}
                helper="Rango de atención configurado"
                icon="🕘"
              />

              <SummaryCard
                title="Días disponibles"
                value={`${activeDays} de 7`}
                helper="Días activos para atención"
                icon="📆"
              />

              <SummaryCard
                title="Bloqueos"
                value={blockedSlots.length}
                helper="Fechas u horas no disponibles"
                icon="⛔"
              />
            </div>

            <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6 mt-6">
              {/* CONFIGURACIÓN GENERAL */}
              <form
                onSubmit={handleSaveSettings}
                className="bg-white rounded-[1.5rem] border border-[#eadfce] p-6 shadow-sm"
              >
                <div>
                  <p className="uppercase tracking-[0.2em] text-[11px] font-black text-[#a87545]">
                    Atención
                  </p>

                  <h2 className="font-serif text-3xl leading-none tracking-[-0.035em] text-[#2d261f] mt-2">
                    Configuración general
                  </h2>

                  <p className="text-[#6f6258] text-sm mt-2 leading-relaxed">
                    Define el horario base y los días habilitados para recibir
                    solicitudes desde la web.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mt-6">
                  <div>
                    <label className="admin-label">Hora inicio</label>

                    <input
                      type="time"
                      name="start_time"
                      value={settings.start_time}
                      onChange={handleSettingsChange}
                      className="admin-input"
                    />
                  </div>

                  <div>
                    <label className="admin-label">Hora fin</label>

                    <input
                      type="time"
                      name="end_time"
                      value={settings.end_time}
                      onChange={handleSettingsChange}
                      className="admin-input"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="admin-label">
                      Duración del bloque / minutos
                    </label>

                    <input
                      type="number"
                      name="slot_minutes"
                      min="30"
                      step="30"
                      value={settings.slot_minutes}
                      onChange={handleSettingsChange}
                      className="admin-input"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-sm font-black text-[#2d261f]">
                    Días disponibles
                  </p>

                  <div className="grid sm:grid-cols-2 gap-3 mt-3">
                    {days.map((day) => (
                      <label
                        key={day.key}
                        className={`flex items-center gap-3 border rounded-xl px-4 py-3 font-black transition ${
                          settings[day.key]
                            ? "bg-[#fbf7ef] border-[#d9b48f] text-[#2d261f]"
                            : "bg-white border-[#eadfce] text-[#9d9187]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          name={day.key}
                          checked={settings[day.key]}
                          onChange={handleSettingsChange}
                          className="accent-[#a87545]"
                        />

                        {day.label}
                      </label>
                    ))}
                  </div>
                </div>

                <label
                  className={`mt-6 flex items-center gap-3 border rounded-xl px-4 py-3 font-black transition ${
                    settings.is_active
                      ? "bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]"
                      : "bg-[#fef2f2] border-[#fecaca] text-[#991b1b]"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={settings.is_active}
                    onChange={handleSettingsChange}
                    className="accent-[#a87545]"
                  />

                  {settings.is_active
                    ? "Sistema de horarios activo"
                    : "Sistema de horarios inactivo"}
                </label>

                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="w-full mt-6 bg-[#2b1d12] text-white rounded-xl py-4 font-black hover:bg-[#3a291b] transition disabled:opacity-60"
                >
                  {isSavingSettings ? "Guardando..." : "Guardar configuración"}
                </button>
              </form>

              <div className="space-y-6">
                {/* CREAR BLOQUEO */}
                <form
                  onSubmit={handleCreateBlock}
                  className="bg-white rounded-[1.5rem] border border-[#eadfce] p-6 shadow-sm"
                >
                  <div>
                    <p className="uppercase tracking-[0.2em] text-[11px] font-black text-[#a87545]">
                      Disponibilidad
                    </p>

                    <h2 className="font-serif text-3xl leading-none tracking-[-0.035em] text-[#2d261f] mt-2">
                      Crear bloqueo
                    </h2>

                    <p className="text-[#6f6258] text-sm mt-2 leading-relaxed">
                      Bloquea una habitación por día completo o por una hora
                      específica.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 mt-6">
                    <div className="sm:col-span-2">
                      <label className="admin-label">Habitación</label>

                      <select
                        name="room_id"
                        value={blockForm.room_id}
                        onChange={handleBlockChange}
                        className="admin-input"
                      >
                        <option value="">Seleccionar habitación</option>

                        {rooms.map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="admin-label">Fecha</label>

                      <input
                        type="date"
                        name="blocked_date"
                        value={blockForm.blocked_date}
                        onChange={handleBlockChange}
                        className="admin-input"
                      />
                    </div>

                    <div>
                      <label className="admin-label">Tipo</label>

                      <select
                        name="block_type"
                        value={blockForm.block_type}
                        onChange={handleBlockChange}
                        className="admin-input"
                      >
                        <option value="day">Bloquear todo el día</option>
                        <option value="time">Bloquear una hora</option>
                      </select>
                    </div>

                    {blockForm.block_type === "time" && (
                      <div>
                        <label className="admin-label">Hora</label>

                        <input
                          type="time"
                          name="blocked_time"
                          value={blockForm.blocked_time}
                          onChange={handleBlockChange}
                          className="admin-input"
                        />
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <label className="admin-label">Motivo</label>

                      <input
                        type="text"
                        name="reason"
                        value={blockForm.reason}
                        onChange={handleBlockChange}
                        placeholder="Ej. mantenimiento, reserva manual, limpieza profunda..."
                        className="admin-input"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingBlock}
                    className="w-full mt-6 bg-[#a87545] text-white rounded-xl py-4 font-black hover:bg-[#8f623a] transition disabled:opacity-60"
                  >
                    {isSavingBlock ? "Creando..." : "Crear bloqueo"}
                  </button>
                </form>

                {/* BLOQUEOS REGISTRADOS */}
                <div className="bg-white rounded-[1.5rem] border border-[#eadfce] overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-[#eadfce]">
                    <p className="uppercase tracking-[0.2em] text-[11px] font-black text-[#a87545]">
                      Registro
                    </p>

                    <h2 className="font-serif text-3xl leading-none tracking-[-0.035em] text-[#2d261f] mt-2">
                      Bloqueos registrados
                    </h2>

                    <p className="text-[#6f6258] text-sm mt-2">
                      Fechas u horarios actualmente restringidos.
                    </p>
                  </div>

                  {blockedSlots.length === 0 ? (
                    <div className="p-8">
                      <EmptyBlock text="No hay bloqueos registrados." />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-[#2b1d12] text-white">
                          <tr>
                            <th className="text-left px-5 py-4">
                              Habitación
                            </th>
                            <th className="text-left px-5 py-4">Fecha</th>
                            <th className="text-left px-5 py-4">Tipo</th>
                            <th className="text-left px-5 py-4">Motivo</th>
                            <th className="text-left px-5 py-4">Acción</th>
                          </tr>
                        </thead>

                        <tbody>
                          {blockedSlots.map((slot) => (
                            <tr
                              key={slot.id}
                              className="border-b border-[#eadfce] hover:bg-[#fbf7ef] transition"
                            >
                              <td className="px-5 py-4 font-black text-[#2d261f]">
                                {slot.room_name || `Habitación ${slot.room_id}`}
                              </td>

                              <td className="px-5 py-4">
                                <p className="font-bold text-[#2d261f]">
                                  {formatDate(slot.blocked_date)}
                                </p>

                                <p className="text-[#6f6258] text-sm mt-1">
                                  {slot.block_type === "day"
                                    ? "Todo el día"
                                    : slot.blocked_time}
                                </p>
                              </td>

                              <td className="px-5 py-4">
                                <span className="inline-flex border border-[#eadfce] bg-[#fbf7ef] text-[#2d261f] rounded-full px-3 py-1 text-xs font-black">
                                  {slot.block_type === "day"
                                    ? "Día completo"
                                    : "Hora específica"}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-[#6f6258]">
                                {slot.reason || "-"}
                              </td>

                              <td className="px-5 py-4">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBlock(slot.id)}
                                  className="bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] px-4 py-2 rounded-xl font-black hover:bg-[#fee2e2] transition"
                                >
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function SummaryCard({ title, value, helper, icon }) {
  return (
    <article className="bg-white rounded-[1.35rem] border border-[#eadfce] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-[#6f6258]">{title}</p>

          <h2 className="text-2xl font-black text-[#2d261f] mt-2">{value}</h2>

          <p className="text-xs text-[#9d9187] font-bold mt-1">{helper}</p>
        </div>

        <div className="w-11 h-11 rounded-xl bg-[#f7f1e8] border border-[#eadfce] flex items-center justify-center text-xl">
          {icon}
        </div>
      </div>
    </article>
  );
}

function EmptyBlock({ text }) {
  return (
    <div className="rounded-2xl bg-[#fbf7ef] border border-[#eadfce] p-6 text-center text-[#6f6258] font-bold">
      {text}
    </div>
  );
}