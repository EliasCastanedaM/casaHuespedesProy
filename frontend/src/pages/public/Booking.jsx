// useEffect ejecuta lógica al cargar la página
// useState guarda datos del formulario
import "./Home.css";
import "./Booking.css";
import { useEffect, useState } from "react";

// useSearchParams permite leer roomId desde la URL
// Link permite navegar entre páginas
import { Link, useSearchParams } from "react-router-dom";

// Servicio para obtener datos de una habitación
import { getRoomById } from "../../services/roomService";

// Servicios para validar disponibilidad y crear reserva
import { checkAvailability, createBooking } from "../../services/bookingService";

// Página donde el cliente crea una reserva
export default function Booking() {
  // Simulación visual de pago
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [paymentSimulated, setPaymentSimulated] = useState(false);

  // Leemos parámetros de la URL, por ejemplo /reservar?roomId=1
  const [searchParams] = useSearchParams();

  // Obtenemos el roomId desde la URL
  const roomId = searchParams.get("roomId");

  // Estado para guardar habitación seleccionada
  const [room, setRoom] = useState(null);

  // Estado para indicar carga inicial
  const [loadingRoom, setLoadingRoom] = useState(true);

  // Estado para indicar envío del formulario
  const [submitting, setSubmitting] = useState(false);

  // Estado para mensajes de error
  const [error, setError] = useState("");

  // Estado para mensaje de éxito
  const [success, setSuccess] = useState("");

  // Estado para guardar la reserva creada
  const [createdBooking, setCreatedBooking] = useState(null);

  // Estado principal del formulario
  const [formData, setFormData] = useState({
    check_in: "",
    check_out: "",
    guests_count: 1,
    special_requests: "",
    customer: {
      full_name: "",
      phone: "",
      email: "",
      document_type: "DNI",
      document_number: "",
    },
  });

  // Simula un pago superficial, no cobra ni conecta con backend
  function handleFakePayment() {
    setPaymentSimulated(true);
  }

  // Función para cargar habitación seleccionada
  async function loadSelectedRoom() {
    try {
      // Limpiamos error anterior
      setError("");

      // Si no existe roomId en la URL, mostramos error
      if (!roomId) {
        setError("No se seleccionó ninguna habitación.");
        return;
      }

      // Pedimos la habitación al backend
      const data = await getRoomById(roomId);

      // Guardamos la habitación
      setRoom(data);
    } catch (err) {
      // Mostramos error técnico en consola
      console.error("Error cargando habitación para reserva:", err);

      // Mostramos mensaje amigable
      setError("No se pudo cargar la habitación seleccionada.");
    } finally {
      // Terminamos carga inicial
      setLoadingRoom(false);
    }
  }

  // Ejecutamos carga de habitación cuando abre la página
  useEffect(() => {
    loadSelectedRoom();
  }, [roomId]);

  // Función para actualizar campos simples del formulario
  function handleChange(event) {
    // Obtenemos nombre y valor del input
    const { name, value } = event.target;

    // Actualizamos el campo correspondiente
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // Función para actualizar campos dentro de customer
  function handleCustomerChange(event) {
    // Obtenemos nombre y valor del input
    const { name, value } = event.target;

    // Actualizamos solo el objeto customer
    setFormData((prev) => ({
      ...prev,
      customer: {
        ...prev.customer,
        [name]: value,
      },
    }));
  }

  // Función para calcular noches en el frontend
  function calculateNightsFrontend() {
    // Si faltan fechas, retornamos 0
    if (!formData.check_in || !formData.check_out) return 0;

    // Convertimos fechas
    const start = new Date(formData.check_in);
    const end = new Date(formData.check_out);

    // Calculamos diferencia en días
    const diff = (end - start) / (1000 * 60 * 60 * 24);

    // Retornamos noches si es positivo
    return diff > 0 ? diff : 0;
  }

  // Calculamos noches
  const nights = calculateNightsFrontend();

  // Calculamos total estimado
  const totalAmount = room ? nights * Number(room.price_per_night) : 0;

  // Función principal para enviar reserva
  async function handleSubmit(event) {
    // Evitamos que el formulario recargue la página
    event.preventDefault();

    try {
      // Activamos envío
      setSubmitting(true);

      // Limpiamos mensajes anteriores
      setError("");
      setSuccess("");
      setCreatedBooking(null);

      // Validamos que exista habitación
      if (!room) {
        setError("No hay habitación seleccionada.");
        return;
      }

      // Validamos fechas
      if (!formData.check_in || !formData.check_out) {
        setError("Selecciona fecha de ingreso y fecha de salida.");
        return;
      }

      // Validamos noches
      if (nights <= 0) {
        setError("La fecha de salida debe ser posterior a la fecha de ingreso.");
        return;
      }

      // Validamos cantidad de huéspedes
      if (Number(formData.guests_count) > Number(room.capacity)) {
        setError("La cantidad de huéspedes supera la capacidad de la habitación.");
        return;
      }

      // Validamos datos básicos del cliente
      if (!formData.customer.full_name || !formData.customer.phone) {
        setError("El nombre y el celular son obligatorios.");
        return;
      }

      // Primero validamos disponibilidad
      const availability = await checkAvailability({
        room_id: Number(room.id),
        check_in: formData.check_in,
        check_out: formData.check_out,
      });

      // Si no está disponible, detenemos el proceso
      if (!availability.available) {
        setError("La habitación no está disponible en esas fechas.");
        return;
      }

      // Armamos objeto para enviar al backend
      const bookingPayload = {
        room_id: Number(room.id),
        check_in: formData.check_in,
        check_out: formData.check_out,
        guests_count: Number(formData.guests_count),
        special_requests: formData.special_requests,
        customer: {
          full_name: formData.customer.full_name,
          phone: formData.customer.phone,
          email: formData.customer.email,
          document_type: formData.customer.document_type,
          document_number: formData.customer.document_number,
        },
      };

      // Creamos reserva en backend
      const result = await createBooking(bookingPayload);

      // Guardamos reserva creada
      setCreatedBooking(result.data.booking);

      // Mostramos mensaje de éxito
      setSuccess(
        "Reserva registrada correctamente. El pago queda pendiente de confirmación."
      );
    } catch (err) {
      // Mostramos error técnico en consola
      console.error("Error creando reserva:", err);

      // Mensaje específico si el backend respondió
      const backendMessage = err.response?.data?.message;

      // Mostramos mensaje amigable
      setError(backendMessage || "No se pudo crear la reserva.");
    } finally {
      // Terminamos envío
      setSubmitting(false);
    }
  }

  return (
  <main className="booking-page">
    <div className="booking-container">
      {/* Encabezado */}
      <div className="booking-header">
        <p className="hotel-eyebrow">Reserva online</p>

        <h1>Confirmar reserva</h1>

        <p>
          Completa tus datos, revisa el resumen y visualiza la simulación del
          pago para continuar con la reserva.
        </p>
      </div>

      {/* Carga inicial */}
      {loadingRoom && (
        <div className="booking-loading-card">
          Cargando habitación...
        </div>
      )}

      {/* Error si no carga habitación */}
      {!loadingRoom && error && !room && (
        <div className="booking-error-card">
          {error}
        </div>
      )}

      {/* Formulario principal */}
      {!loadingRoom && room && (
        <div className="booking-layout">
          <form onSubmit={handleSubmit} className="booking-form-card">
            {/* Fechas */}
            <section className="booking-section">
              <h2>Fechas de estadía</h2>

              <div className="booking-grid">
                <div>
                  <label className="booking-label">
                    Fecha de ingreso
                  </label>

                  <input
                    type="date"
                    name="check_in"
                    value={formData.check_in}
                    onChange={handleChange}
                    className="booking-input"
                  />
                </div>

                <div>
                  <label className="booking-label">
                    Fecha de salida
                  </label>

                  <input
                    type="date"
                    name="check_out"
                    value={formData.check_out}
                    onChange={handleChange}
                    className="booking-input"
                  />
                </div>
              </div>
            </section>

            {/* Huéspedes */}
            <section className="booking-section">
              <h2>Huéspedes</h2>

              <div>
                <label className="booking-label">
                  Cantidad de huéspedes
                </label>

                <input
                  type="number"
                  name="guests_count"
                  min="1"
                  max={room.capacity}
                  value={formData.guests_count}
                  onChange={handleChange}
                  className="booking-input"
                />

                <p className="booking-help-text">
                  Capacidad máxima: {room.capacity} persona(s)
                </p>
              </div>
            </section>

            {/* Datos del cliente */}
            <section className="booking-section">
              <h2>Datos del cliente</h2>

              <div className="booking-grid">
                <div className="booking-field-full">
                  <label className="booking-label">
                    Nombre completo
                  </label>

                  <input
                    type="text"
                    name="full_name"
                    value={formData.customer.full_name}
                    onChange={handleCustomerChange}
                    placeholder="Nombre y apellidos"
                    className="booking-input"
                  />
                </div>

                <div>
                  <label className="booking-label">
                    Celular / WhatsApp
                  </label>

                  <input
                    type="text"
                    name="phone"
                    value={formData.customer.phone}
                    onChange={handleCustomerChange}
                    placeholder="999999999"
                    className="booking-input"
                  />
                </div>

                <div>
                  <label className="booking-label">
                    Correo
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={formData.customer.email}
                    onChange={handleCustomerChange}
                    placeholder="cliente@email.com"
                    className="booking-input"
                  />
                </div>

                <div>
                  <label className="booking-label">
                    Tipo de documento
                  </label>

                  <select
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
                  <label className="booking-label">
                    Número de documento
                  </label>

                  <input
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

            {/* Simulación visual de pago */}
            <section className="booking-section">
              <div className="booking-payment-card">
                <div className="booking-payment-header">
                  <div>
                    <p className="hotel-eyebrow">Pago referencial</p>

                    <h2 className="booking-payment-title">
                      Método de pago
                    </h2>

                    <p className="booking-payment-description">
                      Selecciona un método para visualizar cómo sería el proceso
                      de pago.
                    </p>
                  </div>

                  <span className="booking-payment-badge">
                    Simulación
                  </span>
                </div>

                <div className="booking-payment-methods">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("card");
                      setPaymentSimulated(false);
                    }}
                    className={`booking-payment-option ${
                      paymentMethod === "card" ? "active" : ""
                    }`}
                  >
                    <span className="booking-payment-icon">💳</span>
                    <strong>Tarjeta</strong>
                    <small>Visa, Mastercard o débito</small>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("yape");
                      setPaymentSimulated(false);
                    }}
                    className={`booking-payment-option ${
                      paymentMethod === "yape" ? "active" : ""
                    }`}
                  >
                    <span className="booking-payment-icon">📱</span>
                    <strong>Yape / Plin</strong>
                    <small>Pago rápido con QR</small>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("transfer");
                      setPaymentSimulated(false);
                    }}
                    className={`booking-payment-option ${
                      paymentMethod === "transfer" ? "active" : ""
                    }`}
                  >
                    <span className="booking-payment-icon">🏦</span>
                    <strong>Transferencia</strong>
                    <small>Banco o cuenta corriente</small>
                  </button>
                </div>

                {paymentMethod === "card" && (
                  <div className="booking-payment-box">
                    <h3>Datos de tarjeta</h3>

                    <div className="booking-card-preview">
                      <div>
                        <span>Casa Real Huéspedes</span>
                        <strong>**** **** **** 0000</strong>
                      </div>

                      <small>MM/AA</small>
                    </div>

                    <div className="booking-payment-grid">
                      <input
                        type="text"
                        placeholder="Nombre del titular"
                        className="booking-input"
                      />

                      <input
                        type="text"
                        placeholder="Número de tarjeta"
                        className="booking-input"
                      />

                      <input
                        type="text"
                        placeholder="MM/AA"
                        className="booking-input"
                      />

                      <input
                        type="text"
                        placeholder="CVV"
                        className="booking-input"
                      />
                    </div>

                    <p className="booking-payment-note">
                      Esta información es solo visual. No se guarda ni se valida.
                    </p>
                  </div>
                )}

                {paymentMethod === "yape" && (
                  <div className="booking-payment-box booking-payment-center">
                    <h3>Escanea el QR de Yape / Plin</h3>

                    <div className="booking-qr-placeholder">
                      QR
                    </div>

                    <p>
                      Aquí se colocará el QR oficial del hospedaje.
                    </p>

                    <strong>
                      Monto referencial: S/ {totalAmount.toFixed(2)}
                    </strong>
                  </div>
                )}

                {paymentMethod === "transfer" && (
                  <div className="booking-payment-box">
                    <h3>Datos de transferencia</h3>

                    <div className="booking-bank-list">
                      <p>
                        <span>Banco:</span> BCP
                      </p>
                      <p>
                        <span>Titular:</span> Casa Real Huéspedes
                      </p>
                      <p>
                        <span>Cuenta:</span> 000-0000000000
                      </p>
                      <p>
                        <span>CCI:</span> 00000000000000000000
                      </p>
                      <p>
                        <span>Monto:</span> S/ {totalAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleFakePayment}
                  className="booking-submit-button booking-pay-button"
                >
                  Pagar ahora
                </button>

                {paymentSimulated && (
                  <div className="booking-alert booking-alert-success">
                    Pago simulado correctamente. Puedes continuar con la reserva.
                  </div>
                )}

                <p className="booking-payment-disclaimer">
                  Esta sección es una simulación visual. La web todavía no
                  procesa pagos reales.
                </p>
              </div>
            </section>

            {/* Solicitudes especiales */}
            <section className="booking-section">
              <label className="booking-label">
                Solicitudes adicionales
              </label>

              <textarea
                name="special_requests"
                value={formData.special_requests}
                onChange={handleChange}
                rows="4"
                placeholder="Ejemplo: llegaré en la noche, necesito información adicional..."
                className="booking-textarea"
              />
            </section>

            {/* Mensaje de error */}
            {error && (
              <div className="booking-alert booking-alert-error">
                {error}
              </div>
            )}

            {/* Mensaje de éxito */}
            {success && (
              <div className="booking-alert booking-alert-success">
                <strong>{success}</strong>

                {createdBooking && (
                  <p>
                    Código de reserva: #{createdBooking.id}
                  </p>
                )}

                <p>
                  El administrador validará la solicitud y confirmará la reserva.
                </p>
              </div>
            )}

            {/* Botón enviar */}
            <button
              type="submit"
              disabled={submitting}
              className="booking-submit-button"
            >
              {submitting
                ? "Creando reserva..."
                : "Finalizar solicitud de reserva"}
            </button>
          </form>

          {/* Resumen lateral */}
          <aside className="booking-summary-card">
            <h2 className="booking-summary-title">
              Resumen
            </h2>

            <div className="booking-summary-room">
              <p>Habitación</p>

              <h3>{room.name}</h3>
            </div>

            <div className="booking-summary-list">
              <div className="booking-summary-row">
                <span>Precio por noche</span>
                <strong>S/ {Number(room.price_per_night).toFixed(2)}</strong>
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
                <span>Total estimado</span>

                <strong>
                  S/ {totalAmount.toFixed(2)}
                </strong>
              </div>
            </div>

            <div className="booking-summary-payment">
              <p>Pago seleccionado</p>

              <p>
                {paymentMethod === "card" && "Tarjeta"}
                {paymentMethod === "yape" && "Yape / Plin"}
                {paymentMethod === "transfer" && "Transferencia bancaria"}
              </p>

              <small>
                Simulación referencial para mostrar el flujo de pago.
              </small>
            </div>

            <p className="booking-summary-note">
              La reserva quedará pendiente de confirmación. La sección de pago es
              solo visual por ahora.
            </p>

            <Link
              to={`/habitaciones/${room.id}`}
              className="booking-back-link"
            >
              Volver al detalle
            </Link>
          </aside>
        </div>
      )}
    </div>
  </main>
);
}