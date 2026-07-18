// Esta función calcula cuántas noches hay entre fecha de entrada y salida
export function calculateNights(checkIn, checkOut) {
  // Convertimos las fechas recibidas a objetos Date
  const startDate = new Date(checkIn);
  const endDate = new Date(checkOut);

  // Calculamos la diferencia en milisegundos
  const differenceInMs = endDate - startDate;

  // Convertimos milisegundos a días
  const nights = differenceInMs / (1000 * 60 * 60 * 24);

  // Devolvemos la cantidad de noches
  return nights;
}