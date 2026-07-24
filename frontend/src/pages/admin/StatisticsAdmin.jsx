import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardData } from "../../services/api";

const statusLabels = {
  pending: "Pendiente",
  pending_payment: "Pendiente de pago",
  payment_reported: "Pago reportado",
  confirmed: "Confirmada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
  completed: "Finalizada",
};

const statusStyles = {
  pending: "bg-[#fff7ed] text-[#9a5b13] border-[#fed7aa]",
  pending_payment: "bg-[#fff7ed] text-[#9a5b13] border-[#fed7aa]",
  payment_reported: "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]",
  confirmed: "bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]",
  rejected: "bg-[#fef2f2] text-[#991b1b] border-[#fecaca]",
  cancelled: "bg-[#fef2f2] text-[#991b1b] border-[#fecaca]",
  completed: "bg-[#f8fafc] text-[#475569] border-[#e2e8f0]",
};

function formatMoney(value) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getStatusLabel(status) {
  return statusLabels[status] || status || "Sin estado";
}

function getPercentage(value, total) {
  if (!total || total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function exportToCsv(filename, rows) {
  if (!rows || rows.length === 0) {
    alert("No hay información para exportar.");
    return;
  }

  const headers = Object.keys(rows[0]);

  const csvContent = [
    headers.join(";"),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? "";
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(";")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

export default function StatisticsAdmin() {
  const [data, setData] = useState({
    bookings: [],
    inquiries: [],
    rooms: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStatistics() {
    try {
      setLoading(true);
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
      console.error("Error cargando estadísticas:", err);
      setError(err.message || "No se pudieron cargar las estadísticas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatistics();
  }, []);

  const stats = useMemo(() => {
    const confirmedBookings = data.bookings.filter(
      (booking) => booking.status === "confirmed"
    );

    const pendingBookings = data.bookings.filter((booking) =>
      ["pending", "pending_payment", "payment_reported"].includes(
        booking.status
      )
    );

    const cancelledBookings = data.bookings.filter((booking) =>
      ["cancelled", "rejected"].includes(booking.status)
    );

    const completedBookings = data.bookings.filter(
      (booking) => booking.status === "completed"
    );

    const pendingInquiries = data.inquiries.filter(
      (inquiry) => inquiry.status === "pending"
    );

    const totalConfirmedAmount = confirmedBookings.reduce(
      (sum, booking) => sum + Number(booking.total_amount || 0),
      0
    );

    const totalRegisteredAmount = data.bookings.reduce(
      (sum, booking) => sum + Number(booking.total_amount || 0),
      0
    );

    const averageBookingAmount =
      data.bookings.length > 0
        ? totalRegisteredAmount / data.bookings.length
        : 0;

    return {
      totalBookings: data.bookings.length,
      confirmedBookings: confirmedBookings.length,
      pendingBookings: pendingBookings.length,
      cancelledBookings: cancelledBookings.length,
      completedBookings: completedBookings.length,
      totalInquiries: data.inquiries.length,
      pendingInquiries: pendingInquiries.length,
      totalRooms: data.rooms.length,
      activeRooms: data.rooms.filter((room) => room.status === "active").length,
      inactiveRooms: data.rooms.filter((room) => room.status === "inactive")
        .length,
      maintenanceRooms: data.rooms.filter(
        (room) => room.status === "maintenance"
      ).length,
      totalConfirmedAmount,
      totalRegisteredAmount,
      averageBookingAmount,
    };
  }, [data]);

  const bookingsByStatus = useMemo(() => {
    const statusOrder = [
      "pending",
      "pending_payment",
      "payment_reported",
      "confirmed",
      "completed",
      "cancelled",
      "rejected",
    ];

    return statusOrder
      .map((status) => {
        const count = data.bookings.filter(
          (booking) => booking.status === status
        ).length;

        return {
          status,
          label: getStatusLabel(status),
          count,
          percentage: getPercentage(count, data.bookings.length),
        };
      })
      .filter((item) => item.count > 0);
  }, [data.bookings]);

  const roomRanking = useMemo(() => {
    const rankingMap = {};

    data.bookings.forEach((booking) => {
      const roomName =
        booking.room_name ||
        data.rooms.find((room) => Number(room.id) === Number(booking.room_id))
          ?.name ||
        "Habitación no identificada";

      if (!rankingMap[roomName]) {
        rankingMap[roomName] = {
          roomName,
          bookings: 0,
          amount: 0,
          confirmedAmount: 0,
          pendingAmount: 0,
        };
      }

      rankingMap[roomName].bookings += 1;
      rankingMap[roomName].amount += Number(booking.total_amount || 0);

      if (booking.status === "confirmed") {
        rankingMap[roomName].confirmedAmount += Number(
          booking.total_amount || 0
        );
      }

      if (
        ["pending", "pending_payment", "payment_reported"].includes(
          booking.status
        )
      ) {
        rankingMap[roomName].pendingAmount += Number(booking.total_amount || 0);
      }
    });

    return Object.values(rankingMap).sort((a, b) => {
      if (b.bookings !== a.bookings) return b.bookings - a.bookings;
      return b.amount - a.amount;
    });
  }, [data.bookings, data.rooms]);

  const topBookedRoom = roomRanking[0];

  const topRevenueRoom = useMemo(() => {
    if (roomRanking.length === 0) return null;
    return [...roomRanking].sort((a, b) => b.amount - a.amount)[0];
  }, [roomRanking]);

  const customerRanking = useMemo(() => {
    const customerMap = {};

    data.bookings.forEach((booking) => {
      const customerName =
        booking.customer_name ||
        booking.full_name ||
        booking.customer_full_name ||
        "Cliente no identificado";

      const customerPhone =
        booking.customer_phone ||
        booking.phone ||
        booking.customer_phone_number ||
        "";

      const key = `${customerName}-${customerPhone}`;

      if (!customerMap[key]) {
        customerMap[key] = {
          customerName,
          customerPhone,
          bookings: 0,
          amount: 0,
          lastBooking: null,
        };
      }

      customerMap[key].bookings += 1;
      customerMap[key].amount += Number(booking.total_amount || 0);

      const currentDate = booking.check_in || booking.created_at;

      if (
        currentDate &&
        (!customerMap[key].lastBooking ||
          new Date(currentDate) > new Date(customerMap[key].lastBooking))
      ) {
        customerMap[key].lastBooking = currentDate;
      }
    });

    return Object.values(customerMap)
      .sort((a, b) => {
        if (b.bookings !== a.bookings) return b.bookings - a.bookings;
        return b.amount - a.amount;
      })
      .slice(0, 8);
  }, [data.bookings]);

  const monthlySummary = useMemo(() => {
    const summaryMap = {};

    data.bookings.forEach((booking) => {
      const baseDate = booking.check_in || booking.created_at;

      if (!baseDate) return;

      const date = new Date(baseDate);

      if (Number.isNaN(date.getTime())) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}`;

      if (!summaryMap[key]) {
        summaryMap[key] = {
          month: key,
          bookings: 0,
          confirmedBookings: 0,
          amount: 0,
          confirmedAmount: 0,
        };
      }

      summaryMap[key].bookings += 1;
      summaryMap[key].amount += Number(booking.total_amount || 0);

      if (booking.status === "confirmed") {
        summaryMap[key].confirmedBookings += 1;
        summaryMap[key].confirmedAmount += Number(booking.total_amount || 0);
      }
    });

    return Object.values(summaryMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  }, [data.bookings]);

  const bestMonthByBookings = useMemo(() => {
    if (monthlySummary.length === 0) return null;
    return [...monthlySummary].sort((a, b) => b.bookings - a.bookings)[0];
  }, [monthlySummary]);

  const bestMonthByRevenue = useMemo(() => {
    if (monthlySummary.length === 0) return null;
    return [...monthlySummary].sort((a, b) => b.amount - a.amount)[0];
  }, [monthlySummary]);

  const maxMonthlyBookings = useMemo(() => {
    return Math.max(...monthlySummary.map((item) => item.bookings), 1);
  }, [monthlySummary]);

  const roomsWithoutBookings = useMemo(() => {
    const bookedRoomNames = new Set(
      data.bookings.map((booking) => booking.room_name).filter(Boolean)
    );

    return data.rooms
      .filter((room) => !bookedRoomNames.has(room.name))
      .map((room) => room.name)
      .slice(0, 6);
  }, [data.bookings, data.rooms]);

  function handleExportBookings() {
    const rows = data.bookings.map((booking) => ({
      codigo: booking.booking_code || booking.id,
      cliente: booking.customer_name || "",
      telefono: booking.customer_phone || booking.phone || "",
      habitacion: booking.room_name || "",
      fecha_ingreso: booking.check_in || "",
      fecha_salida: booking.check_out || "",
      noches: booking.nights || "",
      huespedes: booking.guests_count || "",
      total: booking.total_amount || 0,
      estado: getStatusLabel(booking.status),
      creado: booking.created_at || "",
    }));

    exportToCsv("reservas_casa_huespedes.csv", rows);
  }

  function handleExportInquiries() {
    const rows = data.inquiries.map((inquiry) => ({
      cliente: inquiry.customer_name || "",
      telefono: inquiry.phone || "",
      correo: inquiry.email || "",
      asunto: inquiry.subject || "",
      mensaje: inquiry.message || "",
      estado: inquiry.status || "",
      creado: inquiry.created_at || "",
    }));

    exportToCsv("consultas_casa_huespedes.csv", rows);
  }

  function handleExportRooms() {
    const rows = data.rooms.map((room) => ({
      id: room.id,
      habitacion: room.name || "",
      capacidad: room.capacity || "",
      precio_por_noche: room.price_per_night || 0,
      estado: room.status || "",
      descripcion: room.description || "",
      imagen: room.main_image_url || "",
    }));

    exportToCsv("habitaciones_casa_huespedes.csv", rows);
  }

  function handleExportRoomRanking() {
    const rows = roomRanking.map((room, index) => ({
      ranking: index + 1,
      habitacion: room.roomName,
      reservas: room.bookings,
      total_registrado: room.amount,
      total_confirmado: room.confirmedAmount,
      total_pendiente: room.pendingAmount,
    }));

    exportToCsv("ranking_habitaciones_casa_huespedes.csv", rows);
  }

  const mainMetrics = [
    {
      title: "Reservas totales",
      value: stats.totalBookings,
      helper: "Total registradas",
      icon: "📅",
    },
    {
      title: "Pendientes",
      value: stats.pendingBookings,
      helper: "Por confirmar",
      icon: "⏳",
    },
    {
      title: "Confirmadas",
      value: stats.confirmedBookings,
      helper: "Aprobadas",
      icon: "✅",
    },
    {
      title: "Canceladas",
      value: stats.cancelledBookings,
      helper: "Canceladas o rechazadas",
      icon: "🚫",
    },
    {
      title: "Promedio reserva",
      value: formatMoney(stats.averageBookingAmount),
      helper: "Monto promedio",
      icon: "💳",
    },
  ];

  const secondaryMetrics = [
    {
      title: "Total registrado",
      value: formatMoney(stats.totalRegisteredAmount),
      icon: "📌",
    },
    {
      title: "Consultas pendientes",
      value: stats.pendingInquiries,
      icon: "💬",
    },
    {
      title: "Habitaciones activas",
      value: stats.activeRooms,
      icon: "🛏️",
    },
    {
      title: "Mantenimiento",
      value: stats.maintenanceRooms,
      icon: "🛠️",
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
                Estadísticas
              </h1>

              <p className="text-white/75 leading-relaxed mt-4 max-w-2xl">
                Indicadores para entender reservas, habitaciones, clientes y
                movimiento del hospedaje.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleExportBookings}
                className="bg-[#d9b48f] text-[#2b1d12] px-5 py-3 rounded-xl font-black hover:bg-[#c99c6c] transition"
              >
                Exportar reservas
              </button>

              <button
                type="button"
                onClick={handleExportInquiries}
                className="bg-white/10 border border-white/20 text-white px-5 py-3 rounded-xl font-black hover:bg-white/15 transition"
              >
                Consultas
              </button>

              <button
                type="button"
                onClick={handleExportRooms}
                className="bg-white/10 border border-white/20 text-white px-5 py-3 rounded-xl font-black hover:bg-white/15 transition"
              >
                Habitaciones
              </button>

              <button
                type="button"
                onClick={loadStatistics}
                disabled={loading}
                className="bg-white text-[#2b1d12] px-5 py-3 rounded-xl font-black hover:bg-[#fbf7ef] transition disabled:opacity-60"
              >
                {loading ? "Actualizando..." : "Actualizar"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 font-bold">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-8 bg-white rounded-[1.5rem] border border-[#eadfce] p-8 text-center font-bold text-[#6f6258] shadow-sm">
            Cargando estadísticas...
          </div>
        ) : (
          <>
            {/* MÉTRICAS PRINCIPALES */}
            <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4 mt-6">
              {mainMetrics.map((metric) => (
                <article
                  key={metric.title}
                  className="bg-white rounded-[1.35rem] border border-[#eadfce] p-5 shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black text-[#6f6258]">
                        {metric.title}
                      </p>

                      <h2 className="text-3xl font-black text-[#2d261f] mt-2">
                        {metric.value}
                      </h2>

                      <p className="text-xs text-[#9d9187] font-bold mt-1">
                        {metric.helper}
                      </p>
                    </div>

                    <div className="w-11 h-11 rounded-xl bg-[#f7f1e8] border border-[#eadfce] flex items-center justify-center text-xl">
                      {metric.icon}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* TOTAL CONFIRMADO */}
            <div className="mt-4 bg-[#2b1d12] rounded-[1.35rem] border border-[#2b1d12] p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="uppercase tracking-[0.22em] text-xs font-black text-[#d9b48f]">
                  Total confirmado
                </p>

                <h2 className="font-serif text-4xl md:text-5xl leading-none tracking-[-0.04em] text-white mt-2">
                  {formatMoney(stats.totalConfirmedAmount)}
                </h2>
              </div>

              <p className="text-white/65 leading-relaxed max-w-xl">
                Considera solo reservas confirmadas. Sirve como referencia para
                medir ingresos ya validados.
              </p>
            </div>

            {/* MÉTRICAS SECUNDARIAS */}
            <div className="grid md:grid-cols-4 gap-4 mt-4">
              {secondaryMetrics.map((metric) => (
                <article
                  key={metric.title}
                  className="bg-white rounded-[1.25rem] border border-[#eadfce] p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-black text-[#6f6258]">
                        {metric.title}
                      </p>

                      <h2 className="text-2xl font-black text-[#2d261f] mt-2">
                        {metric.value}
                      </h2>
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-[#fbf7ef] border border-[#eadfce] grid place-items-center">
                      {metric.icon}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* INSIGHTS */}
            <div className="grid lg:grid-cols-3 gap-5 mt-6">
              <InsightCard
                eyebrow="Mayor demanda"
                title={topBookedRoom?.roomName || "Sin información"}
                description={
                  topBookedRoom
                    ? `${topBookedRoom.bookings} reserva(s) registradas`
                    : "Aún no hay reservas suficientes."
                }
                icon="🏆"
              />

              <InsightCard
                eyebrow="Mayor ingreso"
                title={topRevenueRoom?.roomName || "Sin información"}
                description={
                  topRevenueRoom
                    ? `${formatMoney(topRevenueRoom.amount)} registrados`
                    : "Aún no hay reservas suficientes."
                }
                icon="💰"
                dark
              />

              <InsightCard
                eyebrow="Mes con más actividad"
                title={bestMonthByBookings?.month || "Sin información"}
                description={
                  bestMonthByBookings
                    ? `${bestMonthByBookings.bookings} reserva(s)`
                    : "Aún no hay movimiento mensual."
                }
                icon="📈"
              />
            </div>

            {/* GRÁFICOS */}
            <div className="grid xl:grid-cols-2 gap-6 mt-6">
              <article className="bg-white rounded-[1.5rem] border border-[#eadfce] p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="uppercase tracking-[0.2em] text-[11px] font-black text-[#a87545]">
                      Estados
                    </p>

                    <h2 className="font-serif text-3xl leading-none tracking-[-0.035em] text-[#2d261f] mt-2">
                      Reservas por estado
                    </h2>

                    <p className="text-[#6f6258] text-sm mt-2">
                      Distribución de reservas pendientes, confirmadas o
                      canceladas.
                    </p>
                  </div>

                  <Link
                    to="/admin/reservas"
                    className="shrink-0 bg-[#a87545] text-white px-4 py-2.5 rounded-xl font-black text-sm hover:bg-[#8f623a] transition"
                  >
                    Ver reservas
                  </Link>
                </div>

                {bookingsByStatus.length === 0 ? (
                  <EmptyBlock text="Aún no hay reservas para graficar." />
                ) : (
                  <div className="mt-6 space-y-4">
                    {bookingsByStatus.map((item) => (
                      <div key={item.status}>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="font-black text-[#2d261f]">
                            {item.label}
                          </span>

                          <span className="font-bold text-[#6f6258]">
                            {item.count} reserva(s)
                          </span>
                        </div>

                        <div className="h-4 rounded-full bg-[#f7f1e8] border border-[#eadfce] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#a87545]"
                            style={{
                              width: `${Math.max(item.percentage, 5)}%`,
                            }}
                          />
                        </div>

                        <p className="text-xs text-[#9d9187] mt-1">
                          {item.percentage}% del total
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className="bg-white rounded-[1.5rem] border border-[#eadfce] p-6 shadow-sm">
                <div>
                  <p className="uppercase tracking-[0.2em] text-[11px] font-black text-[#a87545]">
                    Meses
                  </p>

                  <h2 className="font-serif text-3xl leading-none tracking-[-0.035em] text-[#2d261f] mt-2">
                    Movimiento mensual
                  </h2>

                  <p className="text-[#6f6258] text-sm mt-2">
                    Muestra los meses con mayor actividad de reservas.
                  </p>
                </div>

                {monthlySummary.length === 0 ? (
                  <EmptyBlock text="Aún no hay información mensual para mostrar." />
                ) : (
                  <div className="mt-6 space-y-4">
                    {monthlySummary.map((item) => {
                      const percentage = getPercentage(
                        item.bookings,
                        maxMonthlyBookings
                      );

                      return (
                        <div key={item.month}>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="font-black text-[#2d261f]">
                              {item.month}
                            </span>

                            <span className="font-bold text-[#6f6258]">
                              {item.bookings} reserva(s) ·{" "}
                              {formatMoney(item.amount)}
                            </span>
                          </div>

                          <div className="h-4 rounded-full bg-[#f7f1e8] border border-[#eadfce] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#2b1d12]"
                              style={{
                                width: `${Math.max(percentage, 8)}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            </div>

            {/* RANKINGS */}
            <div className="grid xl:grid-cols-2 gap-6 mt-6">
              <article className="bg-white rounded-[1.5rem] border border-[#eadfce] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-[#eadfce] flex items-center justify-between gap-4">
                  <div>
                    <p className="uppercase tracking-[0.2em] text-[11px] font-black text-[#a87545]">
                      Habitaciones
                    </p>

                    <h2 className="font-serif text-3xl leading-none tracking-[-0.035em] text-[#2d261f] mt-2">
                      Ranking de habitaciones
                    </h2>

                    <p className="text-[#6f6258] text-sm mt-2">
                      Compara reservas y montos generados por habitación.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportRoomRanking}
                    className="shrink-0 bg-[#fbf7ef] border border-[#eadfce] text-[#2d261f] px-4 py-2.5 rounded-xl font-black text-sm hover:bg-[#f7f1e8]"
                  >
                    Exportar
                  </button>
                </div>

                {roomRanking.length === 0 ? (
                  <div className="p-8">
                    <EmptyBlock text="Aún no hay habitaciones reservadas." />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#fbf7ef] text-[#6f6258]">
                        <tr>
                          <th className="text-left px-5 py-4">#</th>
                          <th className="text-left px-5 py-4">Habitación</th>
                          <th className="text-left px-5 py-4">Reservas</th>
                          <th className="text-left px-5 py-4">Total</th>
                          <th className="text-left px-5 py-4">Confirmado</th>
                        </tr>
                      </thead>

                      <tbody>
                        {roomRanking.slice(0, 8).map((room, index) => (
                          <tr
                            key={room.roomName}
                            className="border-t border-[#eadfce] hover:bg-[#fbf7ef]"
                          >
                            <td className="px-5 py-4 font-black text-[#2d261f]">
                              #{index + 1}
                            </td>

                            <td className="px-5 py-4 font-black text-[#2d261f]">
                              {room.roomName}
                            </td>

                            <td className="px-5 py-4 text-[#6f6258] font-bold">
                              {room.bookings} reserva(s)
                            </td>

                            <td className="px-5 py-4 font-black text-[#2d261f]">
                              {formatMoney(room.amount)}
                            </td>

                            <td className="px-5 py-4 font-black text-[#166534]">
                              {formatMoney(room.confirmedAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>

              <article className="bg-white rounded-[1.5rem] border border-[#eadfce] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-[#eadfce]">
                  <p className="uppercase tracking-[0.2em] text-[11px] font-black text-[#a87545]">
                    Clientes
                  </p>

                  <h2 className="font-serif text-3xl leading-none tracking-[-0.035em] text-[#2d261f] mt-2">
                    Clientes con más reservas
                  </h2>

                  <p className="text-[#6f6258] text-sm mt-2">
                    Identifica huéspedes frecuentes o de mayor movimiento.
                  </p>
                </div>

                {customerRanking.length === 0 ? (
                  <div className="p-8">
                    <EmptyBlock text="Aún no hay clientes con reservas." />
                  </div>
                ) : (
                  <div className="divide-y divide-[#eadfce]">
                    {customerRanking.map((customer, index) => (
                      <div
                        key={`${customer.customerName}-${index}`}
                        className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 hover:bg-[#fbf7ef]"
                      >
                        <div>
                          <p className="font-black text-[#2d261f]">
                            #{index + 1} {customer.customerName}
                          </p>

                          <p className="text-[#6f6258] text-sm mt-1">
                            📞 {customer.customerPhone || "-"} · Última reserva:{" "}
                            {formatDate(customer.lastBooking)}
                          </p>
                        </div>

                        <div className="text-left md:text-right">
                          <p className="font-black text-[#2d261f]">
                            {customer.bookings} reserva(s)
                          </p>

                          <p className="text-sm text-[#6f6258] font-bold">
                            {formatMoney(customer.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </div>

            {/* HABITACIONES SIN MOVIMIENTO */}
            <article className="bg-white rounded-[1.5rem] border border-[#eadfce] p-6 mt-6 shadow-sm">
              <p className="uppercase tracking-[0.2em] text-[11px] font-black text-[#a87545]">
                Revisión
              </p>

              <h2 className="font-serif text-3xl leading-none tracking-[-0.035em] text-[#2d261f] mt-2">
                Habitaciones sin movimiento
              </h2>

              <p className="text-[#6f6258] text-sm mt-2">
                Habitaciones que todavía no aparecen en reservas registradas.
                Sirve para revisar precio, foto o descripción.
              </p>

              {roomsWithoutBookings.length === 0 ? (
                <div className="mt-6 rounded-2xl bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] p-5 font-bold">
                  Todas las habitaciones tienen movimiento registrado o aún no
                  hay suficiente data para comparar.
                </div>
              ) : (
                <div className="mt-6 flex flex-wrap gap-3">
                  {roomsWithoutBookings.map((roomName) => (
                    <span
                      key={roomName}
                      className="bg-[#fbf7ef] border border-[#eadfce] text-[#2d261f] rounded-full px-4 py-2 font-black"
                    >
                      {roomName}
                    </span>
                  ))}
                </div>
              )}
            </article>
          </>
        )}
      </section>
    </main>
  );
}

function InsightCard({ eyebrow, title, description, icon, dark = false }) {
  return (
    <article
      className={`rounded-[1.35rem] border p-6 shadow-sm ${
        dark
          ? "bg-[#2b1d12] border-[#2b1d12] text-white"
          : "bg-white border-[#eadfce] text-[#2d261f]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={`uppercase tracking-[0.2em] text-[11px] font-black ${
              dark ? "text-[#d9b48f]" : "text-[#a87545]"
            }`}
          >
            {eyebrow}
          </p>

          <h2
            className={`font-serif text-3xl leading-none tracking-[-0.035em] mt-3 ${
              dark ? "text-white" : "text-[#2d261f]"
            }`}
          >
            {title}
          </h2>

          <p
            className={`text-sm leading-relaxed mt-3 ${
              dark ? "text-white/70" : "text-[#6f6258]"
            }`}
          >
            {description}
          </p>
        </div>

        <div
          className={`w-12 h-12 rounded-xl grid place-items-center text-xl ${
            dark
              ? "bg-white/10 border border-white/15"
              : "bg-[#fbf7ef] border border-[#eadfce]"
          }`}
        >
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
