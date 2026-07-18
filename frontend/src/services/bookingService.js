// Importamos la instancia base de axios
import api from "./api";

// Esta función consulta si una habitación está disponible para ciertas fechas
export async function checkAvailability({ room_id, check_in, check_out }) {
  // Enviamos room_id, check_in y check_out al backend
  const response = await api.post("/bookings/check-availability", {
    room_id,
    check_in,
    check_out,
  });

  // Retornamos la respuesta del backend
  return response.data;
}

// Esta función crea una reserva pendiente de pago
export async function createBooking(bookingData) {
  // Enviamos toda la información de reserva al backend
  const response = await api.post("/bookings", bookingData);

  // Retornamos la reserva creada
  return response.data;
}