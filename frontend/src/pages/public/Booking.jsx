import "./Home.css";
import "./Booking.css";

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getRoomCategories } from "../../services/roomService";
import { createBooking } from "../../services/bookingService";

const BOOKING_DRAFT_KEY = "pimentelBookingDraft";
const PAYMENT_SESSION_KEY = "pimentelPendingPayment";

function readStoredBookingDraft(categorySlug) {
  if (!categorySlug) return null;

  try {
    const storedDraft = JSON.parse(
      sessionStorage.getItem(BOOKING_DRAFT_KEY) || "null"
    );

    if (
      storedDraft &&
      String(storedDraft.categorySlug) === String(categorySlug)
    ) {
      return storedDraft;
    }
  } catch (storageError) {
    console.warn("No se pudo leer la reserva temporal.", storageError);
  }

  return null;
}

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
  const difference = (end - start) / 86_400_000;

  return difference > 0 ? difference : 0;
}

function formatMoney(value) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

export default function Booking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categorySlug = String(searchParams.get("category") || "")
    .trim()
    .toLowerCase();
  const checkInFromUrl =
    searchParams.get("checkIn") || searchParams.get("check_in") || "";
  const checkOutFromUrl =
    searchParams.get("checkOut") || searchParams.get("check_out") || "";
  const guestsFromUrl = Number(searchParams.get("guests") || 0);
  const today = getLocalDateValue();

  const [category, setCategory] = useState(null);
  const [loadingCategory, setLoadingCategory] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState(() => {
    const storedDraft = readStoredBookingDraft(categorySlug);

    return {
      check_in: checkInFromUrl || storedDraft?.checkIn || "",
      check_out: checkOutFromUrl || storedDraft?.checkOut || "",
      guests_count: Number(
        guestsFromUrl || storedDraft?.guestsCount || 1
      ),
      special_requests: "",
      customer: {
        full_name: "",
        phone: "",
        email: "",
        document_type: "DNI",
        document_number: "",
      },
    };
  });

  useEffect(() => {
    async function loadSelectedCategory() {
      try {
        setError("");

        if (!categorySlug) {
          setError(
            "Primero consulta disponibilidad y selecciona una categoría."
          );
          return;
        }

        const categories = await getRoomCategories();
        const selected = (Array.isArray(categories) ? categories : []).find(
          (item) => String(item.slug).toLowerCase() === categorySlug
        );

        if (!selected) {
          setError("La categoría seleccionada no está disponible.");
          return;
        }

        setCategory(selected);
      } catch (loadError) {
        console.error("Error cargando categoría para reserva:", loadError);
        setError("No se pudo cargar la categoría seleccionada.");
      } finally {
        setLoadingCategory(false);
      }
    }

    loadSelectedCategory();
  }, [categorySlug]);

  useEffect(() => {
    if (
      !categorySlug ||
      (!formData.check_in && !formData.check_out)
    ) {
      return;
    }

    sessionStorage.setItem(
      BOOKING_DRAFT_KEY,
      JSON.stringify({
        categorySlug,
        checkIn: formData.check_in,
        checkOut: formData.check_out,
        guestsCount: Number(formData.guests_count || 1),
      })
    );
  }, [
    categorySlug,
    formData.check_in,
    formData.check_out,
    formData.guests_count,
  ]);

  const nights = useMemo(
    () => calculateNights(formData.check_in, formData.check_out),
    [formData.check_in, formData.check_out]
  );

  const totalAmount = category
    ? nights * Number(category.price_per_night || 0)
    : 0;

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => {
      const nextFormData = {
        ...previous,
        [name]: name === "guests_count" ? Number(value) : value,
      };

      if (
        name === "check_in" &&
        previous.check_out &&
        previous.check_out <= value
      ) {
        nextFormData.check_out = "";
      }

      return nextFormData;
    });
  }

  function handleCustomerChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      customer: {
        ...previous.customer,
        [name]: value,
      },
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      if (!category) {
        setError("No hay una categoría seleccionada.");
        return;
      }

      if (!formData.check_in || !formData.check_out || nights <= 0) {
        setError(
          "Selecciona fechas válidas. La salida debe ser posterior al ingreso."
        );
        return;
      }

      if (
        Number(formData.guests_count) < 1 ||
        Number(formData.guests_count) > Number(category.capacity)
      ) {
        setError(
          "La cantidad de huéspedes supera la capacidad de esta categoría."
        );
        return;
      }

      if (
        !formData.customer.full_name.trim() ||
        !formData.customer.phone.trim() ||
        !formData.customer.email.trim()
      ) {
        setError("El nombre, el celular y el correo son obligatorios.");
        return;
      }

      if (totalAmount <= 0) {
        setError(
          "Esta categoría todavía no tiene un precio configurado. Comunícate con el hospedaje."
        );
        return;
      }

      const result = await createBooking({
        category_slug: category.slug,
        check_in: formData.check_in,
        check_out: formData.check_out,
        guests_count: Number(formData.guests_count),
        special_requests: formData.special_requests.trim(),
        customer: {
          full_name: formData.customer.full_name.trim(),
          phone: formData.customer.phone.trim(),
          email: formData.customer.email.trim().toLowerCase(),
          document_type: formData.customer.document_type,
          document_number: formData.customer.document_number.trim(),
        },
      });

      if (result.data?.mode === "inquiry") {
        setSuccess(result.message || result.data.message);
        return;
      }

      const paymentData = {
        booking: result.data.booking,
        customer: result.data.customer,
        room: result.data.room,
        publicToken: result.data.public_token,
        paymentUrl: result.data.payment_url,
      };

      sessionStorage.setItem(
        PAYMENT_SESSION_KEY,
        JSON.stringify(paymentData)
      );
      sessionStorage.removeItem(BOOKING_DRAFT_KEY);

      navigate("/pago-resultado", {
        state: paymentData,
      });
    } catch (submitError) {
      console.error("Error creando reserva:", submitError);
      setError(
        submitError.response?.data?.message ||
          submitError.message ||
          "No se pudo crear la reserva."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const availabilityBackUrl = `/disponibilidad?category=${encodeURIComponent(
    categorySlug
  )}&checkIn=${encodeURIComponent(
    formData.check_in
  )}&checkOut=${encodeURIComponent(
    formData.check_out
  )}&guests=${encodeURIComponent(formData.guests_count)}`;

  return (
    <main className="booking-page">
      <div className="booking-container">
        <div className="booking-header">
          <p className="hotel-eyebrow">Reserva online</p>
          <h1>Completa tu reserva</h1>
          <p>
            Elegiste una categoría disponible. Completa tus datos y revisa el
            monto antes de continuar al pago.
          </p>
        </div>

        {loadingCategory && (
          <div className="booking-loading-card">
            Cargando categoría...
          </div>
        )}

        {!loadingCategory && error && !category && (
          <div className="booking-error-card">
            <p>{error}</p>
            <Link
              to="/disponibilidad"
              className="booking-back-link"
            >
              Consultar disponibilidad
            </Link>
          </div>
        )}

        {!loadingCategory && category && (
          <div className="booking-layout">
            <form onSubmit={handleSubmit} className="booking-form-card">
              <section className="booking-section">
                <h2>Fechas de estadía</h2>

                <div className="booking-grid">
                  <div>
                    <label className="booking-label" htmlFor="check-in">
                      Fecha de ingreso
                    </label>
                    <input
                      id="check-in"
                      type="date"
                      name="check_in"
                      value={formData.check_in}
                      onChange={handleChange}
                      min={today}
                      className="booking-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="booking-label" htmlFor="check-out">
                      Fecha de salida
                    </label>
                    <input
                      id="check-out"
                      type="date"
                      name="check_out"
                      value={formData.check_out}
                      onChange={handleChange}
                      min={formData.check_in || today}
                      className="booking-input"
                      required
                    />
                  </div>
                </div>
              </section>

              <section className="booking-section">
                <h2>Huéspedes</h2>

                <label className="booking-label" htmlFor="guests-count">
                  Cantidad de huéspedes
                </label>
                <input
                  id="guests-count"
                  type="number"
                  name="guests_count"
                  min="1"
                  max={category.capacity}
                  value={formData.guests_count}
                  onChange={handleChange}
                  className="booking-input"
                  required
                />
                <p className="booking-help-text">
                  Capacidad máxima: {category.capacity} persona(s)
                </p>
              </section>

              <section className="booking-section">
                <h2>Datos del cliente</h2>

                <div className="booking-grid">
                  <div className="booking-field-full">
                    <label className="booking-label" htmlFor="full-name">
                      Nombre completo
                    </label>
                    <input
                      id="full-name"
                      type="text"
                      name="full_name"
                      value={formData.customer.full_name}
                      onChange={handleCustomerChange}
                      placeholder="Nombre y apellidos"
                      autoComplete="name"
                      className="booking-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="booking-label" htmlFor="phone">
                      Celular
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      name="phone"
                      value={formData.customer.phone}
                      onChange={handleCustomerChange}
                      placeholder="999999999"
                      autoComplete="tel"
                      className="booking-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="booking-label" htmlFor="email">
                      Correo
                    </label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.customer.email}
                      onChange={handleCustomerChange}
                      placeholder="cliente@email.com"
                      autoComplete="email"
                      className="booking-input"
                      required
                    />
                    <p className="booking-help-text">
                      Usa el mismo correo cuando pagues en Culqi.
                    </p>
                  </div>

                  <div>
                    <label className="booking-label" htmlFor="document-type">
                      Tipo de documento
                    </label>
                    <select
                      id="document-type"
                      name="document_type"
                      value={formData.customer.document_type}
                      onChange={handleCustomerChange}
                      className="booking-select"
                    >
                      <option value="DNI">DNI</option>
                      <option value="CE">Carné de extranjería</option>
                      <option value="PASAPORTE">Pasaporte</option>
                    </select>
                  </div>

                  <div>
                    <label className="booking-label" htmlFor="document-number">
                      Número de documento
                    </label>
                    <input
                      id="document-number"
                      type="text"
                      name="document_number"
                      value={formData.customer.document_number}
                      onChange={handleCustomerChange}
                      placeholder="Documento"
                      className="booking-input"
                    />
                  </div>
                </div>
              </section>

              <section className="booking-section">
                <label className="booking-label" htmlFor="special-requests">
                  Solicitudes adicionales
                </label>
                <textarea
                  id="special-requests"
                  name="special_requests"
                  value={formData.special_requests}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Ejemplo: llegaré en la noche..."
                  className="booking-textarea"
                />
              </section>

              <div className="booking-next-step-card">
                <span className="booking-next-step-icon" aria-hidden="true">
                  2
                </span>
                <div>
                  <strong>El pago se realiza en el siguiente paso</strong>
                  <p>
                    El sistema asignará internamente una habitación disponible
                    de esta categoría. El número físico no modifica tu precio.
                  </p>
                </div>
              </div>

              {error && (
                <div className="booking-alert booking-alert-error">
                  {error}
                </div>
              )}

              {success && (
                <div className="booking-alert booking-alert-success">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="booking-submit-button"
              >
                {submitting
                  ? "Registrando reserva..."
                  : "Registrar reserva y continuar al pago"}
              </button>
            </form>

            <aside className="booking-summary-card">
              <h2 className="booking-summary-title">Resumen</h2>

              <div className="booking-summary-room">
                <p>Categoría</p>
                <h3>{category.name}</h3>
              </div>

              <div className="booking-summary-list">
                <div className="booking-summary-row">
                  <span>Ingreso</span>
                  <strong>{formData.check_in || "Por seleccionar"}</strong>
                </div>
                <div className="booking-summary-row">
                  <span>Salida</span>
                  <strong>{formData.check_out || "Por seleccionar"}</strong>
                </div>
                <div className="booking-summary-row">
                  <span>Precio por noche</span>
                  <strong>{formatMoney(category.price_per_night)}</strong>
                </div>
                <div className="booking-summary-row">
                  <span>Noches</span>
                  <strong>{nights}</strong>
                </div>
                <div className="booking-summary-row">
                  <span>Huéspedes</span>
                  <strong>{formData.guests_count}</strong>
                </div>
              </div>

              <div className="booking-summary-total">
                <div className="booking-summary-total-row">
                  <span>Total a pagar</span>
                  <strong>{formatMoney(totalAmount)}</strong>
                </div>
              </div>

              <div className="booking-summary-payment">
                <p>Pago seguro con Culqi</p>
                <p>Ingresarás manualmente el monto exacto.</p>
                <small>
                  El hospedaje verificará el movimiento antes de confirmar la
                  reserva.
                </small>
              </div>

              <Link
                to={availabilityBackUrl}
                className="booking-back-link"
              >
                Volver a disponibilidad
              </Link>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
