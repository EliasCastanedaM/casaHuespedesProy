// Importamos la configuración base de axios
import api from "./api";

// Esta función obtiene todas las habitaciones desde el backend.
// Consume GET http://localhost:4000/api/rooms
export async function getRooms() {
  const response = await api.get("/rooms");
  return response.data.data;
}

// Alias para compatibilidad con otros componentes
export async function getAllRooms() {
  return await getRooms();
}

// Esta función obtiene una habitación por ID.
// Consume GET http://localhost:4000/api/rooms/:id
export async function getRoomById(id) {
  const response = await api.get(`/rooms/${id}`);
  return response.data.data;
}