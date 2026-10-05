import { useState } from "react";
import "./InteractiveGallery.css";

// Adaptación ligera del patrón “Image Collage” de Vengeance UI (MIT).
// Está reimplementada con React + CSS para mantener el stack actual sin añadir framer-motion.
export default function InteractiveGallery({ images = [] }) {
  const [organized, setOrganized] = useState(false);
  const visibleImages = images.slice(0, 4);

  return (
    <div className={`experience-collage ${organized ? "is-organized" : ""}`}>
      <div className="experience-collage-toolbar">
        <div>
          <span className="experience-collage-kicker">Vista interactiva</span>
          <p>Explora algunos rincones de Casa Huéspedes Pimentel.</p>
        </div>

        <button
          type="button"
          className="experience-collage-toggle"
          aria-pressed={organized}
          onClick={() => setOrganized((current) => !current)}
        >
          <span>
            {organized ? "Volver a composición" : "Ordenar fotos"}
          </span>
          <span className="experience-collage-toggle-icon" aria-hidden="true">
            {organized ? "✦" : "↗"}
          </span>
        </button>
      </div>

      <div
        className="experience-collage-stage"
        role="group"
        aria-label="Galería interactiva de Casa Huéspedes Pimentel"
      >
        {visibleImages.map((image, index) => (
          <figure
            key={image.src}
            className={`experience-collage-card experience-collage-card-${index + 1}`}
          >
            <img src={image.src} alt={image.alt} loading="lazy" />
            <span className="experience-collage-index" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
          </figure>
        ))}
      </div>

      <p className="experience-collage-hint">
        {organized
          ? "Las imágenes están alineadas para compararlas mejor."
          : "Pulsa “Ordenar fotos” para cambiar la composición."}
      </p>
    </div>
  );
}
