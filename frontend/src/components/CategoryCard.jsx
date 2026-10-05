import { Link } from "react-router-dom";
import "./CategoryCard.css";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=85";

export default function CategoryCard({ category }) {
  const quantity = Number(
    category.total_quantity ?? category.mapped_quantity ?? 0
  );
  const capacity = Number(category.capacity ?? 1);
  const imageUrl = category.image_url || FALLBACK_IMAGE;

  return (
    <article
      className="category-card"
      style={{ backgroundImage: `url("${imageUrl}")` }}
    >
      <div className="category-card-overlay" />

      <div className="category-card-content">
        <div className="category-card-top">
          <span className="category-card-kicker">Categoría</span>
          <span className="category-card-stock">
            {quantity} {quantity === 1 ? "habitación" : "habitaciones"}
          </span>
        </div>

        <div className="category-card-main">
          <h3>{category.name}</h3>

          <div className="category-card-meta">
            <span>
              Hasta {capacity} {capacity === 1 ? "persona" : "personas"}
            </span>
            {category.bed_description && (
              <span>{category.bed_description}</span>
            )}
          </div>

          <p>{category.description}</p>

          <p className="category-card-note">
            Imagen referencial de una habitación de esta categoría.
          </p>

          <Link
            className="category-card-action"
            to={`/habitaciones/${encodeURIComponent(category.slug)}`}
          >
            Ver habitación
          </Link>
        </div>
      </div>
    </article>
  );
}
