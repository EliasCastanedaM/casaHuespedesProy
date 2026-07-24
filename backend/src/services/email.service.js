import { env } from "../config/env.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(value) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "-";

  const monthNames = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  let year;
  let month;
  let day;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    year = value.getUTCFullYear();
    month = value.getUTCMonth() + 1;
    day = value.getUTCDate();
  } else {
    const match = String(value).match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (match) {
      year = Number(match[1]);
      month = Number(match[2]);
      day = Number(match[3]);
    } else {
      const parsedDate = new Date(value);

      if (Number.isNaN(parsedDate.getTime())) return "-";

      year = parsedDate.getUTCFullYear();
      month = parsedDate.getUTCMonth() + 1;
      day = parsedDate.getUTCDate();
    }
  }

  return `${String(day).padStart(2, "0")} de ${
    monthNames[month - 1]
  } de ${year}`;
}

function emailShell(title, content) {
  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style="margin:0;background:#f7f1e8;font-family:Arial,sans-serif;color:#2b2118;">
        <div style="max-width:640px;margin:0 auto;padding:28px 16px;">
          <div style="background:#2b1d12;color:#ffffff;border-radius:22px 22px 0 0;padding:24px 28px;">
            <p style="margin:0;color:#d9b48f;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">
              Casa Huéspedes Pimentel
            </p>
            <h1 style="margin:10px 0 0;font-family:Georgia,serif;font-size:30px;font-weight:500;">
              ${escapeHtml(title)}
            </h1>
          </div>

          <div style="background:#ffffff;border:1px solid #eadfce;border-top:0;border-radius:0 0 22px 22px;padding:28px;">
            ${content}
          </div>

          <p style="margin:18px 0 0;text-align:center;color:#7b6b5f;font-size:12px;line-height:1.5;">
            Este correo fue enviado automáticamente por Casa Huéspedes Pimentel.
          </p>
        </div>
      </body>
    </html>
  `;
}

function bookingSummary(details) {
  return `
    <div style="background:#fbf7ef;border:1px solid #eadfce;border-radius:16px;padding:18px;margin:20px 0;">
      <p style="margin:0 0 10px;"><strong>Código:</strong> ${escapeHtml(
        details.booking_code
      )}</p>
      <p style="margin:0 0 10px;"><strong>Habitación:</strong> ${escapeHtml(
        details.room_name
      )}</p>
      <p style="margin:0 0 10px;"><strong>Ingreso:</strong> ${escapeHtml(
        formatDate(details.check_in)
      )}</p>
      <p style="margin:0 0 10px;"><strong>Salida:</strong> ${escapeHtml(
        formatDate(details.check_out)
      )}</p>
      <p style="margin:0 0 10px;"><strong>Noches:</strong> ${escapeHtml(
        details.nights
      )}</p>
      <p style="margin:0 0 10px;"><strong>Huéspedes:</strong> ${escapeHtml(
        details.guests_count
      )}</p>
      <p style="margin:0;font-size:20px;color:#9b612d;"><strong>Total: ${escapeHtml(
        formatMoney(details.total_amount)
      )}</strong></p>
    </div>
  `;
}

async function sendEmail({ to, subject, html }) {
  if (
    !env.brevo.apiKey ||
    !env.brevo.senderEmail ||
    !to
  ) {
    console.warn(
      "Correo omitido: falta BREVO_API_KEY, EMAIL_FROM_EMAIL o el destinatario."
    );
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let response;

  try {
    response = await fetch(
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": env.brevo.apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: env.brevo.senderName,
            email: env.brevo.senderEmail,
          },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          ...(env.hotelNotificationEmail
            ? {
                replyTo: {
                  email: env.hotelNotificationEmail,
                },
              }
            : {}),
        }),
        signal: controller.signal,
      }
    );
  } finally {
    clearTimeout(timeout);
  }

  const responseText = await response.text();
  let result = {};

  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { message: responseText };
    }
  }

  if (!response.ok) {
    throw new Error(
      `Brevo respondió ${response.status}: ${
        result.message || "No se pudo enviar el correo."
      }`
    );
  }

  console.log(
    `Correo enviado correctamente por Brevo: ${subject} -> ${to} (${
      result.messageId || "sin identificador"
    })`
  );

  return true;
}

async function sendEmailSafely(emailData) {
  try {
    return await sendEmail(emailData);
  } catch (error) {
    console.error("No se pudo enviar el correo automático:", error.message);
    return false;
  }
}

export async function sendBookingPendingEmails(details) {
  const guestContent = `
    <p style="font-size:16px;line-height:1.65;margin:0;">
      Hola ${escapeHtml(details.customer_name)}, registramos tu solicitud.
      Para continuar, paga exactamente el monto indicado usando el mismo correo
      que escribiste en la reserva.
    </p>

    ${bookingSummary(details)}

    <div style="text-align:center;margin:26px 0;">
      <a
        href="${escapeHtml(details.payment_url)}"
        style="display:inline-block;background:#a87545;color:#ffffff;text-decoration:none;border-radius:999px;padding:15px 28px;font-weight:800;"
      >
        Pagar con Culqi
      </a>
    </div>

    <p style="color:#6f6258;line-height:1.6;margin:0;">
      En Culqi debes ingresar exactamente
      <strong>${escapeHtml(formatMoney(details.total_amount))}</strong>.
      Después, regresa a la página y presiona “Ya pagué, avisar al hospedaje”.
      La reserva se confirmará cuando el hospedaje verifique el pago.
    </p>
  `;

  const hotelContent = `
    <p style="font-size:16px;line-height:1.65;margin:0;">
      Se registró una nueva solicitud de reserva pendiente de pago.
    </p>

    ${bookingSummary(details)}

    <div style="background:#fbf7ef;border:1px solid #eadfce;border-radius:16px;padding:18px;">
      <p style="margin:0 0 10px;"><strong>Cliente:</strong> ${escapeHtml(
        details.customer_name
      )}</p>
      <p style="margin:0 0 10px;"><strong>Celular:</strong> ${escapeHtml(
        details.customer_phone
      )}</p>
      <p style="margin:0;"><strong>Correo:</strong> ${escapeHtml(
        details.customer_email
      )}</p>
    </div>
  `;

  return Promise.all([
    sendEmailSafely({
      to: details.customer_email,
      subject: `${details.booking_code} · Reserva pendiente de pago`,
      html: emailShell("Reserva pendiente de pago", guestContent),
    }),
    sendEmailSafely({
      to: env.hotelNotificationEmail,
      subject: `${details.booking_code} · Nueva solicitud de reserva`,
      html: emailShell("Nueva solicitud de reserva", hotelContent),
    }),
  ]);
}

export async function sendPaymentReportedEmail(details) {
  const content = `
    <p style="font-size:16px;line-height:1.65;margin:0;">
      El huésped indicó que ya realizó el pago. Revisa el movimiento en
      CulqiPanel antes de confirmar la reserva.
    </p>

    ${bookingSummary(details)}

    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:18px;">
      <p style="margin:0 0 10px;"><strong>Cliente:</strong> ${escapeHtml(
        details.customer_name
      )}</p>
      <p style="margin:0 0 10px;"><strong>Celular:</strong> ${escapeHtml(
        details.customer_phone
      )}</p>
      <p style="margin:0;"><strong>Correo usado:</strong> ${escapeHtml(
        details.customer_email
      )}</p>
    </div>

    <p style="color:#9a3412;font-weight:700;line-height:1.55;margin:20px 0 0;">
      No confirmes la reserva hasta comprobar en Culqi el monto y el correo.
    </p>
  `;

  return sendEmailSafely({
    to: env.hotelNotificationEmail,
    subject: `${details.booking_code} · El huésped reportó el pago`,
    html: emailShell("Pago reportado", content),
  });
}

export async function sendBookingConfirmedEmail(details) {
  const content = `
    <p style="font-size:16px;line-height:1.65;margin:0;">
      Hola ${escapeHtml(details.customer_name)}, el hospedaje verificó tu pago.
      Tu reserva está confirmada.
    </p>

    ${bookingSummary(details)}

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;border-radius:16px;padding:18px;font-weight:700;line-height:1.55;">
      Guarda este correo y presenta el código
      <strong>${escapeHtml(details.booking_code)}</strong> cuando llegues.
    </div>
  `;

  return sendEmailSafely({
    to: details.customer_email,
    subject: `${details.booking_code} · Reserva confirmada`,
    html: emailShell("Reserva confirmada", content),
  });
}
