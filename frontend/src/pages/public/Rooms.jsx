import SocialDock from "../../components/SocialDock";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import CategoryCard from "../../components/CategoryCard";
import { getRoomCategories } from "../../services/roomService";

import "./Home.css";

export default function Rooms() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCategories() {
    try {
      setLoading(true);
      setError("");

      const data = await getRoomCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando categorías de habitaciones:", err);
      setError(
        "No se pudieron cargar las categorías. Inténtalo nuevamente."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  return (
    <main className="home-page">
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
            <source src="/videos/habitaciones.mp4" type="video/mp4" />
            Tu navegador no puede reproducir este video.
          </video>

          <div className="hotel-hero-overlay" />

          <div className="home-section hotel-hero-content">
            <div className="hotel-hero-text">
              <p className="hotel-hero-kicker">
                Comodidad · Descanso · Pimentel
              </p>

              <h1>Elige la categoría ideal para tu estadía.</h1>

              <p>
                Ahora nuestras habitaciones se presentan por categoría:
                matrimonial, doble, triple y familiar. La fotografía de cada
                categoría es referencial.
              </p>

              <div className="hotel-hero-actions">
                <a href="#categorias" className="hotel-btn-primary">
                  Ver categorías
                </a>

                <Link to="/#disponibilidad" className="hotel-btn-light">
                  Consultar disponibilidad
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="categorias"
        className="home-section hotel-rooms-section scroll-mt-32"
      >
        <div className="hotel-section-header">
          <div>
            <p className="hotel-eyebrow">Alojamiento</p>

            <h2 className="hotel-title">Categorías de habitaciones</h2>

            <p className="hotel-section-description mt-4">
              Consulta la capacidad, cantidad de habitaciones y tarifas
              referenciales de cada categoría. La asignación del número físico
              de habitación se realiza internamente por el hospedaje.
            </p>
          </div>
        </div>

        {loading && (
          <div className="hotel-empty-card">
            <div className="flex items-center justify-center gap-3">
              <span className="w-5 h-5 rounded-full border-2 border-[#a87545] border-t-transparent animate-spin" />
              <span>Cargando categorías...</span>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-[18px] border border-red-200 bg-red-50 p-7 text-center">
            <p className="font-bold text-red-700">{error}</p>

            <button
              type="button"
              onClick={loadCategories}
              className="mt-5 rounded-full bg-[#2b1d12] px-6 py-3 text-sm font-black text-white transition hover:bg-[#a87545]"
            >
              Intentar nuevamente
            </button>
          </div>
        )}

        {!loading && !error && categories.length === 0 && (
          <div className="hotel-empty-card">
            No hay categorías disponibles por el momento.
          </div>
        )}

        {!loading && !error && categories.length > 0 && (
          <div className="grid gap-7 lg:grid-cols-2">
            {categories.map((category) => (
              <CategoryCard key={category.slug} category={category} />
            ))}
          </div>
        )}

        {!loading && !error && categories.length > 0 && (
          <div className="mt-14 rounded-[26px] border border-[#eadfce] bg-white p-7 shadow-[0_18px_45px_rgba(43,29,18,0.08)] md:p-9">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <p className="hotel-eyebrow">¿Necesitas ayuda?</p>

                <h3 className="hotel-title mt-2 text-3xl md:text-4xl">
                  Te ayudamos a elegir la categoría adecuada
                </h3>

                <p className="mt-3 max-w-2xl leading-relaxed text-[#6f6258]">
                  Indícanos tus fechas y número de huéspedes. Te confirmaremos
                  la disponibilidad de la categoría que mejor se adapte a tu
                  estadía.
                </p>
              </div>

              <a
                href="https://wa.me/51901551287?text=Hola,%20quiero%20consultar%20disponibilidad%20por%20categoría%20en%20Casa%20Huéspedes%20Pimentel"
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-full bg-gradient-to-r from-[#a87545] to-[#7b4a1f] px-7 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-1"
              >
                Consultar disponibilidad
              </a>
            </div>
          </div>
        )}
      </section>

      <SocialDock />
    </main>
  );
}
