import { useEffect, useState } from "react";
import api from "../../services/api.js";

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    api.get("/services")
      .then((response) => {
        if (!active) return;
        setServices(Array.isArray(response.data?.data) ? response.data.data : []);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10">
        <p className="text-brand-blue font-semibold">Servicios</p>
        <h1 className="text-4xl font-bold text-brand-dark mt-2">
          Servicios incluidos y adicionales
        </h1>
        <p className="mt-3 text-gray-600 max-w-2xl">
          Consulta los servicios publicados para Casa Huéspedes Pimentel.
          Los servicios adicionales y sus condiciones se confirman con el equipo.
        </p>
      </div>

      {loading ? (
        <p className="text-gray-600" role="status">Cargando servicios…</p>
      ) : error ? (
        <p className="text-gray-600" role="alert">
          No pudimos consultar los servicios en este momento. Comunícate con
          nuestro equipo para confirmar la información.
        </p>
      ) : services.length === 0 ? (
        <p className="text-gray-600">
          El catálogo está siendo actualizado. Consulta con nuestro equipo los
          servicios disponibles durante tu estadía.
        </p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {services.map((service) => (
            <article
              key={service.slug || service.name}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
            >
              <h2 className="text-xl font-bold text-brand-dark">
                {service.name}
              </h2>
              <p className="mt-3 text-gray-600">{service.description}</p>
              <p className="mt-3 text-sm text-gray-500">
                {service.price_type === "included"
                  ? "Servicio gratuito"
                  : service.requires_coordination
                    ? "Previa coordinación. Tarifa y disponibilidad por confirmar."
                    : "Condiciones de uso sujetas a confirmación."}
              </p>
            </article>
          ))}
        </div>
      )}
      <p className="mt-8 text-gray-600 text-sm">
        El desayuno no está incluido en las tarifas de habitaciones.
        Para cualquier servicio adicional, confirma previamente las condiciones.
      </p>
    </div>
  );
}
