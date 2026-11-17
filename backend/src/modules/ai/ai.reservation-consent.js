export function acceptsReservationOffer(message) {
  const text=String(message || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[¡!¿?,.;:«»"“”]/g,' ').replace(/\s+/g,' ').trim();
  return /^(?:(?:si )?(?:quiero|deseo|quisiera|me gustaria) (?:reservar(?: (?:esa|esta|la) (?:habitacion|opcion))?|(?:esa|esta) habitacion)|si quiero|si (?:reservemos|reservenla)|(?:yes )?(?:i want to book|book it)|sim quero reservar|oui je veux reserver)(?: por favor| please)?$/.test(text);
}
export function reservationOfferQuestion(language='es',multiple=false) {
  return ({
    es:multiple ? '¿Quieres continuar con la reserva de estas habitaciones? Para confirmar, responde «sí quiero».' : '¿Quieres reservar esta habitación? Para confirmar, responde «sí quiero».',
    en:multiple ? 'Would you like to reserve these rooms? To confirm your interest, reply “yes, I want to book”.' : 'Would you like to reserve this room? To confirm your interest, reply “yes, I want to book”.',
    pt:'Quer reservar? Para confirmar seu interesse, responda “sim, quero reservar”.',
    fr:'Souhaitez-vous réserver ? Pour confirmer votre intérêt, répondez « oui, je veux réserver ».',
  })[language] || reservationOfferQuestion('es',multiple);
}
export function reservationInterestReply(language='es') {
  return ({
    es:'¡Perfecto! 😊 Nuestro equipo te confirmará la disponibilidad en breve y se comunicará contigo para continuar con la reserva. ¿Tienes alguna otra duda?',
    en:'Perfect! 😊 Our team will confirm availability shortly and contact you to continue with the reservation. Do you have any other questions?',
    pt:'Perfeito! 😊 Nossa equipe confirmará a disponibilidade em breve e entrará em contato para continuar com a reserva. Tem mais alguma dúvida?',
    fr:'Parfait ! 😊 Notre équipe confirmera les disponibilités prochainement et vous contactera pour poursuivre la réservation. Avez-vous une autre question ?',
  })[language] || reservationInterestReply('es');
}
