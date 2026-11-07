const clean=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const MANUAL=/\b(?:yape|yapee|plin|bcp|cci|transferencia|transferi|transferido|bank transfer)\b/;

export function paymentInformationType(message) {
  const text=clean(message);
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
  if(!safePaymentInfo(info))return "No puedo confirmar los datos de pago en este momento. Nuestro equipo puede compartirte los medios vigentes antes de realizar el pago.";
  const text=clean(message);
  if (/\b(?:titular|a nombre de|a quien pertenece)\b/.test(text)) return "Nuestro equipo debe confirmar el nombre del titular de la cuenta antes de que realices una transferencia.";
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
  return ["Estos son los medios de pago de Casa Huéspedes:",...lines,"","Antes de realizar un pago de reserva, nuestro equipo confirmará la disponibilidad, el importe y las indicaciones correspondientes."].join("\n");
}

export function manualPaymentReviewReply(type) {
  return type==="manual_payment_report"
    ? "Gracias por avisarnos. Nuestro equipo revisará el movimiento y lo asociará a tu reserva antes de confirmar el pago. Conservé los datos de tu solicitud para que continúen contigo."
    : "Nuestro equipo coordinará contigo este medio de pago y confirmará el importe y los datos de tu reserva antes de que realices el abono.";
}
