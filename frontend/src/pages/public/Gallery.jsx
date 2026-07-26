import { useEffect, useState } from "react";

import SocialDock from "../../components/SocialDock";

import fechaImportante1 from "../../assets/fechas_importantes/fecha_importante_1.mp4";
import fechaImportante2 from "../../assets/fechas_importantes/fecha_importante_2.mp4";

import "./Gallery.css";

// =========================================================
// ARCHIVOS MULTIMEDIA DE LA GALERÍA GENERAL
// =========================================================
// Las fotografías generales deben guardarse únicamente en:
//
// frontend/src/assets/gallery/fotos/
//
// Los videos generales continúan en:
//
// frontend/src/assets/gallery/
//
// Los videos de FECHAS IMPORTANTES no deben colocarse aquí.
// Deben guardarse en:
//
// frontend/src/assets/fechas_importantes/
//
// Los videos de la sección CONOZCA MÁS SOBRE CASA HUÉSPEDES
// deben guardarse en:
//
// frontend/src/assets/gallery/conoce_mas/

const imageModules = import.meta.glob(
  "../../assets/gallery/fotos/*.{jpg,jpeg,png,webp}",
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

// Carga automáticamente todos los videos guardados en la carpeta conoce_mas.
const moreAboutVideoModules = import.meta.glob(
  "../../assets/gallery/conoce_mas/*.{mp4,webm,ogg}",
  {
    eager: true,
    import: "default",
  }
);

// Convierte nombres como habitacion_matrimonial.jpg
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

// Ordena los archivos alfabéticamente.
function sortMediaEntries(entries) {
  return entries.sort(([firstPath], [secondPath]) =>
    firstPath.localeCompare(secondPath, "es", {
      numeric: true,
      sensitivity: "base",
    })
  );
}


// Muestra una vista previa propia de cada video.
// Al cargar los metadatos, avanza a un punto corto del video
// para evitar que todos aparezcan con una portada repetida o en negro.
function VideoPreview({ src, title, type }) {
  function showVideoPreview(event) {
    const videoElement = event.currentTarget;

    if (
      Number.isFinite(videoElement.duration) &&
      videoElement.duration > 0
    ) {
      const previewSecond = Math.min(
        1.5,
        Math.max(0.2, videoElement.duration * 0.08)
      );

      videoElement.currentTime = previewSecond;
      videoElement.pause();
    }
  }

  return (
    <video
      controls
      playsInline
      preload="metadata"
      onLoadedMetadata={showVideoPreview}
      aria-label={`Video: ${title}`}
    >
      <source
        src={src}
        {...(type ? { type } : {})}
      />

      Tu navegador no puede reproducir este video.
    </video>
  );
}

// =========================================================
// FOTOGRAFÍAS GENERALES
// =========================================================
const galleryImages = sortMediaEntries(Object.entries(imageModules)).map(
  ([path, src], index) => ({
    id: `image-${index}`,
    src,
    title: createMediaTitle(path),
    type: "image",
  })
);

// =========================================================
// VIDEOS GENERALES
// =========================================================
const galleryVideos = sortMediaEntries(Object.entries(videoModules)).map(
  ([path, src], index) => ({
    id: `video-${index}`,
    src,
    title: createMediaTitle(path),
    type: "video",
  })
);

// =========================================================
// VIDEOS: CONOZCA MÁS SOBRE CASA HUÉSPEDES
// =========================================================
const moreAboutVideos = sortMediaEntries(
  Object.entries(moreAboutVideoModules)
).map(([path, src], index) => ({
  id: `conoce-mas-${index}`,
  src,
  title: createMediaTitle(path),
  type: "video",
}));

// =========================================================
// VIDEOS IMPORTADOS MANUALMENTE
// FECHAS IMPORTANTES
// =========================================================
const importantVideos = [
  {
    id: "fecha-importante-1",
    src: fechaImportante1,
    title: "Media Maratón de Pimentel",
  },
  {
    id: "fecha-importante-2",
    src: fechaImportante2,
    title: "Navidad en Casa Huéspedes Pimentel",
  },
];

export default function Gallery() {
  const [selectedImage, setSelectedImage] = useState(null);

  const heroVideo = galleryVideos[0] ?? null;
  const heroImage = galleryImages[0] ?? null;

  const totalMedia =
    galleryImages.length + galleryVideos.length;

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

            Tu navegador no puede reproducir este video.
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

          <h1>Galería de fotos y videos</h1>

          <p className="gallery-hero-description">
            Recorre nuestros ambientes, habitaciones y espacios
            antes de realizar tu reserva.
          </p>

          <div className="gallery-hero-actions">
            {galleryVideos.length > 0 && (
              <a
                href="#videos"
                className="gallery-primary-button"
              >
                Ver videos
              </a>
            )}

            {galleryImages.length > 0 && (
              <a
                href="#fotos"
                className="gallery-secondary-button"
              >
                Ver fotografías
              </a>
            )}

            <a
              href="#fechas-importantes"
              className="gallery-secondary-button"
            >
              Fechas importantes
            </a>

            <a
              href="#conoce-mas"
              className="gallery-secondary-button"
            >
              Conoce más
            </a>
          </div>

          <div className="gallery-hero-summary">
            <div>
              <strong>{galleryVideos.length}</strong>

              <span>
                {galleryVideos.length === 1
                  ? "video"
                  : "videos"}
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
          href={
            galleryVideos.length > 0
              ? "#videos"
              : galleryImages.length > 0
                ? "#fotos"
                : "#fechas-importantes"
          }
          className="gallery-scroll-indicator"
          aria-label="Bajar al contenido de la galería"
        >
          <span>Explorar</span>

          <span className="gallery-scroll-arrow">
            ↓
          </span>
        </a>
      </section>

      {/* ===================================================
          ESTADO VACÍO DE LA GALERÍA GENERAL
      =================================================== */}
      {totalMedia === 0 && (
        <section
          id="galeria"
          className="gallery-section"
        >
          <div className="gallery-empty">
            <div
              className="gallery-empty-icon"
              aria-hidden="true"
            >
              ▣
            </div>

            <h2>
              Aún no hay fotografías ni videos generales
            </h2>

            <p>
              Guarda los archivos generales dentro de:
            </p>

            <code>
              frontend/src/assets/gallery/fotos/
            </code>

            <small>
              Puedes usar imágenes JPG, JPEG, PNG y WEBP, o
              videos MP4, WEBM y OGG.
            </small>
          </div>
        </section>
      )}

      {/* ===================================================
          VIDEOS GENERALES
      =================================================== */}
      {galleryVideos.length > 0 && (
        <section
          id="videos"
          className="gallery-video-section"
        >
          <div className="gallery-section-header gallery-video-header">
            <div>
              <p className="gallery-eyebrow">
                Experiencias en movimiento
              </p>

              <h2>
                Opiniones de nuestros huéspedes
              </h2>

              <p>
                Reproduce los videos para conocer las
                experiencias en Casa Huéspedes Pimentel.
              </p>
            </div>

            <div className="gallery-counter gallery-counter-dark">
              <strong>
                {galleryVideos.length}
              </strong>

              <span>
                {galleryVideos.length === 1
                  ? "video"
                  : "videos"}
              </span>
            </div>
          </div>

          <div className="gallery-video-grid">
            {galleryVideos.map((video, index) => (
              <article
                key={video.id}
                className={`gallery-video-card ${
                  index === 0
                    ? "gallery-video-card-featured"
                    : ""
                }`}
              >
                <div className="gallery-video-frame">
                  <VideoPreview
                    src={video.src}
                    title={video.title}
                  />
                </div>

                <div className="gallery-video-information">
                  <div>
                    <span>
                      Casa Huéspedes Pimentel
                    </span>

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
          FOTOGRAFÍAS GENERALES
      =================================================== */}
      {galleryImages.length > 0 && (
        <section
          id="fotos"
          className="gallery-section"
        >
          <div className="gallery-section-header">
            <div>
              <p className="gallery-eyebrow">
                Nuestros espacios
              </p>

              <h2>
                Detalles de Casa Huéspedes
              </h2>

              <p>
                Selecciona una fotografía para verla en
                tamaño completo.
              </p>
            </div>

            <div className="gallery-counter">
              <strong>
                {galleryImages.length}
              </strong>

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
                  index === 0
                    ? "gallery-card-featured"
                    : ""
                }`}
                onClick={() => setSelectedImage(image)}
                aria-label={`Abrir fotografía: ${image.title}`}
              >
                <img
                  src={image.src}
                  alt={image.title}
                  loading="lazy"
                />

                <div className="gallery-card-overlay">
                  <div>
                    <strong>
                      {image.title}
                    </strong>

                    <span>
                      Ver fotografía
                    </span>
                  </div>

                  <div
                    className="gallery-card-icon"
                    aria-hidden="true"
                  >
                    ↗
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ===================================================
          FECHAS IMPORTANTES
          VIDEOS IMPORTADOS MANUALMENTE
      =================================================== */}
      <section
        id="fechas-importantes"
        className="gallery-video-section"
      >
        <div className="gallery-section-header gallery-video-header">
          <div>
            <p className="gallery-eyebrow">
              Información para nuestros huéspedes
            </p>

            <h2>
              FECHAS IMPORTANTES
            </h2>

            <p>
              Revisa nuestros anuncios, actividades y fechas
              especiales.
            </p>
          </div>

          <div className="gallery-counter gallery-counter-dark">
            <strong>
              {importantVideos.length}
            </strong>

            <span>
              {importantVideos.length === 1
                ? "video"
                : "videos"}
            </span>
          </div>
        </div>

        <div className="gallery-video-grid">
          {importantVideos.map((video, index) => (
            <article
              key={video.id}
              className="gallery-video-card"
            >
              <div className="gallery-video-frame">
                <VideoPreview
                  src={video.src}
                  title={video.title}
                  type="video/mp4"
                />
              </div>

              <div className="gallery-video-information">
                <div>
                  <span>
                    Casa Huéspedes Pimentel
                  </span>

                  <h3>
                    {video.title}
                  </h3>
                </div>

                <span className="gallery-video-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ===================================================
          CONOZCA MÁS SOBRE CASA HUÉSPEDES
          VIDEOS CARGADOS AUTOMÁTICAMENTE DESDE:
          frontend/src/assets/gallery/conoce_mas/
      =================================================== */}
      <section
        id="conoce-mas"
        className="gallery-video-section"
      >
        <div className="gallery-section-header gallery-video-header">
          <div>
            <p className="gallery-eyebrow">
              Nuestra historia y experiencia
            </p>

            <h2>
              CONOZCA MÁS SOBRE CASA HUÉSPEDES
            </h2>

            <p>
              Descubre nuestros espacios, servicios y la
              experiencia que ofrecemos en Casa Huéspedes
              Pimentel.
            </p>
          </div>

          <div className="gallery-counter gallery-counter-dark">
            <strong>
              {moreAboutVideos.length}
            </strong>

            <span>
              {moreAboutVideos.length === 1
                ? "video"
                : "videos"}
            </span>
          </div>
        </div>

        {moreAboutVideos.length > 0 ? (
          <div className="gallery-video-grid">
            {moreAboutVideos.map((video, index) => (
              <article
                key={video.id}
                className={`gallery-video-card ${
                  index === 0
                    ? "gallery-video-card-featured"
                    : ""
                }`}
              >
                <div className="gallery-video-frame">
                  <VideoPreview
                    src={video.src}
                    title={video.title}
                  />
                </div>

                <div className="gallery-video-information">
                  <div>
                    <span>
                      Casa Huéspedes Pimentel
                    </span>

                    <h3>{video.title}</h3>
                  </div>

                  <span className="gallery-video-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="gallery-empty">
            <div
              className="gallery-empty-icon"
              aria-hidden="true"
            >
              ▷
            </div>

            <h3>
              Aún no hay videos en esta sección
            </h3>

            <p>
              Guarda tus videos dentro de:
            </p>

            <code>
              frontend/src/assets/gallery/conoce_mas/
            </code>

            <small>
              Puedes usar archivos MP4, WEBM u OGG.
            </small>
          </div>
        )}
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
            <img
              src={selectedImage.src}
              alt={selectedImage.title}
            />

            <p>
              {selectedImage.title}
            </p>
          </div>
        </div>
      )}

      <SocialDock />
    </main>
  );
}