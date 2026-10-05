import { Link } from "react-router-dom";
import { ArrowUpRight, BedDouble, Users } from "lucide-react";
import TiltSurface from "./TiltSurface";
import "./CategoryCard.css";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=85";

export default function CategoryCard({ category, index = 0, bookingQuery = "" }) {
  const quantity = Number(
    category.total_quantity ?? category.mapped_quantity ?? 0
  );
  const capacity = Number(category.capacity ?? 1);
  const imageUrl = category.image_url || FALLBACK_IMAGE;

  return (
    <TiltSurface className="category-card category-card-future" maxTilt={4.5}>
      <article className="category-card-inner">
        <div
          className="category-card-image"
          style={{ backgroundImage: `url("${imageUrl}")` }}
          aria-hidden="true"
        />
        <div className="category-card-overlay" />
        <div className="category-card-glow" aria-hidden="true" />
        <div className="category-card-scanline" aria-hidden="true" />

        <div className="category-card-content">
          <div className="category-card-top">
            <span className="category-card-kicker">
              {String(index + 1).padStart(2, "0")} · Categoría
            </span>
            <span className="category-card-stock">
              {quantity} {quantity === 1 ? "habitación" : "habitaciones"}
            </span>
          </div>

          <div className="category-card-main">
            <div className="category-card-capacity">
              <span>
                <Users size={14} />
                Hasta {capacity} {capacity === 1 ? "persona" : "personas"}
              </span>
            </div>

            <h3>{category.name}</h3>

            <p>{category.description}</p>

            <div className="category-card-bed">
              <BedDouble size={15} />
              <span>{category.bed_description || "Distribución cómoda"}</span>
            </div>

            <div className="category-card-bottom">
              <span className="category-card-note">
                Imagen referencial de esta categoría
              </span>

              <Link
                className="category-card-action"
                to={`/habitaciones/${encodeURIComponent(category.slug)}${bookingQuery ? `?${bookingQuery}` : ""}`}
                aria-label={`Ver habitación ${category.name}`}
              >
                <span>Ver habitación</span>
                <span className="category-card-action-icon" aria-hidden="true">
                  <ArrowUpRight size={17} />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </article>
    </TiltSurface>
  );
}
