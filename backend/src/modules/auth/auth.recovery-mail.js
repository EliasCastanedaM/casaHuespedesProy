import { env } from "../../config/env.js";

// Never derive this URL from Origin, Host, Referer or any untrusted request.
function recoveryUrl(token) {
  const host = env.nodeEnv === "production"
    ? "https://www.casahuespedespimentel.com"
    : "http://localhost:5173";
  // URL fragment is not transmitted as HTTP query or Referer.
  return host + "/admin/restablecer-clave#token=" + encodeURIComponent(token);
}

export async function sendPasswordRecoveryEmail(to, token) {
  if (!env.brevo.apiKey || !env.brevo.senderEmail) {
    throw new Error("Proveedor de correo de recuperación no configurado");
  }
  const url = recoveryUrl(token);
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": env.brevo.apiKey,
    },
    body: JSON.stringify({
      sender: { name: env.brevo.senderName, email: env.brevo.senderEmail },
      to: [{ email: to }],
      subject: "Recuperación de acceso · Casa Huéspedes Pimentel",
      htmlContent: `<html><body style="font-family:Arial,sans-serif;color:#10263f;padding:24px">
      <h2>Recuperar acceso</h2>
      <p>Se solicitó restablecer la contraseña de una cuenta del panel de Casa Huéspedes Pimentel.</p>
      <p><a href="${url}" style="color:#10263f">Restablecer contraseña</a></p>
      <p>El enlace vence en 15 minutos y solo funciona una vez. Si no lo solicitaste, ignora este correo.</p>
      </body></html>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    // No include the provider response: it may echo addresses or content.
    throw new Error("Proveedor de correo rechazó el envío");
  }
  return true;
}
