import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import {
  getBookingPaymentStatus,
  reportBookingPayment,
} from "../../services/bookingService";

import "./Home.css";
import "./Booking.css";

const PAYMENT_SESSION_KEY = "pimentelPendingPayment";
const DEFAULT_CULQI_URL =
  "https://express.culqi.com/pago/A863017EB2";

function readPaymentSession() {
  try {
    return JSON.parse(
      sessionStorage.getItem(PAYMENT_SESSION_KEY) || "null"
    );
  } catch (storageError) {
    console.warn("No se pudo leer la reserva pendiente.", storageError);
    return null;
  }
}

function formatMoney(value) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "-";

  const dateValue = String(value).slice(0, 10);
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function savePaymentSession(paymentData) {
  sessionStorage.setItem(
    PAYMENT_SESSION_KEY,
    JSON.stringify(paymentData)
  );
}

export default function PaymentResult() {
  const location = useLocation();
  const initialData = useMemo(
    () => location.state || readPaymentSession(),
    [location.state]
  );

  const [paymentData, setPaymentData] = useState(initialData);
  const [statusData, setStatusData] = useState(null);
  const [isReporting, setIsReporting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [hasOpenedCulqi, setHasOpenedCulqi] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const booking = paymentData?.booking;
  const bookingId = booking?.id;
  const customer = paymentData?.customer;
  const room = paymentData?.room;
  const publicToken = paymentData?.publicToken;
  const paymentUrl =
    statusData?.payment_url ||
    paymentData?.paymentUrl ||
    DEFAULT_CULQI_URL;
  const bookingStatus = statusData?.status || booking?.status;
  const isReported = [
    "payment_reported",
    "confirmed",
    "completed",
  ].includes(bookingStatus);
  const isConfirmed = ["confirmed", "completed"].includes(
    bookingStatus
  );
  const isClosed = ["rejected", "cancelled", "expired"].includes(
    bookingStatus
  );

  const totalAmount =
    statusData?.total_amount ?? booking?.total_amount ?? 0;
  const bookingCode =
    statusData?.booking_code ||
    booking?.booking_code ||
    `CHP-${String(booking?.id || "").padStart(5, "0")}`;

  const refreshStatus = useCallback(
    async ({ quiet = false } = {}) => {
      if (!bookingId || !publicToken) return;

      try {
        if (!quiet) setIsChecking(true);

        const result = await getBookingPaymentStatus({
          bookingId,
          publicToken,
        });

        setStatusData(result.data);

        setPaymentData((previousData) => {
          const nextPaymentData = {
            ...previousData,
            booking: {
              ...previousData.booking,
              status: result.data.status,
              booking_code: result.data.booking_code,
              total_amount: result.data.total_amount,
            },
            paymentUrl:
              result.data.payment_url ||
              previousData.paymentUrl ||
              DEFAULT_CULQI_URL,
          };

          savePaymentSession(nextPaymentData);
          return nextPaymentData;
        });

        if (
          ["confirmed", "completed"].includes(result.data.status)
        ) {
          setMessage(
            "¡Tu pago fue verificado! La reserva está confirmada."
          );
        }
      } catch (statusError) {
        if (!quiet) {
          setError(
            statusError.response?.data?.message ||
              statusError.message ||
              "No pudimos actualizar el estado de la reserva."
          );
        }
      } finally {
        if (!quiet) setIsChecking(false);
      }
    },
    [bookingId, publicToken]
  );

  useEffect(() => {
    if (!bookingId || !publicToken) return undefined;

    const initialCheckId = window.setTimeout(() => {
      refreshStatus({ quiet: true });
    }, 0);

    const intervalId = window.setInterval(() => {
      refreshStatus({ quiet: true });
    }, 15000);

    function handleWindowFocus() {
      refreshStatus({ quiet: true });
    }

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.clearTimeout(initialCheckId);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [bookingId, publicToken, refreshStatus]);

  async function handleCopyAmount() {
    try {
      await navigator.clipboard.writeText(
        Number(totalAmount || 0).toFixed(2)
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(
        `No se pudo copiar. Escribe manualmente ${formatMoney(
          totalAmount
        )} en Culqi.`
      );
    }
  }

  function handleOpenCulqi() {
    setHasOpenedCulqi(true);
    setError("");

    const culqiWindow = window.open(
      paymentUrl,
      "_blank",
      "noopener,noreferrer"
    );

    if (!culqiWindow) {
      setError(
        "Tu navegador bloqueó la nueva pestaña. Permite las ventanas emergentes y vuelve a presionar el botón."
      );
    }
  }

  async function handleReportPayment() {
    const shouldContinue = window.confirm(
      `Confirma que ya pagaste ${formatMoney(
        totalAmount
      )} en Culqi. El hospedaje revisará el movimiento antes de confirmar tu reserva.`
    );

    if (!shouldContinue) return;

    try {
      setIsReporting(true);
      setError("");
      setMessage("");

      const result = await reportBookingPayment({
        bookingId,
        publicToken,
      });

      setStatusData(result.data);
      setMessage(result.message);

      const nextPaymentData = {
        ...paymentData,
        booking: {
          ...booking,
          status: result.data.status,
        },
      };

      setPaymentData(nextPaymentData);
      savePaymentSession(nextPaymentData);
    } catch (reportError) {
      setError(
        reportError.response?.data?.message ||
          reportError.message ||
          "No pudimos avisar al hospedaje. Inténtalo nuevamente."
      );
    } finally {
      setIsReporting(false);
    }
  }

  if (!paymentData || !booking || !publicToken) {
    return (
      <main className="payment-result-page">
        <section className="payment-missing-card">
          <span className="payment-missing-icon" aria-hidden="true">
            !
          </span>
          <p className="hotel-eyebrow">Reserva no encontrada</p>
          <h1>No encontramos un pago pendiente</h1>
          <p>
            Vuelve a elegir una habitación y registra la reserva para
            continuar con el pago.
          </p>
          <Link to="/habitaciones" className="payment-primary-button">
            Ver habitaciones
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="payment-result-page">
      <div className="payment-result-container">
        <header className="payment-result-header">
          <p className="hotel-eyebrow">Pago de reserva</p>
          <h1>
            {isConfirmed
              ? "Reserva confirmada"
              : isReported
                ? "Estamos verificando tu pago"
                : "Completa tu pago"}
          </h1>
          <p>
            Sigue los pasos en orden. Tu reserva solo quedará
            confirmada después de que el hospedaje compruebe el pago.
          </p>
        </header>

        <ol className="payment-progress" aria-label="Progreso de la reserva">
          <li className="payment-progress-item is-complete">
            <span className="payment-progress-circle">✓</span>
            <span>Reserva registrada</span>
          </li>
          <li className="payment-progress-line" aria-hidden="true" />
          <li
            className={`payment-progress-item ${
              isReported ? "is-complete" : "is-active"
            }`}
          >
            <span className="payment-progress-circle">
              {isReported ? "✓" : "2"}
            </span>
            <span>Realizar pago</span>
          </li>
          <li className="payment-progress-line" aria-hidden="true" />
          <li
            className={`payment-progress-item ${
              isConfirmed
                ? "is-complete"
                : isReported
                  ? "is-active"
                  : ""
            }`}
          >
            <span className="payment-progress-circle">
              {isConfirmed ? "✓" : "3"}
            </span>
            <span>Confirmación</span>
          </li>
        </ol>

        {isConfirmed && (
          <section className="payment-success-card">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>Pago verificado y reserva confirmada</strong>
              <p>
                Enviamos la confirmación a{" "}
                <strong>{customer?.email}</strong>. Guarda el código{" "}
                <strong>{bookingCode}</strong>.
              </p>
            </div>
          </section>
        )}

        {isClosed && (
          <section className="payment-result-error">
            Esta reserva está {bookingStatus === "cancelled"
              ? "cancelada"
              : "cerrada"}
            . Comunícate con el hospedaje antes de realizar otro pago.
          </section>
        )}

        <div className="payment-result-layout">
          <section className="payment-action-card">
            <div className="payment-action-heading">
              <div>
                <p className="hotel-eyebrow">
                  {isReported
                    ? "Aviso enviado"
                    : "Paso 2 de 3"}
                </p>
                <h2>
                  {isReported
                    ? "El hospedaje revisará tu pago"
                    : "Paga el monto exacto"}
                </h2>
              </div>

              <span
                className={`payment-status-badge ${
                  isConfirmed
                    ? "is-confirmed"
                    : isReported
                      ? "is-reported"
                      : ""
                }`}
              >
                {isConfirmed
                  ? "Confirmada"
                  : isReported
                    ? "Pago reportado"
                    : "Pendiente de pago"}
              </span>
            </div>

            <p className="payment-booking-code">
              Código de reserva: <strong>{bookingCode}</strong>
            </p>

            <div className="payment-amount-box">
              <div>
                <span className="payment-amount-label">
                  Monto exacto a ingresar en Culqi
                </span>
                <strong className="payment-amount-value">
                  {formatMoney(totalAmount)}
                </strong>
              </div>

              <button
                type="button"
                onClick={handleCopyAmount}
                className="payment-copy-button"
              >
                {copied ? "Copiado ✓" : "Copiar monto"}
              </button>
            </div>

            <div className="payment-flow-step">
              <span className="payment-flow-number">1</span>
              <div className="payment-flow-content">
                <h3>Abre el pago seguro de Culqi</h3>
                <p>
                  Culqi se abrirá en otra pestaña. Esta página
                  permanecerá abierta para que puedas regresar.
                </p>

                <button
                  type="button"
                  onClick={handleOpenCulqi}
                  disabled={isReported || isConfirmed || isClosed}
                  className="payment-primary-button"
                >
                  Ir a pagar con Culqi
                  <span aria-hidden="true">↗</span>
                </button>
              </div>
            </div>

            <div className="payment-flow-step is-important">
              <span className="payment-flow-number">2</span>
              <div className="payment-flow-content">
                <h3>
                  Regresa y avisa que ya pagaste
                  <span className="payment-required-label">
                    Obligatorio
                  </span>
                </h3>
                <p>
                  Después de completar Culqi, vuelve a esta pestaña y
                  presiona el botón. Sin este aviso el hospedaje no
                  sabrá que debe revisar tu pago.
                </p>

                <button
                  type="button"
                  onClick={handleReportPayment}
                  disabled={
                    isReporting ||
                    isReported ||
                    isConfirmed ||
                    isClosed
                  }
                  className="payment-secondary-button"
                >
                  {isConfirmed
                    ? "Reserva confirmada"
                    : isReported
                      ? "Aviso enviado al hospedaje ✓"
                      : isReporting
                        ? "Enviando aviso..."
                        : "Ya pagué, avisar al hospedaje"}
                </button>

                {!hasOpenedCulqi && !isReported && (
                  <small className="payment-flow-reminder">
                    Primero abre Culqi y completa el pago.
                  </small>
                )}
              </div>
            </div>

            {isReported && !isConfirmed && (
              <div className="payment-waiting-card">
                <span className="payment-waiting-pulse" aria-hidden="true" />
                <div>
                  <strong>Verificación pendiente</strong>
                  <p>
                    No necesitas volver a avisar. Esta página
                    comprobará automáticamente si tu reserva fue
                    confirmada.
                  </p>
                </div>
              </div>
            )}

            {message && (
              <div className="booking-alert booking-alert-success">
                {message}
              </div>
            )}

            {error && (
              <div className="booking-alert booking-alert-error">
                {error}
              </div>
            )}

            <div className="payment-safety-note">
              <span aria-hidden="true">🔒</span>
              <p>
                No envíes datos de tu tarjeta por correo ni
                WhatsApp. El pago se realiza únicamente en la página
                segura de Culqi.
              </p>
            </div>
          </section>

          <aside className="payment-result-summary">
            <p className="hotel-eyebrow">Tu reserva</p>
            <h2>Resumen</h2>

            <div className="payment-result-room">
              <span>Habitación</span>
              <strong>{room?.name || "Habitación seleccionada"}</strong>
            </div>

            <dl className="payment-result-status-list">
              <div className="payment-result-status-row">
                <dt>Ingreso</dt>
                <dd>{formatDate(booking.check_in)}</dd>
              </div>
              <div className="payment-result-status-row">
                <dt>Salida</dt>
                <dd>{formatDate(booking.check_out)}</dd>
              </div>
              <div className="payment-result-status-row">
                <dt>Noches</dt>
                <dd>{booking.nights}</dd>
              </div>
              <div className="payment-result-status-row">
                <dt>Huéspedes</dt>
                <dd>{booking.guests_count}</dd>
              </div>
              <div className="payment-result-status-row">
                <dt>Correo</dt>
                <dd>{customer?.email || "-"}</dd>
              </div>
            </dl>

            <div className="payment-result-total">
              <span>Total</span>
              <strong>{formatMoney(totalAmount)}</strong>
            </div>

            <div className="payment-result-status-card">
              <span
                className={`payment-status-dot ${
                  isConfirmed ? "is-confirmed" : ""
                }`}
                aria-hidden="true"
              />
              <div>
                <strong>
                  {isConfirmed
                    ? "Reserva confirmada"
                    : isReported
                      ? "Validando pago"
                      : "Reserva pendiente"}
                </strong>
                <p>
                  {isConfirmed
                    ? "El hospedaje confirmó el pago."
                    : isReported
                      ? "El hospedaje revisará Culqi."
                      : "Falta completar y reportar el pago."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => refreshStatus()}
              disabled={isChecking}
              className="payment-refresh-button"
            >
              {isChecking ? "Actualizando..." : "Actualizar estado"}
            </button>

            <Link to="/" className="payment-home-link">
              Volver al inicio
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
