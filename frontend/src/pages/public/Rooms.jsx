// useEffect permite ejecutar una función cuando carga la página
// useState permite guardar datos dentro del componente
import { useEffect, useState } from "react";

// Importamos el servicio que obtiene habitaciones desde el backend
import { getRooms } from "../../services/roomService";

// Importamos la tarjeta visual de habitación
import RoomCard from "../../components/RoomCard";

// Página pública donde se mostrarán todas las habitaciones
export default function Rooms() {
  // Estado donde guardaremos las habitaciones recibidas desde el backend
  const [rooms, setRooms] = useState([]);

  // Estado para saber si la página está cargando información
  const [loading, setLoading] = useState(true);

  // Estado para guardar algún mensaje de error
  const [error, setError] = useState("");

  // Esta función obtiene las habitaciones desde el backend
  async function loadRooms() {
    try {
      // Activamos el estado de carga
      setLoading(true);

      // Limpiamos errores anteriores
      setError("");

      // Pedimos habitaciones al backend
      const data = await getRooms();

      // Guardamos las habitaciones en el estado
      setRooms(data);
    } catch (err) {
      // Mostramos el error técnico en consola para depurar
      console.error("Error cargando habitaciones:", err);

      // Mostramos un mensaje amigable al usuario
      setError("No se pudieron cargar las habitaciones. Revisa si el backend está encendido.");
    } finally {
      // Terminamos la carga
      setLoading(false);
    }
  }

  // Ejecutamos loadRooms cuando se abre la página por primera vez
  useEffect(() => {
    loadRooms();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      
      {/* Encabezado de la página */}
      <div className="mb-10">
        <p className="text-brand-blue font-semibold">Hospedaje disponible</p>

        <h1 className="text-4xl font-bold text-brand-dark mt-2">
          Habitaciones
        </h1>

        <p className="mt-3 text-gray-600 max-w-2xl">
          Consulta las habitaciones disponibles de Casa Huéspedes Pimentel.
          Luego podrás seleccionar fechas y confirmar tu reserva online.
        </p>
      </div>

      {/* Mensaje mientras cargan las habitaciones */}
      {loading && (
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <p className="text-gray-600">Cargando habitaciones...</p>
        </div>
      )}

      {/* Mensaje si ocurre error */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6">
          {error}
        </div>
      )}

      {/* Mensaje si no hay habitaciones registradas */}
      {!loading && !error && rooms.length === 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <p className="text-gray-600">
            Aún no hay habitaciones registradas.
          </p>
        </div>
      )}

      {/* Tarjetas de habitaciones */}
      {!loading && !error && rooms.length > 0 && (
        <div className="grid md:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </div>
  );
}