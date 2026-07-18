import { useEffect, useMemo, useState } from "react";
import { getInquiries, updateInquiryStatus } from "../../services/api";

const statusLabels = {
  pending: "Pendiente",
  contacted: "Contactado",
  closed: "Cerrado",
};

const statusStyles = {
  pending: "bg-yellow-100 text-yellow-800",
  contacted: "bg-blue-100 text-blue-800",
  closed: "bg-green-100 text-green-800",
};

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function InquiriesAdmin() {
  const [inquiries, setInquiries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingId, setIsUpdatingId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadInquiries() {
    try {
      setIsLoading(true);
      setError("");

      const data = await getInquiries();
      setInquiries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudieron cargar las consultas.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadInquiries();
  }, []);

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inquiry) => {
      const text = `${inquiry.customer_name || ""} ${inquiry.phone || ""} ${
        inquiry.email || ""
      } ${inquiry.subject || ""} ${inquiry.message || ""}`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || inquiry.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [inquiries, search, statusFilter]);

  async function handleStatusChange(id, status) {
    try {
      setIsUpdatingId(id);
      setError("");
      setMessage("");

      await updateInquiryStatus(id, status);
      setMessage("Estado actualizado correctamente.");
      await loadInquiries();
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo actualizar la consulta.");
    } finally {
      setIsUpdatingId(null);
    }
  }

  function exportCsv() {
    const headers = [
      "Cliente",
      "Celular",
      "Correo",
      "Asunto",
      "Mensaje",
      "Ingreso preferido",
      "Salida preferida",
      "Estado",
      "Fecha registro",
    ];

    const rows = filteredInquiries.map((inquiry) => [
      inquiry.customer_name || "",
      inquiry.phone || "",
      inquiry.email || "",
      inquiry.subject || "",
      inquiry.message || "",
      inquiry.preferred_check_in || "",
      inquiry.preferred_check_out || "",
      statusLabels[inquiry.status] || inquiry.status,
      inquiry.created_at || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "consultas_casa_huespedes.csv";
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
              Consultas
            </h1>

            <p className="text-slate-600 mt-3">
              Revisa las consultas recibidas desde la web y actualiza su estado.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadInquiries}
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

        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <article className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-slate-500 font-bold">Total consultas</p>
            <h2 className="text-3xl font-black text-brand-dark mt-2">
              {inquiries.length}
            </h2>
          </article>

          <article className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-slate-500 font-bold">Pendientes</p>
            <h2 className="text-3xl font-black text-yellow-600 mt-2">
              {inquiries.filter((item) => item.status === "pending").length}
            </h2>
          </article>

          <article className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-slate-500 font-bold">Cerradas</p>
            <h2 className="text-3xl font-black text-green-600 mt-2">
              {inquiries.filter((item) => item.status === "closed").length}
            </h2>
          </article>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 mt-6">
          <div className="grid lg:grid-cols-[1fr_260px] gap-4">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por cliente, celular, correo o mensaje..."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-brand-gold"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-brand-gold bg-white"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="contacted">Contactado</option>
              <option value="closed">Cerrado</option>
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
              Cargando consultas...
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="p-8 text-center font-bold text-slate-500">
              No hay consultas para mostrar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-brand-dark text-white">
                  <tr>
                    <th className="text-left p-4">Cliente</th>
                    <th className="text-left p-4">Contacto</th>
                    <th className="text-left p-4">Consulta</th>
                    <th className="text-left p-4">Fechas</th>
                    <th className="text-left p-4">Estado</th>
                    <th className="text-left p-4">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredInquiries.map((inquiry) => (
                    <tr
                      key={inquiry.id}
                      className="border-b border-slate-100 align-top hover:bg-slate-50"
                    >
                      <td className="p-4">
                        <p className="font-black text-slate-800">
                          {inquiry.customer_name}
                        </p>
                        <p className="text-xs text-slate-400 font-bold mt-1">
                          {formatDate(inquiry.created_at)}
                        </p>
                      </td>

                      <td className="p-4">
                        <p className="text-slate-600">
                          📞 {inquiry.phone || "-"}
                        </p>
                        <p className="text-slate-600">
                          ✉️ {inquiry.email || "-"}
                        </p>
                      </td>

                      <td className="p-4 max-w-[380px]">
                        <p className="font-black text-slate-800">
                          {inquiry.subject || "Consulta desde la web"}
                        </p>
                        <p className="text-slate-600 mt-2 leading-relaxed">
                          {inquiry.message}
                        </p>
                      </td>

                      <td className="p-4">
                        <p className="font-bold">
                          Ingreso: {formatDate(inquiry.preferred_check_in)}
                        </p>
                        <p className="text-slate-500">
                          Salida: {formatDate(inquiry.preferred_check_out)}
                        </p>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex px-3 py-2 rounded-full text-xs font-black ${
                            statusStyles[inquiry.status] ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {statusLabels[inquiry.status] || inquiry.status}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col gap-2 min-w-[150px]">
                          <button
                            type="button"
                            disabled={isUpdatingId === inquiry.id}
                            onClick={() =>
                              handleStatusChange(inquiry.id, "contacted")
                            }
                            className="bg-blue-600 text-white rounded-xl px-3 py-2 font-black hover:bg-blue-700 disabled:opacity-50"
                          >
                            Contactado
                          </button>

                          <button
                            type="button"
                            disabled={isUpdatingId === inquiry.id}
                            onClick={() =>
                              handleStatusChange(inquiry.id, "closed")
                            }
                            className="bg-green-600 text-white rounded-xl px-3 py-2 font-black hover:bg-green-700 disabled:opacity-50"
                          >
                            Cerrar
                          </button>

                          <button
                            type="button"
                            disabled={isUpdatingId === inquiry.id}
                            onClick={() =>
                              handleStatusChange(inquiry.id, "pending")
                            }
                            className="bg-slate-700 text-white rounded-xl px-3 py-2 font-black hover:bg-slate-800 disabled:opacity-50"
                          >
                            Pendiente
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