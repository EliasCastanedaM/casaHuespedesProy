import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import SocialDock from "../../components/SocialDock";

import "./Gallery.css";

// =========================================================
// ARCHIVOS MULTIMEDIA
// =========================================================
// Guarda aquí tus fotografías y videos:
// frontend/src/assets/gallery/
//
// Formatos admitidos:
// Fotografías: jpg, jpeg, png y webp
// Videos: mp4, webm y ogg
//
// No necesitas importar ni escribir el nombre de cada archivo.

const imageModules = import.meta.glob(
  "../../assets/gallery/*.{jpg,jpeg,png,webp}",
  {
    eager: true,
    import: "default",
  }
);

const videoModules = import.meta.glob(
  "../../assets/gallery/*.{mp4,webm,ogg}",
  {
    eager: true,
    import: "default",
  }
);

// Convierte nombres como habitacion-matrimonial.jpg
// en títulos como Habitación Matrimonial.
function createMediaTitle(path) {
  const fileName = path
    .split("/")
    .pop()
    .replace(/\.[^.]+$/, "");

  return fileName
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sortMediaEntries(entries) {
  return entries.sort(([firstPath], [secondPath]) =>
    firstPath.localeCompare(secondPath, "es", {
      numeric: true,
      sensitivity: "base",
    })
  );
}

const galleryImages = sortMediaEntries(Object.entries(imageModules)).map(
  ([path, src], index) => ({
    id: `image-${path}-${index}`,
    src,
    title: createMediaTitle(path),
    type: "image",
  })
);

const galleryVideos = sortMediaEntries(Object.entries(videoModules)).map(
  ([path, src], index) => ({
    id: `video-${path}-${index}`,
    src,
    title: createMediaTitle(path),
    type: "video",
  })
);

export default function Gallery() {
  const [selectedImage, setSelectedImage] = useState(null);

  const heroVideo = galleryVideos[0] ?? null;
  const heroImage = galleryImages[0] ?? null;
  const totalMedia = galleryImages.length + galleryVideos.length;

  // Permite cerrar el visor de fotografías presionando Escape.
  useEffect(() => {
    function closeWithEscape(event) {
      if (event.key === "Escape") {
        setSelectedImage(null);
      }
    }

    window.addEventListener("keydown", closeWithEscape);

    return () => {
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, []);

  // Evita que la página se desplace mientras una foto está abierta.
  useEffect(() => {
    if (!selectedImage) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedImage]);

  return (
    <main className="gallery-page">
      {/* ===================================================
          PORTADA
          El primer video de assets/gallery se usa de fondo.
          Si no hay videos, se usa la primera fotografía.
      =================================================== */}
      <section className="gallery-hero">
        {heroVideo ? (
          <video
            className="gallery-hero-background"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={heroImage?.src}
            aria-hidden="true"
          >
            <source src={heroVideo.src} />
          </video>
        ) : (
          heroImage && (
            <img
              src={heroImage.src}
              alt=""
              className="gallery-hero-background"
              aria-hidden="true"
            />
          )
        )}

        <div className="gallery-hero-overlay" />

        <div className="gallery-hero-content">
          <p className="gallery-hero-kicker">
            Casa Huéspedes Pimentel
          </p>

          <h1>Nuestra galería</h1>

          <p className="gallery-hero-description">
            Recorre nuestros ambientes, habitaciones y espacios antes de
            realizar tu reserva.
          </p>

          <div className="gallery-hero-actions">
            {galleryVideos.length > 0 && (
              <a href="#videos" className="gallery-primary-button">
                Ver videos
              </a>
            )}

            <a
              href={galleryImages.length > 0 ? "#fotos" : "#galeria"}
              className="gallery-secondary-button"
            >
              Ver fotografías
            </a>

            <Link
              to="/#disponibilidad"
              className="gallery-reservation-link"
            >
              Reservar ahora
            </Link>
          </div>

          <div className="gallery-hero-summary">
            <div>
              <strong>{galleryVideos.length}</strong>
              <span>
                {galleryVideos.length === 1 ? "video" : "videos"}
              </span>
            </div>

            <div>
              <strong>{galleryImages.length}</strong>
              <span>
                {galleryImages.length === 1
                  ? "fotografía"
                  : "fotografías"}
              </span>
            </div>
          </div>
        </div>

        <a
          href={galleryVideos.length > 0 ? "#videos" : "#fotos"}
          className="gallery-scroll-indicator"
          aria-label="Bajar al contenido de la galería"
        >
          <span>Explorar</span>
          <span className="gallery-scroll-arrow">↓</span>
        </a>
      </section>

      {/* ===================================================
          ESTADO VACÍO
      =================================================== */}
      {totalMedia === 0 && (
        <section id="galeria" className="gallery-section">
          <div className="gallery-empty">
            <div className="gallery-empty-icon" aria-hidden="true">
              ▣
            </div>

            <h2>Aún no hay fotografías ni videos</h2>

            <p>Guarda tus archivos multimedia dentro de:</p>

            <code>frontend/src/assets/gallery/</code>

            <small>
              Puedes usar imágenes JPG, JPEG, PNG y WEBP, o videos MP4, WEBM y
              OGG.
            </small>
          </div>
        </section>
      )}

      {/* ===================================================
          LISTADO DE VIDEOS
      =================================================== */}
      {galleryVideos.length > 0 && (
        <section id="videos" className="gallery-video-section">
          <div className="gallery-section-header gallery-video-header">
            <div>
              <p className="gallery-eyebrow">Experiencias en movimiento</p>

              <h2>Conoce nuestros espacios</h2>

              <p>
                Reproduce los videos para recorrer Casa Huéspedes Pimentel.
              </p>
            </div>

            <div className="gallery-counter gallery-counter-dark">
              <strong>{galleryVideos.length}</strong>

              <span>
                {galleryVideos.length === 1 ? "video" : "videos"}
              </span>
            </div>
          </div>

          <div className="gallery-video-grid">
            {galleryVideos.map((video, index) => (
              <article
                key={video.id}
                className={`gallery-video-card ${
                  index === 0 ? "gallery-video-card-featured" : ""
                }`}
              >
                <div className="gallery-video-frame">
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    poster={heroImage?.src}
                    aria-label={`Video: ${video.title}`}
                  >
                    <source src={video.src} />
                    Tu navegador no puede reproducir este video.
                  </video>
                </div>

                <div className="gallery-video-information">
                  <div>
                    <span>Casa Huéspedes Pimentel</span>
                    <h3>{video.title}</h3>
                  </div>

                  <span className="gallery-video-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ===================================================
          LISTADO DE FOTOGRAFÍAS
      =================================================== */}
      {galleryImages.length > 0 && (
        <section id="fotos" className="gallery-section">
          <div className="gallery-section-header">
            <div>
              <p className="gallery-eyebrow">Nuestros espacios</p>

              <h2>Detalles de Casa Huéspedes</h2>

              <p>
                Selecciona una fotografía para verla en tamaño completo.
              </p>
            </div>

            <div className="gallery-counter">
              <strong>{galleryImages.length}</strong>

              <span>
                {galleryImages.length === 1
                  ? "fotografía"
                  : "fotografías"}
              </span>
            </div>
          </div>

          <div className="gallery-grid">
            {galleryImages.map((image, index) => (
              <button
                key={image.id}
                type="button"
                className={`gallery-card ${
                  index === 0 ? "gallery-card-featured" : ""
                }`}
                onClick={() => setSelectedImage(image)}
                aria-label={`Abrir fotografía: ${image.title}`}
              >
                <img src={image.src} alt={image.title} loading="lazy" />

                <div className="gallery-card-overlay">
                  <div>
                    <strong>{image.title}</strong>
                    <span>Ver fotografía</span>
                  </div>

                  <div className="gallery-card-icon" aria-hidden="true">
                    ↗
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ===================================================
          LLAMADO A RESERVAR
      =================================================== */}
      <section className="gallery-cta-wrapper">
        <div className="gallery-cta">
          <div>
            <p className="gallery-eyebrow">Reserva online</p>

            <h2>¿Encontraste la habitación ideal?</h2>

            <p>
              Consulta las fechas disponibles o comunícate directamente con
              Casa Huéspedes Pimentel.
            </p>
          </div>

          <div className="gallery-cta-actions">
            <Link
              to="/#disponibilidad"
              className="gallery-primary-button"
            >
              Ver disponibilidad
            </Link>

            <a
              href="https://wa.me/51901551287?text=Hola,%20quiero%20consultar%20disponibilidad%20en%20Casa%20Huéspedes%20Pimentel"
              target="_blank"
              rel="noreferrer"
              className="gallery-whatsapp-button"
            >
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ===================================================
          VISOR DE FOTOGRAFÍAS
      =================================================== */}
      {selectedImage && (
        <div
          className="gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Fotografía: ${selectedImage.title}`}
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            className="gallery-lightbox-close"
            onClick={() => setSelectedImage(null)}
            aria-label="Cerrar fotografía"
          >
            ×
          </button>

          <div
            className="gallery-lightbox-content"
            onClick={(event) => event.stopPropagation()}
          >
            <img src={selectedImage.src} alt={selectedImage.title} />

            <p>{selectedImage.title}</p>
          </div>
        </div>
      )}

      <SocialDock />
    </main>
  );
}
