import { useEffect, useMemo, useState } from "react";
import { getBookings, updateBookingStatus } from "../../services/api";

const statusLabels = {
  pending: "Pendiente",
  pending_payment: "Pendiente de pago",
  confirmed: "Confirmada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
  completed: "Finalizada",
};

const statusStyles = {
  pending: "bg-yellow-100 text-yellow-800",
  pending_payment: "bg-orange-100 text-orange-800",
  confirmed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-slate-200 text-slate-700",
  completed: "bg-blue-100 text-blue-800",
};

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatMoney(value) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

export default function BookingsAdmin() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingId, setIsUpdatingId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadBookings() {
    try {
      setIsLoading(true);
      setError("");

      const data = await getBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudieron cargar las reservas.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const text = `${booking.booking_code || ""} ${booking.customer_name || ""} ${
        booking.customer_phone || ""
      } ${booking.room_name || ""}`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || booking.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [bookings, search, statusFilter]);

  async function handleStatusChange(id, status) {
    try {
      setIsUpdatingId(id);
      setMessage("");
      setError("");

      await updateBookingStatus(id, status);
      setMessage("Estado actualizado correctamente.");
      await loadBookings();
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo actualizar el estado.");
    } finally {
      setIsUpdatingId(null);
    }
  }

  function exportCsv() {
    const headers = [
      "Codigo",
      "Cliente",
      "Celular",
      "Correo",
      "Habitacion",
      "Ingreso",
      "Salida",
      "Hora",
      "Noches",
      "Huespedes",
      "Total",
      "Estado",
      "Comentario",
      "Fecha Registro",
    ];

    const rows = filteredBookings.map((booking) => [
      booking.booking_code || booking.id,
      booking.customer_name || "",
      booking.customer_phone || "",
      booking.customer_email || "",
      booking.room_name || "",
      booking.check_in || "",
      booking.check_out || "",
      booking.check_in_time || "",
      booking.nights || "",
      booking.guests_count || "",
      booking.total_amount || 0,
      statusLabels[booking.status] || booking.status,
      booking.special_requests || "",
      booking.created_at || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "reservas_casa_huespedes.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      <section className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="uppercase tracking-[0.25em] text-sm font-black text-brand-ocean">
              Panel administrativo
            </p>

            <h1 className="text-4xl md:text-5xl font-black text-brand-dark mt-2">
              Reservas
            </h1>

            <p className="text-slate-600 mt-3">
              Revisa las solicitudes recibidas desde la web y actualiza su estado.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadBookings}
              className="bg-white border border-slate-200 text-brand-dark px-5 py-3 rounded-full font-black hover:bg-slate-100 transition"
            >
              Actualizar
            </button>

            <button
              type="button"
              onClick={exportCsv}
              className="bg-brand-gold text-brand-navy px-5 py-3 rounded-full font-black hover:bg-brand-goldDark transition"
            >
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mt-8">
          <article className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-slate-500 font-bold">Total</p>
            <h2 className="text-3xl font-black text-brand-dark mt-2">
              {bookings.length}
            </h2>
          </article>

          <article className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-slate-500 font-bold">Pendientes</p>
            <h2 className="text-3xl font-black text-orange-600 mt-2">
              {
                bookings.filter((booking) =>
                  ["pending", "pending_payment"].includes(booking.status)
                ).length
              }
            </h2>
          </article>

          <article className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-slate-500 font-bold">Confirmadas</p>
            <h2 className="text-3xl font-black text-green-600 mt-2">
              {bookings.filter((booking) => booking.status === "confirmed").length}
            </h2>
          </article>

          <article className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-slate-500 font-bold">Canceladas/Rechazadas</p>
            <h2 className="text-3xl font-black text-red-600 mt-2">
              {
                bookings.filter((booking) =>
                  ["cancelled", "rejected"].includes(booking.status)
                ).length
              }
            </h2>
          </article>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 mt-6">
          <div className="grid lg:grid-cols-[1fr_260px] gap-4">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por cliente, celular, código o habitación..."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-brand-gold"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-brand-gold bg-white"
            >
              <option value="all">Todos los estados</option>
              <option value="pending_payment">Pendiente de pago</option>
              <option value="pending">Pendiente</option>
              <option value="confirmed">Confirmada</option>
              <option value="rejected">Rechazada</option>
              <option value="cancelled">Cancelada</option>
              <option value="completed">Finalizada</option>
            </select>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 font-bold">
              {error}
            </div>
          )}

          {message && (
            <div className="mt-5 rounded-2xl bg-green-50 border border-green-200 text-green-700 px-4 py-3 font-bold">
              {message}
            </div>
          )}
        </div>

        <div className="mt-6 bg-white rounded-3xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center font-bold text-slate-500">
              Cargando reservas...
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-8 text-center font-bold text-slate-500">
              No hay reservas para mostrar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-brand-dark text-white">
                  <tr>
                    <th className="text-left p-4">Código</th>
                    <th className="text-left p-4">Cliente</th>
                    <th className="text-left p-4">Habitación</th>
                    <th className="text-left p-4">Fechas</th>
                    <th className="text-left p-4">Total</th>
                    <th className="text-left p-4">Estado</th>
                    <th className="text-left p-4">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className="border-b border-slate-100 align-top hover:bg-slate-50"
                    >
                      <td className="p-4 font-black text-brand-dark">
                        {booking.booking_code || `RES-${booking.id}`}
                        <p className="text-xs text-slate-400 font-bold mt-1">
                          {formatDate(booking.created_at)}
                        </p>
                      </td>

                      <td className="p-4">
                        <p className="font-black text-slate-800">
                          {booking.customer_name}
                        </p>
                        <p className="text-slate-500 mt-1">
                          📞 {booking.customer_phone || "-"}
                        </p>
                        <p className="text-slate-500">
                          ✉️ {booking.customer_email || "-"}
                        </p>
                      </td>

                      <td className="p-4">
                        <p className="font-black text-slate-800">
                          {booking.room_name}
                        </p>
                        <p className="text-slate-500 mt-1">
                          Huéspedes: {booking.guests_count}
                        </p>
                      </td>

                      <td className="p-4">
                        <p className="font-bold">
                          Ingreso: {formatDate(booking.check_in)}
                        </p>
                        <p className="text-slate-500">
                          Salida: {formatDate(booking.check_out)}
                        </p>
                        <p className="text-slate-500">
                          Hora: {booking.check_in_time || "-"}
                        </p>
                        <p className="text-slate-500">
                          Noches: {booking.nights}
                        </p>
                      </td>

                      <td className="p-4 font-black text-brand-dark">
                        {formatMoney(booking.total_amount)}
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex px-3 py-2 rounded-full text-xs font-black ${
                            statusStyles[booking.status] ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {statusLabels[booking.status] || booking.status}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col gap-2 min-w-[150px]">
                          <button
                            type="button"
                            disabled={isUpdatingId === booking.id}
                            onClick={() =>
                              handleStatusChange(booking.id, "confirmed")
                            }
                            className="bg-green-600 text-white rounded-xl px-3 py-2 font-black hover:bg-green-700 disabled:opacity-50"
                          >
                            Confirmar
                          </button>

                          <button
                            type="button"
                            disabled={isUpdatingId === booking.id}
                            onClick={() =>
                              handleStatusChange(booking.id, "rejected")
                            }
                            className="bg-red-600 text-white rounded-xl px-3 py-2 font-black hover:bg-red-700 disabled:opacity-50"
                          >
                            Rechazar
                          </button>

                          <button
                            type="button"
                            disabled={isUpdatingId === booking.id}
                            onClick={() =>
                              handleStatusChange(booking.id, "cancelled")
                            }
                            className="bg-slate-700 text-white rounded-xl px-3 py-2 font-black hover:bg-slate-800 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}