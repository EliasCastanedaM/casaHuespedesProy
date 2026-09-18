import { env } from "../../config/env.js";

function parseClock(value, fallback) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || "").trim());
  if (!match) return fallback;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return fallback;
  }

  return hour * 60 + minute;
}

function localMinutes(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

export function isAiServiceTime(date = new Date()) {
  const start = parseClock(env.ai.serviceStart, 23 * 60);
  const end = parseClock(env.ai.serviceEnd, 8 * 60);
  const current = localMinutes(date, env.ai.timeZone || "America/Lima");

  // Un mismo inicio y fin se interpreta como servicio durante todo el día.
  if (start === end) return true;
  if (start < end) return current >= start && current < end;

  // Rango que cruza medianoche, por ejemplo 23:00 -> 08:00.
  return current >= start || current < end;
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
  const schedule = `${env.ai.serviceStart || "23:00"} a ${env.ai.serviceEnd || "08:00"}`;

  if (channel === "whatsapp") {
    return [
      `¡Hola! Gracias por comunicarte con ${env.hotel.name}.`,
      `Nuestro asesor virtual atiende de ${schedule}.`,
      "En este horario la atención corresponde a nuestro equipo humano. Puedes continuar escribiéndonos por este mismo chat.",
      `WhatsApp: ${displayPhone}`,
    ].join("\n\n");
  }

  return [
    `¡Hola! Gracias por comunicarte con ${env.hotel.name}.`,
    `Nuestro asesor virtual atiende de ${schedule}.`,
    "En este horario la atención corresponde a nuestro equipo humano.",
    `Puedes comunicarte por WhatsApp al ${displayPhone}: https://wa.me/${waNumber}`,
  ].join("\n\n");
}
