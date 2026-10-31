import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api.js";

const LEGEND = [
  ["bg-[#dceee7] text-[#235440]", "Sin registro interno"],
  ["bg-[#dbe7f1] text-[#183c59]", "Reserva confirmada"],
  ["bg-[#fff2d6] text-[#7b561c]", "Solicitud por verificar"],
  ["bg-[#f8dfd7] text-[#823b35]", "Bloqueo de día"],
  ["bg-[#f1e9f5] text-[#67456f]", "Bloqueo parcial"],
];

function dayISO(value) {
  return String(value || "").slice(0, 10);
}

function todayLima() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return value("year") + "-" + value("month") + "-" + value("day");
}

function addDays(dateText, count) {
  const date = new Date(dateText + "T00:00:00.000Z");
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

function addMonths(dateText, count) {
  const [year, month] = dateText.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + count, 1));
  return date.toISOString().slice(0, 10);
}

function periodFor(date, mode) {
  if (mode === "day") return { start: date, days: 1 };
  if (mode === "week") {
    const weekday = new Date(date + "T00:00:00Z").getUTCDay();
    return { start: addDays(date, -((weekday + 6) % 7)), days: 7 };
  }
  const first = date.slice(0, 7) + "-01";
  const end = addMonths(first, 1);
  const days = (Date.parse(end + "T00:00:00Z") - Date.parse(first + "T00:00:00Z")) / 86400000;
  return { start: first, days };
}

function statusFor(room, day, bookings, blocked) {
  const booked = bookings.filter((b) =>
    Number(b.room_id) === Number(room.id) &&
    dayISO(b.check_in) <= day && dayISO(b.check_out) > day
  );
  if (booked.some((b) => b.status === "confirmed" || b.status === "completed")) {
    return { text: "Reservada", color: LEGEND[1][0], detail: booked.find((b) => b.status === "confirmed" || b.status === "completed") };
  }
  const dayBlock = blocked.find((b) => (b.room_id == null || Number(b.room_id) === Number(room.id)) &&
    dayISO(b.blocked_date) === day && b.block_type === "day");
  if (dayBlock) return { text: "Bloqueada", color: LEGEND[3][0], detail: dayBlock };
  if (booked.length) return { text: "Solicitud", color: LEGEND[2][0], detail: booked[0] };
  const partialBlock = blocked.find((b) => (b.room_id == null || Number(b.room_id) === Number(room.id)) &&
    dayISO(b.blocked_date) === day);
  if (partialBlock) return { text: "Parcial", color: LEGEND[4][0], detail: partialBlock };
  return { text: "Sin registro", color: LEGEND[0][0], detail: null };
}

function friendlyDay(value) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "UTC", weekday: "short", day: "2-digit", month: "short",
  }).format(new Date(value + "T12:00:00Z"));
}

export default function OperationsCalendar() {
  const [mode, setMode] = useState("week");
  const [date, setDate] = useState(todayLima);
  // Nunca mostrar una respuesta de un período anterior bajo las fechas nuevas.
  // La clave acompaña a los datos y el AbortController cancela consultas obsoletas.
  const [loaded, setLoaded] = useState({ key: "", data: null });
  const [selected, setSelected] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const period = useMemo(() => periodFor(date, mode), [date, mode]);
  const periodKey = period.start + ":" + period.days;
  const days = useMemo(
    () => Array.from({ length: period.days }, (_, i) => addDays(period.start, i)),
    [period]
  );
  const snapshot = loaded.key === periodKey ? loaded.data : null;
  const reload = () => setRefreshCount((previous) => previous + 1);

  useEffect(() => {
    const abort = new AbortController();
    let active = true;
    setLoading(true);
    setError("");
    setSelected(null);
    api.get("/bookings/calendar", { params: period, signal: abort.signal })
      .then((response) => {
        if (!active) return;
        setLoaded({ key: periodKey, data: response.data.data });
      })
      .catch((failure) => {
        if (!active || failure.code === "ERR_CANCELED") return;
        setLoaded({ key: periodKey, data: null });
        setError(failure.response?.data?.message || "No se pudo consultar el calendario interno.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      abort.abort();
    };
  }, [period, periodKey, refreshCount]);

  function navigate(direction) {
    setSelected(null);
    if (mode === "month") setDate((current) => addMonths(current, direction));
    else setDate((current) => addDays(current, direction * (mode === "week" ? 7 : 1)));
  }

  const rooms = snapshot?.rooms || [];
  const bookings = snapshot?.bookings || [];
  const blocked = snapshot?.blocked_slots || [];
  const bookedCount = bookings.filter((b) => b.status === "confirmed").length;

  return (
    <div className="min-h-screen bg-[#f5f7f9] px-4 py-6 md:px-8 md:py-8 text-[#10263f]">
      <div className="mx-auto max-w-[1500px]">
        <header className="border-b border-[#dce5ed] pb-6">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#6288a5]">Casa Huéspedes Pimentel · Operaciones internas</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl md:text-5xl">Calendario de habitaciones</h1>
              <p className="mt-3 text-sm text-[#52677d]">Consulta protegida y de solo lectura. No crea, cancela ni modifica reservas.</p>
            </div>
            <Link to="/admin/mensajes" className="border border-[#8ca5b8] px-4 py-2 font-semibold hover:bg-white">Ver conversaciones</Link>
          </div>
        </header>
        <div role="note" className="mt-5 border-l-4 border-[#6288a5] bg-[#eaf0f4] px-4 py-3 text-sm leading-relaxed">
          <strong>Inventario exclusivamente interno.</strong> «Sin registro» no garantiza disponibilidad comercial: Booking, Airbnb y otros canales no están sincronizados. El número de habitaciones procede de las que están activas en Supabase.
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-1 bg-white border border-[#d9e3ea] p-1" aria-label="Vista del calendario">
            {[["day", "Hoy / Día"], ["week", "Semana"], ["month", "Mes"]].map(([value, label]) => (
              <button key={value} type="button" aria-pressed={mode === value}
                onClick={() => { setMode(value); setSelected(null); }}
                className={"px-4 py-2 text-sm font-semibold " + (mode === value ? "bg-[#10263f] text-white" : "text-[#4d6479] hover:bg-[#eaf0f4]")}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate(-1)} aria-label="Período anterior" className="border border-[#d9e3ea] bg-white px-3 py-2 hover:bg-[#eaf0f4]">‹</button>
            <span className="min-w-[165px] text-center text-sm font-semibold">{friendlyDay(period.start)} · {friendlyDay(days[days.length - 1])}</span>
            <button type="button" onClick={() => navigate(1)} aria-label="Período siguiente" className="border border-[#d9e3ea] bg-white px-3 py-2 hover:bg-[#eaf0f4]">›</button>
            <button type="button" onClick={() => { setSelected(null); setDate(todayLima()); }} className="border border-[#d9e3ea] bg-white px-3 py-2 text-sm">Hoy</button>
            <button type="button" onClick={reload} disabled={loading} className="border border-[#d9e3ea] bg-white px-3 py-2 text-sm disabled:opacity-50">Actualizar</button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[["Habitaciones activas", rooms.length], ["Reservas confirmadas en el período", bookedCount], ["Solicitudes / bloqueos internos", bookings.filter((b) => b.status !== "confirmed" && b.status !== "completed").length + blocked.length]].map(([label, count]) => (
            <div className="bg-white border border-[#dce5ed] px-5 py-4" key={label}><p className="text-xs text-[#667e92]">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{snapshot ? count : "—"}</p></div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#53687c]">
          {LEGEND.map(([css, label]) => <span key={label} className="inline-flex items-center gap-2"><span aria-hidden className={"h-3 w-3 rounded-sm " + css} />{label}</span>)}
        </div>

        {error && <p role="alert" className="mt-5 border border-red-300 bg-red-50 p-4 text-red-800">{error}</p>}
        {loading && <p role="status" className="mt-4 text-sm text-[#6288a5]">Consultando registros internos…</p>}
        {!loading && snapshot && rooms.length === 0 && <p className="mt-6 bg-white p-6">No hay habitaciones activas registradas.</p>}
        {snapshot && (
          <div className="mt-5 overflow-x-auto bg-white border border-[#dce5ed]" role="region" aria-label="Calendario interno" tabIndex={0}>
            <table className="w-full border-collapse text-xs" style={{ minWidth: Math.max(720, 225 + days.length * (mode === "month" ? 66 : 122)) }}>
              <thead>
                <tr className="bg-[#10263f] text-white">
                  <th scope="col" className="sticky left-0 z-10 min-w-[190px] bg-[#10263f] px-4 py-3 text-left font-semibold">Habitación</th>
                  {days.map((day) => <th scope="col" key={day} className="border-l border-white/10 px-1 py-3 text-center font-semibold whitespace-nowrap">{friendlyDay(day)}</th>)}
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id} className="border-b border-[#e1e9ef]">
                    <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-3 text-left">
                      <span className="font-semibold">{room.room_number ? "Hab. " + room.room_number : room.name}</span>
                      <span className="block mt-1 text-[10px] font-normal text-[#6a8295]">{room.category_slug || "Sin categoría"}</span>
                    </th>
                    {days.map((day) => {
                      const cell = statusFor(room, day, bookings, blocked);
                      return <td key={day} className="border-l border-[#edf1f4] p-1 align-middle text-center">
                        <button type="button" title={cell.text + " · " + day}
                          onClick={() => setSelected({ room, day, cell, periodKey })} className={"w-full min-h-[38px] px-1 py-2 text-[10px] font-semibold focus:outline focus:outline-2 focus:outline-[#6288a5] " + cell.color}>
                          {mode === "month" ? (cell.text === "Sin registro" ? "—" : cell.text.slice(0, 6)) : cell.text}
                        </button>
                      </td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {selected && snapshot && selected.periodKey === periodKey && !loading && <section aria-live="polite" className="mt-5 border border-[#cbd9e4] bg-white p-5">
          <div className="flex items-start justify-between gap-4"><h2 className="font-serif text-xl">{selected.room.name} · {friendlyDay(selected.day)}</h2><button type="button" onClick={() => setSelected(null)} aria-label="Cerrar detalle">✕</button></div>
          <p className="mt-2 text-sm"><strong>Registro interno:</strong> {selected.cell.text}</p>
          {selected.cell.detail?.status && <p className="mt-1 text-sm">Estado de reserva: {selected.cell.detail.status}.</p>}
          {selected.cell.detail?.booking_code && <p className="mt-1 text-sm">Código interno: {selected.cell.detail.booking_code}</p>}
          {selected.cell.detail?.block_type && <p className="mt-1 text-sm">Restricción: {selected.cell.detail.block_type === "day" ? "día completo" : "horario parcial"}.</p>}
          <p className="mt-2 text-xs text-[#678093]">Esta vista no valida reservas fuera de la base interna ni muestra datos personales.</p>
          <Link to="/admin/reservas" className="mt-3 inline-block text-sm font-semibold underline">Consultar reservas internas</Link>
        </section>}
      </div>
    </div>
  );
}
