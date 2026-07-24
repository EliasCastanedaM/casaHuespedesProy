import api from "./api";

// Consulta si una habitación está disponible.
export async function checkAvailability({
  room_id,
  check_in,
  check_out,
}) {
  const response = await api.post(
    "/bookings/check-availability",
    {
      room_id,
      check_in,
      check_out,
    }
  );

  // Aquí estaba el error.
  return response.data.data;
}

// Crea una reserva pendiente de pago.
export async function createBooking(bookingData) {
  const response = await api.post(
    "/bookings",
    bookingData
  );

  return response.data;
}

// Avisa que el huésped terminó el pago en Culqi.
export async function reportBookingPayment({
  bookingId,
  publicToken,
}) {
  const response = await api.post(
    `/bookings/${bookingId}/report-payment`,
    {
      public_token: publicToken,
    }
  );

  return response.data;
}

// Consulta el estado público del pago.
export async function getBookingPaymentStatus({
  bookingId,
  publicToken,
}) {
  const response = await api.get(
    `/bookings/${bookingId}/payment-status`,
    {
      params: {
        token: publicToken,
      },
    }
  );

  return response.data;
}