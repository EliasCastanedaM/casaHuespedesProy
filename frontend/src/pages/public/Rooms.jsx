import SocialDock from "../../components/SocialDock";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// Servicio para obtener habitaciones desde el backend
import { getRooms } from "../../services/roomService";

// Tarjeta visual de cada habitación
import RoomCard from "../../components/RoomCard";

// Reutilizamos los estilos del Home
import "./Home.css";

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRooms() {
    try {
      setLoading(true);
      setError("");

      const data = await getRooms();

      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando habitaciones:", err);

      setError(
        "No se pudieron cargar las habitaciones. Inténtalo nuevamente."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRooms();
  }, []);

  return (
    <main className="home-page">
      {/* HERO CON VIDEO */}
      <section className="hotel-hero">
        <div className="hotel-hero-image">
          <video
            className="hotel-hero-video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1800&auto=format&fit=crop"
            aria-hidden="true"
          >
            <source
              src="/videos/habitaciones.mp4"
              type="video/mp4"
            />

            Tu navegador no puede reproducir este video.
          </video>

          {/* Oscurecimiento del video */}
          <div className="hotel-hero-overlay" />

          {/* Contenido encima del video */}
          <div className="home-section hotel-hero-content">
            <div className="hotel-hero-text">
              <p className="hotel-hero-kicker">
                Comodidad · Descanso · Pimentel
              </p>

              <h1>Encuentra tu habitación ideal.</h1>

              <p>
                Descubre nuestras habitaciones matrimoniales, dobles, triples
                y familiares. Cada espacio está preparado para ofrecerte una
                estadía cómoda y tranquila cerca del mar.
              </p>

              <div className="hotel-hero-actions">
                <a
                  href="#habitaciones"
                  className="hotel-btn-primary"
                >
                  Ver habitaciones
                </a>

                <Link
                  to="/#disponibilidad"
                  className="hotel-btn-light"
                >
                  Consultar disponibilidad
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* BARRA FLOTANTE */}
        <div className="hotel-booking-bar">
          <div className="hotel-booking-inner">
            <div className="hotel-booking-grid">
              <div className="hotel-booking-field">
                <label>Habitaciones</label>

                <strong className="block mt-2 text-[#2b1d12]">
                  {loading ? "Cargando..." : `${rooms.length} disponibles`}
                </strong>
              </div>

              <div className="hotel-booking-field">
                <label>Tipos</label>

                <strong className="block mt-2 text-[#2b1d12]">
                  Matrimonial, doble y triple
                </strong>
              </div>

              <div className="hotel-booking-field">
                <label>Ubicación</label>

                <strong className="block mt-2 text-[#2b1d12]">
                  Cerca al mar
                </strong>
              </div>

              <Link
                to="/#disponibilidad"
                className="hotel-booking-button"
              >
                Ver disponibilidad
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* LISTADO DE HABITACIONES */}
      <section
        id="habitaciones"
        className="home-section hotel-rooms-section scroll-mt-32"
      >
        {/* Encabezado */}
        <div className="hotel-section-header">
          <div>
            <p className="hotel-eyebrow">Alojamiento</p>

            <h2 className="hotel-title">
              Habitaciones para cada viajero
            </h2>

            <p className="hotel-section-description mt-4">
              Conoce nuestras habitaciones, revisa sus fotografías, capacidad,
              características y precio por noche antes de realizar tu reserva.
            </p>
          </div>

          <Link
            to="/#disponibilidad"
            className="hotel-small-link"
          >
            Consultar disponibilidad →
          </Link>
        </div>

        {/* Cargando */}
        {loading && (
          <div className="hotel-empty-card">
            <div className="flex items-center justify-center gap-3">
              <span className="w-5 h-5 rounded-full border-2 border-[#a87545] border-t-transparent animate-spin" />

              <span>Cargando habitaciones...</span>
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-[18px] border border-red-200 bg-red-50 p-7 text-center">
            <p className="font-bold text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={loadRooms}
              className="mt-5 rounded-full bg-[#2b1d12] px-6 py-3 text-sm font-black text-white transition hover:bg-[#a87545]"
            >
              Intentar nuevamente
            </button>
          </div>
        )}

        {/* Sin habitaciones */}
        {!loading && !error && rooms.length === 0 && (
          <div className="hotel-empty-card">
            No hay habitaciones disponibles por el momento.
          </div>
        )}

        {/* Tarjetas */}
        {!loading && !error && rooms.length > 0 && (
          <div className="hotel-room-grid">
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
              />
            ))}
          </div>
        )}

        {/* Información inferior */}
        {!loading && !error && rooms.length > 0 && (
          <div className="mt-14 rounded-[26px] border border-[#eadfce] bg-white p-7 md:p-9 shadow-[0_18px_45px_rgba(43,29,18,0.08)]">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <p className="hotel-eyebrow">
                  ¿Necesitas ayuda?
                </p>

                <h3 className="hotel-title mt-2 text-3xl md:text-4xl">
                  Te ayudamos a elegir una habitación
                </h3>

                <p className="mt-3 max-w-2xl leading-relaxed text-[#6f6258]">
                  Consulta la disponibilidad y recibe orientación según la
                  cantidad de huéspedes y las fechas de tu viaje.
                </p>
              </div>

              <a
                href="https://wa.me/51901551287?text=Hola,%20quiero%20consultar%20qué%20habitación%20me%20recomiendan%20en%20Casa%20Huéspedes%20Pimentel"
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-full bg-gradient-to-r from-[#a87545] to-[#7b4a1f] px-7 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-1"
              >
                Consultar por WhatsApp
              </a>
            </div>
          </div>
        )}
      </section>
            <SocialDock />

    </main>
  );
}