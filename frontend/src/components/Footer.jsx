import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Clock3,
  Mail,
  MapPin,
  Phone,
  Waves,
} from "lucide-react";
import "./Footer.css";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="future-footer">
      <div className="future-footer-glow future-footer-glow-one" />
      <div className="future-footer-glow future-footer-glow-two" />

      <div className="future-footer-shell">
        <div className="future-footer-top">
          <div className="future-footer-brand">
            <Link to="/#inicio" className="future-footer-logo-link">
              <img
                src="/img/brand/logo-casa-huespedes.png"
                alt="Casa Huéspedes Pimentel"
              />
            </Link>

            <p className="future-footer-kicker">Pimentel · Lambayeque · Perú</p>

            <h2>
              Más que una estadía,
              <span>una experiencia junto al mar.</span>
            </h2>

            <p className="future-footer-description">
              Habitaciones cómodas, atención cercana y una ubicación ideal para
              descubrir Pimentel con calma.
            </p>

            <div className="future-footer-actions">
              <Link to="/habitaciones">
                Ver habitaciones
                <ArrowUpRight size={16} />
              </Link>

              <a
                href="https://wa.me/51901551287?text=Hola,%20quiero%20consultar%20disponibilidad%20en%20Casa%20Huéspedes%20Pimentel"
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
                <ArrowUpRight size={16} />
              </a>
            </div>
          </div>

          <div className="future-footer-side">
            <div className="future-footer-contact-card">
              <div className="future-footer-contact-icon">
                <MapPin size={20} />
              </div>
              <div>
                <span>Ubicación</span>
                <strong>Calle José Quiñones 237</strong>
                <small>Pimentel, Lambayeque</small>
              </div>
            </div>

            <div className="future-footer-contact-grid">
              <a href="tel:+51901551287">
                <Phone size={18} />
                <span>
                  <small>Teléfono</small>
                  <strong>+51 901 551 287</strong>
                </span>
              </a>

              <a href="mailto:casadehuespedespimentel2023@gmail.com">
                <Mail size={18} />
                <span>
                  <small>Correo</small>
                  <strong>Escríbenos</strong>
                </span>
              </a>

              <div>
                <Clock3 size={18} />
                <span>
                  <small>Atención</small>
                  <strong>24 horas</strong>
                </span>
              </div>

              <div>
                <Waves size={18} />
                <span>
                  <small>Destino</small>
                  <strong>Pimentel</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="future-footer-nav">
          <div>
            <span>Navegación</span>
            <Link to="/#inicio">Inicio</Link>
            <Link to="/habitaciones">Habitaciones</Link>
            <Link to="/galeria">Galería</Link>
            <Link to="/contacto">Contacto</Link>
          </div>

          <div>
            <span>Experiencia</span>
            <Link to="/turismo#inicio-turismo">Conoce Pimentel</Link>
            <Link to="/#como-llegar">Cómo llegar</Link>
            <Link to="/habitaciones">Reservar</Link>
          </div>

          <div>
            <span>Legal</span>
            <Link to="/politica-privacidad">Privacidad</Link>
            <Link to="/terminos-y-condiciones">Términos</Link>
            <Link to="/eliminacion-datos">Eliminación de datos</Link>
          </div>
        </div>

        <div className="future-footer-wordmark" aria-hidden="true">
          PIMENTEL
        </div>

        <div className="future-footer-bottom">
          <p>© {year} Casa Huéspedes Pimentel.</p>

          <p>Confort · mar · experiencias · Pimentel</p>

          <Link to="/admin/login">Acceso interno</Link>
        </div>
      </div>
    </footer>
  );
}
