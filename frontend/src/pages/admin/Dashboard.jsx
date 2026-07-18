import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardData } from "../../services/api";

const statusLabels = {
  pending: "Pendiente",
  pending_payment: "Pendiente de pago",
  confirmed: "Confirmada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
  completed: "Finalizada",
};

const statusStyles = {
  pending: "bg-[#fff7ed] text-[#9a5b13] border-[#fed7aa]",
  pending_payment: "bg-[#fff7ed] text-[#9a5b13] border-[#fed7aa]",
  confirmed: "bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]",
  rejected: "bg-[#fef2f2] text-[#991b1b] border-[#fecaca]",
  cancelled: "bg-[#fef2f2] text-[#991b1b] border-[#fecaca]",
  completed: "bg-[#f8fafc] text-[#475569] border-[#e2e8f0]",
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

export default function Dashboard() {
  const [data, setData] = useState({
    bookings: [],
    inquiries: [],
    rooms: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setIsLoading(true);
      setError("");

      const dashboardData = await getDashboardData();

      setData({
        bookings: Array.isArray(dashboardData.bookings)
          ? dashboardData.bookings
          : [],
        inquiries: Array.isArray(dashboardData.inquiries)
          ? dashboardData.inquiries
          : [],
        rooms: Array.isArray(dashboardData.rooms) ? dashboardData.rooms : [],
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo cargar el dashboard.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats = useMemo(() => {
    const pendingBookings = data.bookings.filter((booking) =>
      ["pending", "pending_payment"].includes(booking.status)
    );

    const confirmedBookings = data.bookings.filter(
      (booking) => booking.status === "confirmed"
    );

    const pendingInquiries = data.inquiries.filter(
      (inquiry) => inquiry.status === "pending"
    );

    const activeRooms = data.rooms.filter((room) => room.status === "active");

    const totalSales = data.bookings
      .filter((booking) => booking.status === "confirmed")
      .reduce((sum, booking) => sum + Number(booking.total_amount || 0), 0);

    return {
      totalBookings: data.bookings.length,
      pendingBookings: pendingBookings.length,
      confirmedBookings: confirmedBookings.length,
      pendingInquiries: pendingInquiries.length,
      activeRooms: activeRooms.length,
      totalSales,
    };
  }, [data]);

  const latestBookings = data.bookings.slice(0, 5);
  const latestInquiries = data.inquiries.slice(0, 5);

  const statCards = [
    {
      title: "Reservas",
      value: stats.totalBookings,
      description: "Total registradas",
      icon: "📅",
    },
    {
      title: "Pendientes",
      value: stats.pendingBookings,
      description: "Por revisar",
      icon: "⏳",
    },
    {
      title: "Confirmadas",
      value: stats.confirmedBookings,
      description: "Reservas aprobadas",
      icon: "✅",
    },
    {
      title: "Consultas",
      value: stats.pendingInquiries,
      description: "Pendientes de atención",
      icon: "💬",
    },
    {
      title: "Habitaciones",
      value: stats.activeRooms,
      description: "Activas",
      icon: "🛏️",
    },
  ];

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
                Dashboard
              </h1>

              <p className="text-white/75 leading-relaxed mt-4 max-w-2xl">
                Vista general para revisar reservas, consultas, habitaciones y
                actividad reciente del hospedaje.
              </p>
            </div>

            <button
              type="button"
              onClick={loadDashboard}
              className="w-fit bg-[#d9b48f] text-[#2b1d12] px-5 py-3 rounded-xl font-black hover:bg-[#c99c6c] transition disabled:opacity-60"
              disabled={isLoading}
            >
              {isLoading ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 font-bold">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="mt-8 bg-white rounded-[1.5rem] border border-[#eadfce] p-8 text-center font-bold text-[#6f6258] shadow-sm">
            Cargando dashboard...
          </div>
        ) : (
          <>
            {/* MÉTRICAS */}
            <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4 mt-6">
              {statCards.map((card) => (
                <article
                  key={card.title}
                  className="bg-white rounded-[1.35rem] border border-[#eadfce] p-5 shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black text-[#6f6258]">
                        {card.title}
                      </p>

                      <h2 className="text-4xl font-black text-[#2d261f] mt-2">
                        {card.value}
                      </h2>

                      <p className="text-xs text-[#9d9187] font-bold mt-1">
                        {card.description}
                      </p>
                    </div>

                    <div className="w-11 h-11 rounded-xl bg-[#f7f1e8] border border-[#eadfce] flex items-center justify-center text-xl">
                      {card.icon}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* TOTAL CONFIRMADO */}
            <div className="mt-4 bg-[#2b1d12] rounded-[1.35rem] border border-[#2b1d12] p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="uppercase tracking-[0.22em] text-xs font-black text-[#d9b48f]">
                  Monto confirmado
                </p>

                <h2 className="font-serif text-4xl md:text-5xl leading-none tracking-[-0.04em] text-white mt-2">
                  {formatMoney(stats.totalSales)}
                </h2>
              </div>

              <p className="text-white/65 leading-relaxed max-w-xl">
                Este monto considera reservas confirmadas registradas en el
                sistema.
              </p>
            </div>

            {/* LISTAS */}
            <div className="grid xl:grid-cols-2 gap-6 mt-6">
              <article className="bg-white rounded-[1.5rem] border border-[#eadfce] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-[#eadfce] flex items-center justify-between gap-4">
                  <div>
                    <p className="uppercase tracking-[0.2em] text-[11px] font-black text-[#a87545]">
                      Reservas
                    </p>

                    <h2 className="font-serif text-3xl leading-none tracking-[-0.035em] text-[#2d261f] mt-2">
                      Últimas reservas
                    </h2>

                    <p className="text-[#6f6258] text-sm mt-2">
                      Solicitudes recibidas recientemente.
                    </p>
                  </div>

                  <Link
                    to="/admin/reservas"
                    className="shrink-0 bg-[#a87545] text-white px-4 py-2.5 rounded-xl font-black text-sm hover:bg-[#8f623a] transition"
                  >
                    Ver todo
                  </Link>
                </div>

                {latestBookings.length === 0 ? (
                  <div className="p-8 text-center text-[#6f6258] font-bold">
                    No hay reservas registradas.
                  </div>
                ) : (
                  <div className="divide-y divide-[#eadfce]">
                    {latestBookings.map((booking) => {
                      const statusClass =
                        statusStyles[booking.status] ||
                        "bg-[#f8fafc] text-[#475569] border-[#e2e8f0]";

                      return (
                        <div
                          key={booking.id}
                          className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-[#fbf7ef] transition"
                        >
                          <div>
                            <p className="font-black text-[#2d261f]">
                              {booking.customer_name || "Cliente"}
                            </p>

                            <p className="text-[#6f6258] text-sm mt-1">
                              {booking.room_name || "Habitación"} ·{" "}
                              {formatDate(booking.check_in)} · {booking.nights}{" "}
                              noche(s)
                            </p>
                          </div>

                          <div className="text-left md:text-right">
                            <p className="font-black text-[#2d261f]">
                              {formatMoney(booking.total_amount)}
                            </p>

                            <span
                              className={`inline-flex mt-2 border rounded-full px-3 py-1 text-xs font-black ${statusClass}`}
                            >
                              {statusLabels[booking.status] || booking.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>

              <article className="bg-white rounded-[1.5rem] border border-[#eadfce] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-[#eadfce] flex items-center justify-between gap-4">
                  <div>
                    <p className="uppercase tracking-[0.2em] text-[11px] font-black text-[#a87545]">
                      Consultas
                    </p>

                    <h2 className="font-serif text-3xl leading-none tracking-[-0.035em] text-[#2d261f] mt-2">
                      Últimas consultas
                    </h2>

                    <p className="text-[#6f6258] text-sm mt-2">
                      Mensajes recibidos desde la web.
                    </p>
                  </div>

                  <Link
                    to="/admin/consultas"
                    className="shrink-0 bg-[#a87545] text-white px-4 py-2.5 rounded-xl font-black text-sm hover:bg-[#8f623a] transition"
                  >
                    Ver todo
                  </Link>
                </div>

                {latestInquiries.length === 0 ? (
                  <div className="p-8 text-center text-[#6f6258] font-bold">
                    No hay consultas registradas.
                  </div>
                ) : (
                  <div className="divide-y divide-[#eadfce]">
                    {latestInquiries.map((inquiry) => (
                      <div
                        key={inquiry.id}
                        className="p-5 hover:bg-[#fbf7ef] transition"
                      >
                        <p className="font-black text-[#2d261f]">
                          {inquiry.customer_name || "Cliente"}
                        </p>

                        <p className="text-[#6f6258] text-sm mt-1">
                          📞 {inquiry.phone || "-"} · ✉️ {inquiry.email || "-"}
                        </p>

                        <p className="text-[#6f6258] text-sm mt-3 line-clamp-2 leading-relaxed">
                          {inquiry.message || "Sin mensaje registrado."}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </div>

            {/* ACCESOS RÁPIDOS */}
            <div className="grid md:grid-cols-3 gap-5 mt-6">
              <Link
                to="/admin/reservas"
                className="group bg-white border border-[#eadfce] text-[#2d261f] rounded-[1.35rem] p-6 font-black hover:bg-[#2b1d12] hover:text-white transition shadow-sm"
              >
                <span className="block text-2xl mb-4">📅</span>
                Gestionar reservas
                <span className="block text-sm font-bold text-[#6f6258] group-hover:text-white/65 mt-2">
                  Revisar solicitudes y estados →
                </span>
              </Link>

              <Link
                to="/admin/consultas"
                className="group bg-white border border-[#eadfce] text-[#2d261f] rounded-[1.35rem] p-6 font-black hover:bg-[#2b1d12] hover:text-white transition shadow-sm"
              >
                <span className="block text-2xl mb-4">💬</span>
                Revisar consultas
                <span className="block text-sm font-bold text-[#6f6258] group-hover:text-white/65 mt-2">
                  Atender mensajes recibidos →
                </span>
              </Link>

              <Link
                to="/admin/horarios"
                className="group bg-[#a87545] border border-[#a87545] text-white rounded-[1.35rem] p-6 font-black hover:bg-[#8f623a] transition shadow-sm"
              >
                <span className="block text-2xl mb-4">🕘</span>
                Configurar horarios
                <span className="block text-sm font-bold text-white/70 mt-2">
                  Ajustar atención y disponibilidad →
                </span>
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}