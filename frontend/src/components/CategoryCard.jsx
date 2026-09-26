import "./CategoryCard.css";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=85";

function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "Consultar";
  return `S/ ${number.toFixed(0)}`;
}

export default function CategoryCard({ category }) {
  const quantity = Number(
    category.total_quantity ?? category.mapped_quantity ?? 0
  );
  const capacity = Number(category.capacity ?? 1);
  const imageUrl = category.image_url || FALLBACK_IMAGE;
  const whatsappText = encodeURIComponent(
    `Hola, quisiera consultar disponibilidad para una habitación ${category.name} en Casa Huéspedes Pimentel.`
  );

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

          <div className="category-card-price">
            <strong>{formatPrice(category.price_per_night)}</strong>
            <span>por noche</span>
          </div>

          <p className="category-card-note">
            Imagen referencial de una habitación de esta categoría.
          </p>

          <a
            className="category-card-action"
            href={`https://wa.me/51901551287?text=${whatsappText}`}
            target="_blank"
            rel="noreferrer"
          >
            Consultar disponibilidad
          </a>
        </div>
      </div>
    </article>
  );
}
