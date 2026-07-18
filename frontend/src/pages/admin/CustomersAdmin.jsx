import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

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

function normalizePhone(phone) {
  if (!phone) return "";

  return String(phone).replace(/\D/g, "");
}

function buildWhatsappLink(customer) {
  const phone = normalizePhone(customer.phone);

  if (!phone) return null;

  const peruPhone = phone.startsWith("51") ? phone : `51${phone}`;

  const message = encodeURIComponent(
    `Hola ${
      customer.full_name || ""
    }, te saludamos de Casa Huéspedes Pimentel. Queríamos comunicarnos contigo sobre tu reserva o consulta.`
  );

  return `https://wa.me/${peruPhone}?text=${message}`;
}

export default function CustomersAdmin() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  async function loadCustomers() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/customers");

      setCustomers(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (err) {
      console.error("Error cargando clientes:", err);
      setError("No se pudieron cargar los clientes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return customers;

    return customers.filter((customer) => {
      const fullName = String(customer.full_name || "").toLowerCase();
      const phone = String(customer.phone || "").toLowerCase();
      const email = String(customer.email || "").toLowerCase();
      const documentNumber = String(
        customer.document_number || ""
      ).toLowerCase();

      return (
        fullName.includes(term) ||
        phone.includes(term) ||
        email.includes(term) ||
        documentNumber.includes(term)
      );
    });
  }, [customers, searchTerm]);

  const stats = useMemo(() => {
    const customersWithPhone = customers.filter((customer) => customer.phone);
    const customersWithEmail = customers.filter((customer) => customer.email);

    const totalBookings = customers.reduce(
      (sum, customer) => sum + Number(customer.total_bookings || 0),
      0
    );

    const totalSpent = customers.reduce(
      (sum, customer) => sum + Number(customer.total_spent || 0),
      0
    );

    return {
      totalCustomers: customers.length,
      customersWithPhone: customersWithPhone.length,
      customersWithEmail: customersWithEmail.length,
      totalBookings,
      totalSpent,
    };
  }, [customers]);

  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      <section className="max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="uppercase tracking-[0.25em] text-sm font-black text-brand-ocean">
              Panel administrativo
            </p>

            <h1 className="text-4xl md:text-5xl font-black text-brand-dark mt-2">
              Clientes
            </h1>

            <p className="text-slate-600 mt-3">
              Revisa los huéspedes registrados en el sistema, sus datos de
              contacto, reservas realizadas y comunicación por WhatsApp.
            </p>
          </div>

          <button
            type="button"
            onClick={loadCustomers}
            className="bg-white border border-slate-200 text-brand-dark px-5 py-3 rounded-full font-black hover:bg-slate-100 transition"
          >
            Actualizar
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 font-bold">
            {error}
          </div>
        )}

        {/* Cargando */}
        {loading ? (
          <div className="mt-8 bg-white rounded-3xl border border-slate-200 p-8 text-center font-bold text-slate-500">
            Cargando clientes...
          </div>
        ) : (
          <>
            {/* Métricas */}
            <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4 mt-8">
              <article className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="text-slate-500 font-bold">Total clientes</p>
                <h2 className="text-3xl font-black text-brand-dark mt-2">
                  {stats.totalCustomers}
                </h2>
              </article>

              <article className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="text-slate-500 font-bold">
                  Teléfonos registrados
                </p>
                <h2 className="text-3xl font-black text-green-600 mt-2">
                  {stats.customersWithPhone}
                </h2>
              </article>

              <article className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="text-slate-500 font-bold">
                  Correos registrados
                </p>
                <h2 className="text-3xl font-black text-blue-600 mt-2">
                  {stats.customersWithEmail}
                </h2>
              </article>

              <article className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="text-slate-500 font-bold">Reservas totales</p>
                <h2 className="text-3xl font-black text-orange-600 mt-2">
                  {stats.totalBookings}
                </h2>
              </article>

              <article className="bg-brand-dark rounded-2xl border border-brand-dark p-5">
                <p className="text-white/70 font-bold">Total registrado</p>
                <h2 className="text-3xl font-black text-brand-gold mt-2">
                  {formatMoney(stats.totalSpent)}
                </h2>
              </article>
            </div>

            {/* Buscador */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 mt-8">
              <label className="block text-xs font-black tracking-widest text-brand-navy mb-2">
                BUSCAR CLIENTE
              </label>

              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por nombre, celular, correo o documento..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-brand-gold"
              />

              <p className="text-sm text-slate-500 mt-3">
                Mostrando {filteredCustomers.length} de {customers.length}{" "}
                cliente(s).
              </p>
            </div>

            {/* Sin clientes */}
            {customers.length === 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 mt-8 text-center">
                <h2 className="text-2xl font-black text-brand-dark">
                  Aún no hay clientes registrados
                </h2>

                <p className="text-slate-500 mt-2">
                  Los clientes aparecerán cuando se registren reservas o
                  solicitudes desde la web.
                </p>
              </div>
            )}

            {/* Sin resultados */}
            {customers.length > 0 && filteredCustomers.length === 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 mt-8 text-center">
                <h2 className="text-2xl font-black text-brand-dark">
                  No se encontraron clientes
                </h2>

                <p className="text-slate-500 mt-2">
                  Prueba buscando por otro nombre, celular, correo o documento.
                </p>
              </div>
            )}

            {/* Tabla */}
            {filteredCustomers.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden mt-8">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-2xl font-black text-brand-dark">
                    Lista de clientes
                  </h2>

                  <p className="text-slate-500 text-sm mt-1">
                    Huéspedes registrados en el sistema.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="text-left px-5 py-4">Cliente</th>
                        <th className="text-left px-5 py-4">Contacto</th>
                        <th className="text-left px-5 py-4">Documento</th>
                        <th className="text-left px-5 py-4">Reservas</th>
                        <th className="text-left px-5 py-4">Total</th>
                        <th className="text-left px-5 py-4">
                          Última reserva
                        </th>
                        <th className="text-left px-5 py-4">Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredCustomers.map((customer) => {
                        const whatsappLink = buildWhatsappLink(customer);

                        return (
                          <tr
                            key={customer.id}
                            className="border-t border-slate-100 hover:bg-slate-50 transition"
                          >
                            <td className="px-5 py-4">
                              <p className="font-black text-brand-dark">
                                {customer.full_name || "Cliente sin nombre"}
                              </p>

                              <p className="text-xs text-slate-500 mt-1">
                                Cliente #{customer.id}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-bold text-slate-700">
                                {customer.phone || "Sin teléfono"}
                              </p>

                              <p className="text-xs text-slate-500 mt-1">
                                {customer.email || "Sin correo"}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-bold text-slate-700">
                                {customer.document_number || "-"}
                              </p>

                              <p className="text-xs text-slate-500 mt-1">
                                {customer.document_type || "Documento"}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-3 py-1 font-black">
                                {Number(customer.total_bookings || 0)}
                              </span>
                            </td>

                            <td className="px-5 py-4 font-black text-brand-dark">
                              {formatMoney(customer.total_spent)}
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              {formatDate(customer.last_booking_date)}
                            </td>

                            <td className="px-5 py-4">
                              {whatsappLink ? (
                                <a
                                  href={whatsappLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center justify-center bg-green-600 text-white px-4 py-2 rounded-full font-black hover:bg-green-700 transition"
                                >
                                  WhatsApp
                                </a>
                              ) : (
                                <span className="text-slate-400 font-bold">
                                  Sin teléfono
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}