import { useEffect, useRef, useState } from "react";
import "./TourismRouteCTA.css";

const POSTER_URL = "/img/home/descubre-pimentel-y-lambayeque.png";

export default function TourismGuideSection() {
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);
  const closeButton = useRef(null);
  const dialog = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
      if (event.key === "Tab") {
        const items = dialog.current?.querySelectorAll("a[href], button:not([disabled])");
        if (!items?.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", handleKeyDown);
      trigger.current?.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <>
      <section id="ruta-turistica-recomendada" className="tourism-invite scroll-mt-28" aria-labelledby="tourism-invite-title">
        <div className="tourism-invite__inner">
          <p className="tourism-invite__eyebrow">Una recomendación para nuestros huéspedes</p>
          <h2 id="tourism-invite-title" className="tourism-invite__title">Descubre Pimentel y Lambayeque</h2>
          <p className="tourism-invite__intro">
            El mar es solo el comienzo. Descubre los mejores lugares para visitar,
            saborear y explorar desde Casa Huéspedes Pimentel.
          </p>
          <button
            ref={trigger}
            type="button"
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
            className="tourism-invite__button"
          >
            <span className="tourism-invite__icon" aria-hidden="true">
              <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
                <path d="M9 3v15M15 6v15" />
                <circle cx="12" cy="10" r="1.2" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span>Ver nuestra ruta turística recomendada</span>
            <span className="tourism-invite__arrow" aria-hidden="true">↗</span>
          </button>
          <p className="tourism-invite__hint">Pulsa para descubrir el mapa ilustrado</p>
        </div>
      </section>

      {open && (
        <div
          className="tourism-photo-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tourism-photo-title"
            aria-describedby="tourism-photo-note"
            className="tourism-photo-dialog"
          >
            <header className="tourism-photo-header">
              <div>
                <p className="tourism-photo-kicker">Guía turística ilustrada</p>
                <h2 id="tourism-photo-title">Descubre Pimentel y Lambayeque</h2>
              </div>
              <div className="tourism-photo-actions">
                <a href={POSTER_URL} target="_blank" rel="noopener noreferrer" className="tourism-photo-expand">
                  Ampliar imagen <span aria-hidden="true">↗</span>
                </a>
                <button ref={closeButton} type="button" onClick={() => setOpen(false)} className="tourism-photo-close" aria-label="Cerrar imagen turística">
                  ×
                </button>
              </div>
            </header>
            <div className="tourism-photo-viewport">
              <img
                src={POSTER_URL}
                width="1536"
                height="1024"
                alt="Afiche original Descubre Pimentel y Lambayeque con su mapa turístico, gastronomía, lugares arqueológicos y naturaleza"
                className="tourism-photo-image"
                decoding="async"
              />
            </div>
            <p id="tourism-photo-note" className="tourism-photo-note">
              Mapa ilustrativo, no a escala. Las rutas y los tiempos son referenciales.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
