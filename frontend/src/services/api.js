import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;

export async function getRooms() {
  try {
    const response = await api.get("/rooms");
    return response.data.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Error al obtener habitaciones."
    );
  }
}

export async function createBooking(bookingData) {
  try {
    const response = await api.post("/bookings", bookingData);
    return response.data.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "La habitación no está disponible para esas fechas. Elige otra fecha u otra habitación."
    );
  }
}

export async function getBookings() {
  try {
    const response = await api.get("/bookings");
    return response.data.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Error al obtener reservas."
    );
  }
}

export async function updateBookingStatus(id, status) {
  try {
    const response = await api.put(`/bookings/${id}/status`, { status });
    return response.data.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Error al actualizar la reserva."
    );
  }
}

export async function createInquiry(inquiryData) {
  try {
    const response = await api.post("/inquiries", inquiryData);
    return response.data.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Error al registrar la consulta."
    );
  }
}

export async function getInquiries() {
  try {
    const response = await api.get("/inquiries");
    return response.data.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Error al obtener consultas."
    );
  }
}

export async function updateInquiryStatus(id, status) {
  try {
    const response = await api.put(`/inquiries/${id}/status`, { status });
    return response.data.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Error al actualizar la consulta."
    );
  }
}

export async function getAvailabilitySettings() {
  try {
    const response = await api.get("/settings/availability");
    return response.data.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Error al obtener configuración de horarios."
    );
  }
}

export async function updateAvailabilitySettings(settingsData) {
  try {
    const response = await api.put("/settings/availability", settingsData);
    return response.data.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Error al actualizar configuración de horarios."
    );
  }
}

export async function getBlockedSlots() {
  try {
    const response = await api.get("/blocked-slots");
    return response.data.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Error al obtener bloqueos."
    );
  }
}

export async function createBlockedSlot(blockedSlotData) {
  try {
    const response = await api.post("/blocked-slots", blockedSlotData);
    return response.data.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Error al crear bloqueo."
    );
  }
}

export async function deleteBlockedSlot(id) {
  try {
    const response = await api.delete(`/blocked-slots/${id}`);
    return response.data.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Error al eliminar bloqueo."
    );
  }
}

export async function loginAdmin(credentials) {
  try {
    const response = await api.post("/auth/login", credentials);
    return response.data.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "No se pudo iniciar sesión."
    );
  }
}

export async function getDashboardData() {
  try {
    const [bookings, inquiries, rooms] = await Promise.all([
      getBookings(),
      getInquiries(),
      getRooms(),
    ]);

    return {
      bookings,
      inquiries,
      rooms,
    };
  } catch (error) {
    throw new Error(
      error.message || "Error al cargar información del dashboard."
    );
  }
}

export async function getRoomAvailability({ check_in, nights, check_in_time }) {
  try {
    const params = new URLSearchParams();

    if (check_in) params.append("check_in", check_in);
    if (nights) params.append("nights", nights);
    if (check_in_time) params.append("check_in_time", check_in_time);

    const response = await api.get(`/availability?${params.toString()}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Error al consultar disponibilidad de habitaciones."
    );
  }
}
