import { env } from "../../config/env.js";

/**
 * Casa Huéspedes Pimentel usa el asesor virtual las 24 horas, los 7 días.
 * Se conserva esta función como punto único de decisión para no romper
 * integraciones existentes que ya la consumen.
 */
export function isAiServiceTime(_date = new Date()) {
  return true;
}

function whatsappNumber() {
  const configured = String(env.hotel.phone || "901551287").trim();
  const digits = configured.replace(/\D/g, "");

  if (digits.length === 9) return `51${digits}`;
  if (digits.startsWith("51")) return digits;
  return digits || "51901551287";
}

export function buildHumanServiceRedirect(channel = "web") {
  const waNumber = whatsappNumber();
  const displayPhone = `+${waNumber.slice(0, 2)} ${waNumber.slice(2, 5)} ${waNumber.slice(5, 8)} ${waNumber.slice(8)}`;

  if (channel === "whatsapp") {
    return [
      `¡Hola! Gracias por comunicarte con ${env.hotel.name}.`,
      "Nuestro asesor virtual está disponible las 24 horas, todos los días.",
      "Si solicitas atención humana, el asistente automático se pausará en esta conversación mientras te atiende una persona.",
      `WhatsApp: ${displayPhone}`,
    ].join("\n\n");
  }

  return [
    `¡Hola! Gracias por comunicarte con ${env.hotel.name}.`,
    "Nuestro asesor virtual está disponible las 24 horas, todos los días.",
    "Si deseas atención humana, puedes solicitarla en cualquier momento.",
    `También puedes comunicarte por WhatsApp al ${displayPhone}: https://wa.me/${waNumber}`,
  ].join("\n\n");
}
