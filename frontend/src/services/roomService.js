// Importamos la configuración base de axios
import api from "./api";

// Devuelve las categorías comerciales visibles en la web.
export async function getRoomCategories() {
  const response = await api.get("/rooms/categories");
  return response.data.data;
}

export async function getRoomCategoryBySlug(slug) {
  const response = await api.get(`/rooms/categories/${slug}`);
  return response.data.data;
}
