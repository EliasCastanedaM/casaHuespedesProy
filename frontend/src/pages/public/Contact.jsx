import { useEffect, useState } from "react";
import api from "../../services/api.js";

export default function Contact() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get("/hotel/profile")
      .then(({ data }) => {
        if (alive) setProfile(data?.data || null);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => { alive = false; };
  }, []);

  const address = profile
    ? [profile.street_address, profile.district, profile.region, profile.country].filter(Boolean).join(", ")
    : "";
  const mapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;

  return (
    <main className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-brand-dark">Contacto y ubicación</h1>
      <p className="mt-3 text-gray-600">
        Visítanos en Pimentel, Lambayeque, o escríbenos para consultar sobre tu estadía.
      </p>

      <section className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-brand-dark">¿Dónde estamos?</h2>
        {address ? (
          <>
            <p className="mt-3 text-gray-700">📍 {address}</p>
            <a
              className="mt-4 inline-flex rounded-lg bg-brand-blue px-5 py-3 text-white font-semibold hover:opacity-90"
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Buscar esta dirección en Google Maps
            </a>
          </>
        ) : (
          <p className="mt-3 text-gray-600" role={error ? "alert" : "status"}>
            {error
              ? "No pudimos consultar la ubicación ahora. Comunícate con nuestro equipo para recibir indicaciones."
              : "Consultando la dirección del hospedaje…"}
          </p>
        )}
        <p className="mt-5 text-gray-600">
          También puedes comunicarte con nuestro equipo al
          {" "}
          <a href="tel:+51901551287" className="font-semibold text-brand-blue">
            +51 901 551 287
          </a>.
        </p>
      </section>
    </main>
  );
}
