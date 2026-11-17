import { HUMAN_ATTENTION_PHONE } from "./ai.human-assistance.js";

export const PAYMENT_AVAILABILITY_WARNING = "⚠️ ATENCIÓN: No realices pagos sin que nuestro equipo haya confirmado la disponibilidad para las fechas de tu estadía. Consulta aquí: " + HUMAN_ATTENTION_PHONE + ".";

const clean=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const MANUAL=/\b(?:yape|yapee|plin|bcp|cci|transferencia|transferi|transferido|bank transfer)\b/;
const PROPERTY=/\b(?:en (?:el )?(?:establecimiento|hotel|hospedaje)|al llegar|a la llegada|pay (?:at (?:the )?(?:property|hotel)|on arrival))\b/;
function isPropertyPaymentQuestion(message) {
  const text=clean(message);
  return PROPERTY.test(text) && /\b(?:pagar|pago|pagamos|pay)\b/.test(text) &&
    (/[?¿]/.test(message) || /\b(?:puedo|podemos|se puede|es posible|aceptan|can i|can we)\b/.test(text));
}


function isPaymentLinkQuestion(message) {
  const text=clean(message);
  return /\b(?:pagar|pago|pagos|pay|payment)\b/.test(text) &&
    /\b(?:ahora|link|enlace|now|online)\b/.test(text) &&
    (/[?¿]/.test(message) || /\b(?:puedo|podemos|como|existe|hay|can i|can we)\b/.test(text));
}

export function paymentInformationType(message) {
  const text=clean(message);
  if(isPropertyPaymentQuestion(message)||isPaymentLinkQuestion(message))return "payment_information";
  const topic=/\b(?:(?:formas?|metodos?|medios?|opciones?) de pago|payment methods?|formas de pagamento|moyens de paiement|cuenta bancaria|cuenta de ahorros|bank account|bank transfer|numero de cuenta|yape|yapee|plin|bcp|cci|visa|mastercard|tarjetas?|cards?|efectivo|cash|transferencia)\b/.test(text);
  const general=/\b(?:como (?:puedo |podemos |se )?pagar|con que (?:puedo |se )?pagar|aceptan pagos|how (?:can i|to) pay)\b/.test(text);
  if(!topic&&!general)return null;
  if(MANUAL.test(text) && !/[?¿]/.test(message) &&
      /\b(?:ya pague|he pagado|pague|ya (?:hice|realice|envie)|transferi|he transferido|yapee|payment sent|i paid|i have paid|ja paguei|j ai paye)\b/.test(text)) return "manual_payment_report";
  if(MANUAL.test(text) && !/[?¿]/.test(message) &&
      /\b(?:quiero pagar|deseo pagar|quisiera pagar|prefiero pagar|pagare|i want to pay|quero pagar|je veux payer)\b/.test(text)) return "manual_payment_request";
  if (!/[?¿]/.test(message) && !MANUAL.test(text) &&
      /\b(?:pagar ahora|pago ahora|pagar (?:en el |al llegar|en )|pagar en efectivo|pay now|pay at property)\b/.test(text)) return null;
  // A card method is information, not authorization to register a booking.
  return "payment_information";
}

function safePaymentInfo(info) {
  return info && /^\d{14}$/.test(info.bank?.account_number || "") &&
    /^\d{20}$/.test(info.bank?.cci || "") && Array.isArray(info.cards) && /^\d{9}$/.test(info.yape || "") && /^\d{9}$/.test(info.plin || "");
}
const phone=value=>"+51 "+value.replace(/(\d{3})(\d{3})(\d{3})/,"$1 $2 $3");

export function formatHotelPaymentInfoReply(info,message) {
  if(!safePaymentInfo(info))return "No puedo confirmar los datos de pago en este momento.\n\n" + PAYMENT_AVAILABILITY_WARNING;
  const text=clean(message);
  if (/\b(?:titular|a nombre de|a quien pertenece)\b/.test(text)) return "Nuestro equipo debe confirmar el nombre del titular de la cuenta antes de que realices una transferencia.";
  // A payment question reports an available method, never a booking state.
  if(isPropertyPaymentQuestion(message))return /\b(?:efectivo|cash)\b/.test(text)
    ? "Sí, puedes pagar en efectivo en el establecimiento."
    : "Sí, puedes pagar en el establecimiento.";
  if(isPaymentLinkQuestion(message))return "El enlace de pago se facilita durante el proceso de reserva, después de que nuestro equipo confirme la disponibilidad y el importe.\n\n" + PAYMENT_AVAILABILITY_WARNING;
  const bank=/\b(?:bcp|cci|cuenta|transferencia|bank account|bank transfer)\b/.test(text);
  const yape=/\byape\b/.test(text),plin=/\bplin\b/.test(text);
  const cards=/\b(?:tarjeta|tarjetas|visa|mastercard|cards?)\b/.test(text);
  const cash=/\b(?:efectivo|cash)\b/.test(text);
  const specific=bank||yape||plin||cards||cash;
  const lines=[];
  if(!specific||cash)lines.push("Efectivo.");
  if(!specific||bank)lines.push("Transferencia a cuenta de ahorros "+info.bank.name+": "+info.bank.account_number,"CCI: "+info.bank.cci);
  if(!specific||yape)lines.push("Yape: "+phone(info.yape));
  if(!specific||plin)lines.push("Plin: "+phone(info.plin));
  if(!specific||cards)lines.push("Tarjetas: "+info.cards.filter(c=>["Visa","Mastercard"].includes(c)).join(" y ")+".");
  return ["Estos son los medios de pago de Casa Huéspedes:",...lines,"",PAYMENT_AVAILABILITY_WARNING].join("\n");
}

export function manualPaymentReviewReply(type) {
  return type==="manual_payment_report"
    ? "Gracias por avisarnos. Nuestro equipo revisará el movimiento y lo asociará a tu reserva antes de confirmar el pago. Conservé los datos de tu solicitud para que continúen contigo."
    : "Nuestro equipo coordinará contigo este medio de pago y confirmará el importe y los datos de tu reserva antes de que realices el abono.";
}
