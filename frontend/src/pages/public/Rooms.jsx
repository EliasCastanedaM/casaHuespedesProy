import SocialDock from "../../components/SocialDock";

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  BedDouble,
  CalendarDays,
  ChevronDown,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react";

import CategoryCard from "../../components/CategoryCard";
import ScrollReveal from "../../components/ScrollReveal";
import { getRoomCategories } from "../../services/roomService";

import "./Home.css";
import "./FuturisticRooms.css";

export default function Rooms() {
  const [searchParams] = useSearchParams();
  const bookingQuery = searchParams.toString();
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
    <main className="home-page future-rooms-page">
      <section className="future-rooms-hero">
        <video
          className="future-rooms-video"
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

        <div className="future-rooms-overlay" />
        <div className="future-rooms-grid-lines" aria-hidden="true" />

        <div className="future-rooms-shell">
          <ScrollReveal className="future-rooms-copy">
            <div className="future-rooms-badge">
              <Sparkles size={14} />
              Comodidad · descanso · Pimentel
            </div>

            <p className="future-rooms-kicker">Casa Huéspedes Pimentel</p>

            <h1>
              Elige la categoría
              <span>ideal para tu estadía.</span>
            </h1>

            <p className="future-rooms-description">
              Habitaciones organizadas por categoría para que elijas con
              claridad. Consulta tus fechas y conoce el precio disponible antes
              de reservar.
            </p>

            <div className="future-rooms-actions">
              <a href="#categorias" className="future-rooms-primary">
                Ver categorías
                <span><ArrowUpRight size={16} /></span>
              </a>

              <Link to="/#como-llegar" className="future-rooms-secondary">
                <MapPin size={16} />
                Cómo llegar
              </Link>
            </div>

            <div className="future-rooms-flow">
              <span><strong>01</strong> Elige categoría</span>
              <span><strong>02</strong> Consulta fechas</span>
              <span><strong>03</strong> Confirma precio</span>
            </div>
          </ScrollReveal>

          <ScrollReveal className="future-rooms-orbit" delay={150}>
            <div className="future-rooms-orbit-ring future-rooms-orbit-ring-one" />
            <div className="future-rooms-orbit-ring future-rooms-orbit-ring-two" />

            <div className="future-rooms-orbit-card">
              <span className="future-rooms-orbit-icon">
                <BedDouble size={26} />
              </span>
              <small>Categorías disponibles</small>
              <strong>{loading ? "..." : categories.length}</strong>
              <p>La habitación física se asigna internamente.</p>
            </div>

            <div className="future-rooms-floating-chip future-rooms-chip-one">
              <Users size={14} />
              Según tu grupo
            </div>

            <div className="future-rooms-floating-chip future-rooms-chip-two">
              <CalendarDays size={14} />
              Según tus fechas
            </div>
          </ScrollReveal>
        </div>

        <a
          href="#categorias"
          className="future-rooms-scroll"
          aria-label="Bajar a categorías"
        >
          <span>Explorar</span>
          <span><ChevronDown size={17} /></span>
        </a>
      </section>

      <section id="categorias" className="future-rooms-catalog scroll-mt-32">
        <div className="future-rooms-catalog-shell">
          <ScrollReveal className="future-rooms-catalog-heading">
            <div>
              <p>Alojamiento</p>
              <h2>Categorías de habitaciones</h2>
            </div>

            <p>
              Conoce su capacidad y cantidad de habitaciones. El precio se
              mostrará después de consultar disponibilidad para tus fechas.
            </p>
          </ScrollReveal>

          {loading && (
            <div className="future-rooms-loading">
              <span />
              Cargando categorías...
            </div>
          )}

          {!loading && error && (
            <div className="future-rooms-error">
              <p>{error}</p>
              <button type="button" onClick={loadCategories}>
                Intentar nuevamente
              </button>
            </div>
          )}

          {!loading && !error && categories.length === 0 && (
            <div className="future-rooms-empty">
              No hay categorías disponibles por el momento.
            </div>
          )}

          {!loading && !error && categories.length > 0 && (
            <div className="future-rooms-grid">
              {categories.map((category, index) => (
                <ScrollReveal key={category.slug} delay={index * 70}>
                  <CategoryCard
                    category={category}
                    index={index}
                    bookingQuery={bookingQuery}
                  />
                </ScrollReveal>
              ))}
            </div>
          )}

          {!loading && !error && categories.length > 0 && (
            <ScrollReveal className="future-rooms-help" delay={120}>
              <div>
                <p>¿Necesitas ayuda?</p>
                <h3>Encuentra la categoría correcta sin complicarte.</h3>
                <span>
                  Revisa cada categoría, selecciona tus fechas y confirma la
                  disponibilidad real antes de reservar.
                </span>
              </div>

              <a href="#categorias">
                Explorar categorías
                <ArrowUpRight size={17} />
              </a>
            </ScrollReveal>
          )}
        </div>
      </section>

      <SocialDock />
    </main>
  );
}
