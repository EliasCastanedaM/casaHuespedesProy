export const ROOMS_PAGE_URL = "https://www.casahuespedespimentel.com/habitaciones";

export function appendRoomInvitation(reply, language = "es") {
  if (!reply || reply.includes(ROOMS_PAGE_URL)) return reply;
  const invitation = {
    es: "¿Quieres saber cómo son nuestras habitaciones? Ingresa a este enlace:",
    en: "Want to see what our rooms are like? Visit this link:",
    pt: "Quer conhecer nossos quartos? Acesse este link:",
    fr: "Vous souhaitez découvrir nos chambres ? Consultez ce lien :",
  }[language] || "¿Quieres saber cómo son nuestras habitaciones? Ingresa a este enlace:";
  return reply + "\n\n" + invitation + "\n" + ROOMS_PAGE_URL;
}
