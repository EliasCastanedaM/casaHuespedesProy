import { useState } from "react";
import { Link } from "react-router-dom";

import SocialDock from "../../components/SocialDock";

import "./Gallery.css";

// Obtiene automáticamente todas las imágenes de la carpeta gallery
const imageModules = import.meta.glob(
  "../../assets/gallery/*.{jpg,jpeg,png,webp}",
  {
    eager: true,
    import: "default",
  }
);

function createImageTitle(path) {
  const fileName = path
    .split("/")
    .pop()
    .replace(/\.[^.]+$/, "");

  return fileName
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const galleryImages = Object.entries(imageModules)
  .sort(([firstPath], [secondPath]) =>
    firstPath.localeCompare(secondPath, "es", {
      numeric: true,
    })
  )
  .map(([path, src], index) => ({
    id: `${path}-${index}`,
    src,
    title: createImageTitle(path),
  }));

export default function Gallery() {
  const [selectedImage, setSelectedImage] = useState(null);

  return (
    <main className="gallery-page">
      {/* HERO */}
      <section className="gallery-hero">
        {galleryImages.length > 0 && (
          <img
            src={galleryImages[0].src}
            alt=""
            className="gallery-hero-background"
            aria-hidden="true"
          />
        )}

        <div className="gallery-hero-overlay" />

        <div className="gallery-hero-content">
          <p className="gallery-hero-kicker">
            Casa Huéspedes Pimentel
          </p>

          <h1>Nuestra galería</h1>

          <p className="gallery-hero-description">
            Conoce nuestros ambientes, habitaciones y espacios antes de
            realizar tu reserva.
          </p>

          <div className="gallery-hero-actions">
            <a
              href="#fotos"
              className="gallery-primary-button"
            >
              Ver fotografías
            </a>

            <Link
              to="/#disponibilidad"
              className="gallery-secondary-button"
            >
              Consultar disponibilidad
            </Link>
          </div>
        </div>
      </section>

      {/* LISTADO DE FOTOS */}
      <section
        id="fotos"
        className="gallery-section"
      >
        <div className="gallery-section-header">
          <div>
            <p className="gallery-eyebrow">
              Nuestros espacios
            </p>

            <h2>Conoce Casa Huéspedes</h2>

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

        {/* Si todavía no hay imágenes */}
        {galleryImages.length === 0 && (
          <div className="gallery-empty">
            <div className="gallery-empty-icon">
              📷
            </div>

            <h3>Aún no hay fotografías</h3>

            <p>
              Guarda tus imágenes dentro de:
            </p>

            <code>
              frontend/src/assets/gallery/
            </code>
          </div>
        )}

        {/* Cuadrícula */}
        {galleryImages.length > 0 && (
          <div className="gallery-grid">
            {galleryImages.map((image) => (
              <button
                key={image.id}
                type="button"
                className="gallery-card"
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
                    <strong>{image.title}</strong>
                    <span>Ver fotografía</span>
                  </div>

                  <div className="gallery-card-icon">
                    ↗
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* LLAMADO A RESERVAR */}
      <section className="gallery-cta-wrapper">
        <div className="gallery-cta">
          <div>
            <p className="gallery-eyebrow">
              Reserva online
            </p>

            <h2>¿Encontraste la habitación ideal?</h2>

            <p>
              Consulta las fechas disponibles o comunícate directamente con
              el hospedaje.
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

      {/* VISOR DE IMAGEN */}
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

            <p>{selectedImage.title}</p>
          </div>
        </div>
      )}

      <SocialDock />
    </main>
  );
}