import "./Home.css";
import "./Availability.css";

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchCategoryAvailability } from "../../services/bookingService";

function getLocalDateValue(date = new Date()) {
  const timezoneOffset = date.getTimezoneOffset() * 60 * 1000;

  return new Date(date.getTime() - timezoneOffset)
    .toISOString()
    .split("T")[0];
}

function calculateNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;

  const [startYear, startMonth, startDay] = checkIn.split("-").map(Number);
  const [endYear, endMonth, endDay] = checkOut.split("-").map(Number);
  const start = Date.UTC(startYear, startMonth - 1, startDay);
  const end = Date.UTC(endYear, endMonth - 1, endDay);

  return Math.max(0, (end - start) / 86_400_000);
}

function formatMoney(value) {
  return `S/ ${Number(value || 0).toFixed(0)}`;
}

export default function Availability() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get("category") || "";
  const today = getLocalDateValue();

  const [formData, setFormData] = useState({
    check_in: searchParams.get("checkIn") || "",
    check_out: searchParams.get("checkOut") || "",
    guests_count: Number(searchParams.get("guests") || 2),
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nights = useMemo(
    () => calculateNights(formData.check_in, formData.check_out),
    [formData.check_in, formData.check_out]
  );

  async function runSearch(data, updateUrl = true) {
    try {
      setLoading(true);
      setError("");

      if (!data.check_in || !data.check_out || calculateNights(data.check_in, data.check_out) < 1) {
        setError("Selecciona fechas válidas para consultar disponibilidad.");
        return;
      }

      const response = await searchCategoryAvailability({
        check_in: data.check_in,
        check_out: data.check_out,
        guests_count: Number(data.guests_count || 1),
      });

      setResult(response);

      if (updateUrl) {
        const next = new URLSearchParams();
        if (selectedCategory) next.set("category", selectedCategory);
        next.set("checkIn", data.check_in);
        next.set("checkOut", data.check_out);
        next.set("guests", String(data.guests_count || 1));
        setSearchParams(next, { replace: true });
      }
    } catch (searchError) {
      console.error("Error consultando disponibilidad:", searchError);
      setError(
        searchError.response?.data?.message ||
          searchError.message ||
          "No se pudo consultar la disponibilidad."
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (formData.check_in && formData.check_out && nights > 0) {
      runSearch(formData, false);
    }
    // Solo ejecuta la búsqueda inicial proveniente de la URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => {
      const next = {
        ...previous,
        [name]: name === "guests_count" ? Number(value) : value,
      };

      if (
        name === "check_in" &&
        previous.check_out &&
        previous.check_out <= value
      ) {
        next.check_out = "";
      }

      return next;
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    runSearch(formData);
  }

  const categories = useMemo(() => {
    const list = Array.isArray(result?.categories) ? [...result.categories] : [];

    return list.sort((a, b) => {
      if (a.slug === selectedCategory) return -1;
      if (b.slug === selectedCategory) return 1;
      return Number(b.available_quantity || 0) - Number(a.available_quantity || 0);
    });
  }, [result, selectedCategory]);

  const selectedResult = categories.find(
    (category) => category.slug === selectedCategory
  );
  const selectedUnavailable =
    selectedCategory &&
    result &&
    (!selectedResult || Number(selectedResult.available_quantity || 0) < 1);

  return (
    <main className="availability-page">
      <section className="availability-hero">
        <div className="availability-shell">
          <p className="hotel-eyebrow">Disponibilidad</p>
          <h1>Encuentra la categoría disponible para tus fechas.</h1>
          <p>
            Indica cuándo vienes y cuántas personas se hospedarán. Después de
            consultar te mostraremos las categorías disponibles, su imagen
            referencial y el precio vigente por noche.
          </p>

          <form onSubmit={handleSubmit} className="availability-search-card">
            <div>
              <label htmlFor="availability-check-in">Ingreso</label>
              <input
                id="availability-check-in"
                type="date"
                name="check_in"
                value={formData.check_in}
                onChange={handleChange}
                min={today}
                required
              />
            </div>

            <div>
              <label htmlFor="availability-check-out">Salida</label>
              <input
                id="availability-check-out"
                type="date"
                name="check_out"
                value={formData.check_out}
                onChange={handleChange}
                min={formData.check_in || today}
                required
              />
            </div>

            <div>
              <label htmlFor="availability-guests">Huéspedes</label>
              <input
                id="availability-guests"
                type="number"
                name="guests_count"
                min="1"
                max="30"
                value={formData.guests_count}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? "Consultando..." : "Consultar disponibilidad"}
            </button>
          </form>

          {error && <div className="availability-alert">{error}</div>}
        </div>
      </section>

      {result && (
        <section className="availability-shell availability-results">
          <div className="availability-results-header">
            <div>
              <p className="hotel-eyebrow">Resultados</p>
              <h2>Categorías para tu estadía</h2>
              <p>
                {result.nights} {Number(result.nights) === 1 ? "noche" : "noches"} ·{" "}
                {result.guests_count}{" "}
                {Number(result.guests_count) === 1 ? "huésped" : "huéspedes"}
              </p>
            </div>

            <Link to="/habitaciones" className="availability-secondary-link">
              Ver todas las categorías
            </Link>
          </div>

          {selectedUnavailable && (
            <div className="availability-selected-warning">
              La categoría que elegiste no tiene disponibilidad para estas
              fechas o para esta cantidad de huéspedes. Puedes elegir una de
              las alternativas disponibles.
            </div>
          )}

          {categories.length === 0 ? (
            <div className="availability-empty">
              No encontramos categorías compatibles para esas fechas y número
              de huéspedes.
            </div>
          ) : (
            <div className="availability-grid">
              {categories.map((category) => {
                const available = Number(category.available_quantity || 0);
                const isSelected = category.slug === selectedCategory;
                const price = Number(category.price_per_night || 0);
                const total = price * Number(result.nights || 0);

                return (
                  <article
                    key={category.slug}
                    className={`availability-room-card ${isSelected ? "is-selected" : ""} ${available < 1 ? "is-unavailable" : ""}`}
                  >
                    <div className="availability-room-image">
                      <img
                        src={category.image_url}
                        alt={`Habitación ${category.name} referencial`}
                      />
                      {isSelected && (
                        <span className="availability-choice-badge">
                          Tu elección
                        </span>
                      )}
                      <span className="availability-stock-badge">
                        {available > 0
                          ? `${available} ${available === 1 ? "disponible" : "disponibles"}`
                          : "Sin disponibilidad"}
                      </span>
                    </div>

                    <div className="availability-room-body">
                      <p className="availability-category-label">Categoría</p>
                      <h3>{category.name}</h3>

                      <div className="availability-room-meta">
                        <span>
                          Hasta {category.capacity}{" "}
                          {Number(category.capacity) === 1 ? "persona" : "personas"}
                        </span>
                        {category.bed_description && (
                          <span>{category.bed_description}</span>
                        )}
                      </div>

                      <p className="availability-room-description">
                        {category.description}
                      </p>

                      {available > 0 && (
                        <>
                          <div className="availability-price-box">
                            <div>
                              <span>Precio por noche</span>
                              <strong>{formatMoney(price)}</strong>
                            </div>
                            <div>
                              <span>Total por {result.nights} noche(s)</span>
                              <strong>{formatMoney(total)}</strong>
                            </div>
                          </div>

                          <p className="availability-reference-note">
                            Imagen referencial de una habitación de esta categoría.
                          </p>

                          <Link
                            className="availability-book-button"
                            to={`/reservar?category=${encodeURIComponent(
                              category.slug
                            )}&checkIn=${encodeURIComponent(
                              result.check_in
                            )}&checkOut=${encodeURIComponent(
                              result.check_out
                            )}&guests=${encodeURIComponent(
                              result.guests_count
                            )}`}
                          >
                            Reservar esta categoría
                          </Link>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
