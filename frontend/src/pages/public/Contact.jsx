import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Waves,
} from "lucide-react";
import ScrollReveal from "../../components/ScrollReveal";
import TiltSurface from "../../components/TiltSurface";
import "./Contact.css";

export default function Contact() {
  return (
    <main className="future-contact-page">
      <section className="future-contact-hero">
        <div className="future-contact-hero-glow" />
        <div className="future-contact-shell">
          <ScrollReveal className="future-contact-copy">
            <p>Contacto directo</p>
            <h1>
              Hablemos de tu
              <span>próxima estadía.</span>
            </h1>
            <p className="future-contact-lead">
              Escríbenos para consultar disponibilidad, coordinar tu llegada o
              resolver cualquier duda antes de visitar Pimentel.
            </p>

            <div className="future-contact-actions">
              <a
                href="https://wa.me/51901551287?text=Hola,%20quiero%20consultar%20disponibilidad%20en%20Casa%20Huéspedes%20Pimentel"
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
                <ArrowUpRight size={17} />
              </a>

              <Link to="/habitaciones">
                Ver habitaciones
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={140}>
            <TiltSurface className="future-contact-orbit" maxTilt={3.5}>
              <div className="future-contact-orbit-core">
                <MessageCircle size={28} />
                <small>Atención directa</small>
                <strong>Estamos para ayudarte</strong>
                <span>Casa Huéspedes Pimentel</span>
              </div>
            </TiltSurface>
          </ScrollReveal>
        </div>
      </section>

      <section className="future-contact-info">
        <div className="future-contact-info-shell">
          {[
            {
              icon: Phone,
              title: "Teléfono",
              value: "+51 901 551 287",
              href: "tel:+51901551287",
            },
            {
              icon: Mail,
              title: "Correo",
              value: "casadehuespedespimentel2023@gmail.com",
              href: "mailto:casadehuespedespimentel2023@gmail.com",
            },
            {
              icon: MapPin,
              title: "Dirección",
              value: "Calle José Quiñones 237 — Pimentel",
              href: "https://www.google.com/maps/search/?api=1&query=-6.836223132813942,-79.93713663068512",
            },
            {
              icon: Clock3,
              title: "Atención",
              value: "24 horas",
              href: null,
            },
          ].map((item, index) => {
            const Icon = item.icon;
            const body = (
              <>
                <span><Icon size={22} /></span>
                <div>
                  <small>{item.title}</small>
                  <strong>{item.value}</strong>
                </div>
                {item.href && <ArrowUpRight size={16} />}
              </>
            );

            return (
              <ScrollReveal key={item.title} delay={index * 70}>
                {item.href ? (
                  <a
                    className="future-contact-info-card"
                    href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                  >
                    {body}
                  </a>
                ) : (
                  <div className="future-contact-info-card">{body}</div>
                )}
              </ScrollReveal>
            );
          })}
        </div>
      </section>

      <section className="future-contact-destination">
        <div className="future-contact-destination-shell">
          <ScrollReveal>
            <div className="future-contact-destination-card">
              <div>
                <p>Tu viaje empieza aquí</p>
                <h2>Pimentel te espera.</h2>
                <span>
                  Mar, descanso, gastronomía y una estadía tranquila en el norte
                  del Perú.
                </span>
              </div>

              <div className="future-contact-destination-actions">
                <Link to="/turismo">
                  <Waves size={17} />
                  Conoce Pimentel
                </Link>
                <Link to="/habitaciones">
                  Reservar
                  <ArrowUpRight size={17} />
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
