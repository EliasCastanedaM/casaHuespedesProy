import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getRoomAvailability,
  getRooms,
} from "../../services/api";
import "./Home.css";

const includedServices = [
  {
    icon: "☕",
    title: "Cafetería",
    description: "Espacio cómodo para iniciar el día durante la estadía.",
  },
  {
    icon: "🚿",
    title: "Baño privado",
    description: "Habitaciones con baño privado para mayor comodidad.",
  },
  {
    icon: "📶",
    title: "WiFi",
    description: "Conectividad disponible para huéspedes.",
  },
  {
    icon: "🌅",
    title: "Terraza",
    description: "Terraza con vista al mar para disfrutar Pimentel.",
  },
];

const extraServices = [
  {
    title: "Cocina equipada",
    image:
      "https://images.unsplash.com/photo-1556911220-bff31c812dba?q=80&w=1200&auto=format&fit=crop",
    description:
      "Ambiente equipado para preparar alimentos durante la estadía.",
  },
  {
    title: "Lavado y planchado",
    image:
      "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?q=80&w=1200&auto=format&fit=crop",
    description: "Servicio de lavandería previa coordinación con el hospedaje.",
  },
  {
    title: "Taxi y estacionamiento",
    image:
      "https://images.unsplash.com/photo-1494515843206-f3117d3f51b7?q=80&w=1200&auto=format&fit=crop",
    description:
      "Apoyo en movilidad local y orientación sobre estacionamiento cercano.",
  },
];

const galleryImages = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=900&auto=format&fit=crop",
];

const ROOM_ORDER = [
  "101",
  "201",
  "202",
  "203",
  "205",
  "301",
  "302",
  "303",
  "304",
  "305",
  "405",
  "407",
  "505",
];

const fallbackRoomImage =
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1200&auto=format&fit=crop";

const ROOM_DETAILS = {
  101: {
    name: "Habitación Matrimonial #101",
    roomType: "Matrimonial",
    floorLabel: "Primer piso",
    floorNumber: 1,
    bedType: "1 cama de dos plazas",
    capacity: 2,
    description:
      "Habitación matrimonial ubicada en el primer piso, preparada para 2 personas y equipada con baño privado.",
    locationDetail: "Ubicada en el primer piso.",
    amenities: [
      "Baño privado",
      "Ducha con agua fría y caliente",
      "Smart TV",
      "Ventilador",
      "Veladores",
      "Ropero",
    ],
  },
  201: {
    name: "Habitación Doble #201",
    roomType: "Doble",
    floorLabel: "Segundo piso",
    floorNumber: 2,
    bedType: "2 camas de plaza y media",
    capacity: 2,
    description:
      "Habitación doble ubicada en el segundo piso, con dos camas de plaza y media y capacidad para 2 personas.",
    locationDetail: "Ubicada en el segundo piso.",
    amenities: [
      "Baño privado",
      "Smart TV",
      "Ventilador",
      "Mesa de noche",
      "Ropero",
    ],
  },
  202: {
    name: "Habitación Triple #202",
    roomType: "Triple",
    floorLabel: "Segundo piso",
    floorNumber: 2,
    bedType: "3 camas de plaza y media",
    capacity: 3,
    description:
      "Habitación triple ubicada en el segundo piso, con tres camas de plaza y media y capacidad para 3 personas.",
    locationDetail: "Ubicada en el segundo piso.",
    amenities: ["Baño privado", "Smart TV", "Ventilador", "Ropero"],
  },
  203: {
    name: "Habitación Familiar #203",
    roomType: "Familiar",
    floorLabel: "Segundo piso",
    floorNumber: 2,
    bedType: "2 camas de dos plazas y 3 camas de plaza y media",
    capacity: 7,
    description:
      "Habitación familiar ubicada en el segundo piso. Cuenta con cinco camas y capacidad máxima para 7 personas.",
    locationDetail: "Ubicada en el segundo piso.",
    amenities: ["Baño privado", "Smart TV", "Ventiladores", "Ropero"],
  },
  205: {
    name: "Habitación Matrimonial #205",
    roomType: "Matrimonial",
    floorLabel: "Segundo piso",
    floorNumber: 2,
    bedType: "1 cama de dos plazas",
    capacity: 2,
    description:
      "Habitación matrimonial ubicada en el segundo piso, con una cama de dos plazas y capacidad para 2 personas.",
    locationDetail: "Ubicada en el segundo piso.",
    amenities: [
      "Baño privado",
      "Smart TV",
      "Ventilador",
      "Mesa de noche",
      "Ropero",
    ],
  },
  301: {
    name: "Habitación Doble #301",
    roomType: "Doble",
    floorLabel: "Tercer piso",
    floorNumber: 3,
    bedType: "2 camas de plaza y media",
    capacity: 2,
    description:
      "Habitación doble ubicada en el tercer piso, con dos camas de plaza y media y capacidad para 2 personas.",
    locationDetail: "Ubicada en el tercer piso.",
    amenities: [
      "Baño privado",
      "Smart TV",
      "Ventilador",
      "Mesa de noche",
      "Ropero",
    ],
  },
  302: {
    name: "Habitación Triple #302",
    roomType: "Triple",
    floorLabel: "Tercer piso",
    floorNumber: 3,
    bedType: "3 camas de plaza y media",
    capacity: 3,
    description:
      "Habitación triple ubicada en el tercer piso, con tres camas de plaza y media y capacidad para 3 personas.",
    locationDetail: "Ubicada en el tercer piso.",
    amenities: ["Baño privado", "Smart TV", "Ropero", "Velador"],
  },
  303: {
    name: "Habitación Triple #303",
    roomType: "Triple",
    floorLabel: "Tercer piso",
    floorNumber: 3,
    bedType: "3 camas de plaza y media",
    capacity: 3,
    description:
      "Habitación triple ubicada en el tercer piso, con tres camas de plaza y media y capacidad para 3 personas.",
    locationDetail: "Ubicada en el tercer piso.",
    amenities: ["Baño privado", "Smart TV", "Ventilador", "Ropero"],
  },
  304: {
    name: "Habitación Matrimonial #304",
    roomType: "Matrimonial",
    floorLabel: "Tercer piso",
    floorNumber: 3,
    bedType: "1 cama de dos plazas",
    capacity: 2,
    description:
      "Habitación matrimonial ubicada en el tercer piso, con una cama de dos plazas y capacidad para 2 personas.",
    locationDetail: "Ubicada en el tercer piso.",
    amenities: ["Baño privado", "Smart TV", "Ventilador"],
  },
  305: {
    name: "Habitación Matrimonial #305",
    roomType: "Matrimonial",
    floorLabel: "Tercer piso",
    floorNumber: 3,
    bedType: "1 cama de dos plazas",
    capacity: 2,
    description:
      "Habitación matrimonial ubicada en el tercer piso, con una cama de dos plazas y capacidad para 2 personas.",
    locationDetail: "Ubicada en el tercer piso.",
    amenities: [
      "Baño privado",
      "Smart TV",
      "Ventilador",
      "Velador",
      "Ropero",
    ],
  },
  405: {
    name: "Habitación Familiar #405",
    roomType: "Familiar",
    floorLabel: "Terraza",
    floorNumber: 4,
    bedType: "1 cama de dos plazas y 3 camas de plaza y media",
    capacity: 5,
    description:
      "Habitación familiar ubicada en la terraza, con cuatro camas y capacidad máxima para 5 personas.",
    locationDetail: "Ubicada en la terraza.",
    hasTerrace: true,
    amenities: [
      "Baño privado",
      "Smart TV",
      "Ropero",
      "Velador",
      "Ubicación en terraza",
    ],
  },
  407: {
    name: "Habitación Triple #407",
    roomType: "Triple",
    floorLabel: "Segundo piso",
    floorNumber: 2,
    bedType: "3 camas de plaza y media",
    capacity: 3,
    description:
      "Habitación triple ubicada en el segundo piso, con tres camas de plaza y media y capacidad para 3 personas.",
    locationDetail: "Ubicada en el segundo piso.",
    amenities: ["Baño privado", "Smart TV", "Ventilador", "Ropero"],
  },
  505: {
    name: "Habitación Matrimonial #505",
    roomType: "Matrimonial",
    floorLabel: "Quinto piso",
    floorNumber: 5,
    bedType: "1 cama de dos plazas",
    capacity: 2,
    description:
      "Habitación matrimonial ubicada en el quinto piso, con una cama de dos plazas y capacidad para 2 personas.",
    locationDetail: "Ubicada en el quinto piso.",
    amenities: ["Baño privado", "Smart TV", "Ropero", "Mesas de noche"],
  },
};

function buildCatalogRooms(databaseRooms) {
  const roomsByNumber = new Map();

  databaseRooms.forEach((room) => {
    const roomNumber = extractRoomNumber(room);

    if (ROOM_DETAILS[roomNumber]) {
      roomsByNumber.set(roomNumber, room);
    }
  });

  return ROOM_ORDER.map((roomNumber, index) => {
    const databaseRoom = roomsByNumber.get(roomNumber);
    const details = ROOM_DETAILS[roomNumber];

    return {
      ...databaseRoom,
      id: databaseRoom?.id ?? `catalog-${roomNumber}`,
      databaseId: databaseRoom?.id ?? null,
      room_number: roomNumber,
      name: details.name,
      description: details.description,
      capacity: details.capacity,
      room_type: details.roomType,
      floor_label: details.floorLabel,
      floor_number: details.floorNumber,
      bed_type: details.bedType,
      amenities: details.amenities,
      display_order: index + 1,
      main_image_url: databaseRoom?.main_image_url || fallbackRoomImage,
      status: databaseRoom?.status || "catalog",
    };
  });
}

function extractRoomNumber(room) {
  if (room?.room_number) return String(room.room_number);
  const match = String(room?.name || "").match(/(?:#|hab(?:itaci[oó]n)?\.?\s*)?(101|201|202|203|205|301|302|303|304|305|405|407|505)\b/i);
  return match?.[1] || String(room?.id || "");
}

function normalizeAmenities(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value || typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    // Puede venir como arreglo de PostgreSQL convertido a texto.
  }

  return value
    .replace(/^\{?|\}?$/g, "")
    .split(",")
    .map((item) => item.replace(/^"|"$/g, "").trim())
    .filter(Boolean);
}

function getRoomDetails(room) {
  const roomNumber = extractRoomNumber(room);
  const catalogDetails = ROOM_DETAILS[roomNumber] || {};
  const databaseAmenities = normalizeAmenities(room?.amenities);

  return {
    roomNumber,
    name: catalogDetails.name || room?.name || "Habitación",
    description:
      catalogDetails.description || room?.description || "Información disponible próximamente.",
    roomType: catalogDetails.roomType || room?.room_type || "Habitación",
    floorLabel: catalogDetails.floorLabel || room?.floor_label || "Pimentel",
    floorNumber: Number(catalogDetails.floorNumber || room?.floor_number || 99),
    bedType: catalogDetails.bedType || room?.bed_type || "Distribución por confirmar",
    capacity: Number(catalogDetails.capacity || room?.capacity || 1),
    locationDetail:
      catalogDetails.locationDetail || `Ubicada en ${catalogDetails.floorLabel || "Pimentel"}.`,
    hasTerrace: Boolean(catalogDetails.hasTerrace),
    amenities:
      catalogDetails.amenities?.length > 0
        ? catalogDetails.amenities
        : databaseAmenities,
  };
}

function getTomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
}

function normalizeRoomStatus(room, hasDateSelected) {
  if (!room) return "idle";

  if (!hasDateSelected) return "idle";

  const status = room.availability_status || room.status;

  if (status === "available") return "available";
  if (status === "blocked") return "blocked";
  if (status === "maintenance") return "blocked";
  if (status === "inactive") return "blocked";

  return status === "active" ? "available" : "blocked";
}

export default function Home() {
  const navigate = useNavigate();

  const [isSupportOpen, setIsSupportOpen] = useState(false);

  const [availableRooms, setAvailableRooms] = useState([]);
  const [floorRooms, setFloorRooms] = useState([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  const [bookingError, setBookingError] = useState("");

  const [bookingForm, setBookingForm] = useState({
    room_id: "",
    check_in: "",
    check_in_time: "14:00",
    nights: 1,
    guests_count: 1,
  });

  const hasDateSelected =
    Boolean(bookingForm.check_in) &&
    Boolean(bookingForm.nights) &&
    Number(bookingForm.nights) > 0;

  useEffect(() => {
    async function loadRooms() {
      try {
        setIsLoadingRooms(true);

        const roomsData = await getRooms();
        const databaseRooms = Array.isArray(roomsData) ? roomsData : [];
        const catalogRooms = buildCatalogRooms(databaseRooms);

        setAvailableRooms(catalogRooms);
        setFloorRooms(
          catalogRooms.map((room) => ({
            ...room,
            availability_status: "idle",
          }))
        );
      } catch (error) {
        console.error(error);
        setBookingError(
          "No se pudieron cargar las habitaciones desde la base de datos."
        );
      } finally {
        setIsLoadingRooms(false);
      }
    }

    loadRooms();
  }, []);

  useEffect(() => {
    async function checkAvailability() {
      if (!hasDateSelected) {
        setAvailabilityError("");

        setFloorRooms(
          availableRooms.map((room) => ({
            ...room,
            availability_status: "idle",
          }))
        );

        return;
      }

      try {
        setIsCheckingAvailability(true);
        setAvailabilityError("");

        const result = await getRoomAvailability({
          check_in: bookingForm.check_in,
          nights: bookingForm.nights,
          check_in_time: bookingForm.check_in_time,
        });

        const roomsResult = Array.isArray(result) ? result : result.rooms || [];
        const availabilityById = new Map(
          roomsResult.map((room) => [String(room.id), room])
        );

        setFloorRooms(
          availableRooms.map((room) => {
            const availabilityRoom = room.databaseId
              ? availabilityById.get(String(room.databaseId))
              : null;

            return {
              ...room,
              availability_status:
                availabilityRoom?.availability_status || "idle",
            };
          })
        );
      } catch (error) {
        console.error(error);

        setAvailabilityError(
          "No se pudo validar la disponibilidad en tiempo real. Se muestran las habitaciones activas."
        );

        setFloorRooms(
          availableRooms.map((room) => ({
            ...room,
            availability_status: "available",
          }))
        );
      } finally {
        setIsCheckingAvailability(false);
      }
    }

    checkAvailability();
  }, [
    bookingForm.check_in,
    bookingForm.nights,
    bookingForm.check_in_time,
    availableRooms,
    hasDateSelected,
  ]);

  const featuredRooms = useMemo(() => {
    return [...availableRooms]
      .sort((firstRoom, secondRoom) => {
        const firstDetails = getRoomDetails(firstRoom);
        const secondDetails = getRoomDetails(secondRoom);
        const firstOrder = Number(firstRoom.display_order || 9999);
        const secondOrder = Number(secondRoom.display_order || 9999);

        return (
          firstOrder - secondOrder ||
          firstDetails.floorNumber - secondDetails.floorNumber ||
          Number(firstDetails.roomNumber) - Number(secondDetails.roomNumber)
        );
      });
  }, [availableRooms]);

  function handleBookingChange(event) {
    const { name, value } = event.target;

    setBookingError("");

    setBookingForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  }

  function handleSelectRoom(room) {
    const roomStatus = normalizeRoomStatus(room, hasDateSelected);

    if (!room.databaseId) {
      setBookingError(
        `La habitación ${getRoomDetails(room).roomNumber} está visible en el catálogo, pero aún debe habilitarse en Supabase para reservarla en línea.`
      );
      return;
    }

    if (roomStatus === "blocked") return;

    setBookingError("");

    setBookingForm((prevForm) => ({
      ...prevForm,
      room_id: String(room.id),
      guests_count:
        Number(prevForm.guests_count) > Number(room.capacity || 1)
          ? room.capacity || 1
          : prevForm.guests_count,
    }));
  }

  function goToAvailability() {
    const section = document.getElementById("disponibilidad");

    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  function handleContinueToBooking(event) {
    event.preventDefault();

    setBookingError("");

    if (!bookingForm.room_id) {
      setBookingError("Selecciona una habitación para continuar con la reserva.");
      return;
    }

    if (
      !bookingForm.check_in ||
      !bookingForm.nights ||
      !bookingForm.guests_count
    ) {
      setBookingError("Selecciona fecha, noches y cantidad de huéspedes.");
      return;
    }

    if (Number(bookingForm.nights) <= 0) {
      setBookingError("La cantidad de noches debe ser mayor a cero.");
      return;
    }

    if (Number(bookingForm.guests_count) <= 0) {
      setBookingError("La cantidad de huéspedes debe ser mayor a cero.");
      return;
    }

    const selectedRoom = floorRooms.find(
      (room) => String(room.id) === String(bookingForm.room_id)
    );

    if (selectedRoom && !selectedRoom.databaseId) {
      setBookingError(
        `La habitación ${getRoomDetails(selectedRoom).roomNumber} todavía debe habilitarse en Supabase para completar una reserva en línea.`
      );
      return;
    }

    if (selectedRoom) {
      const roomStatus = normalizeRoomStatus(selectedRoom, hasDateSelected);

      if (roomStatus === "blocked") {
        setBookingError(
          "La habitación seleccionada no está disponible para esa fecha."
        );
        return;
      }

      if (
        Number(bookingForm.guests_count) > Number(selectedRoom.capacity || 1)
      ) {
        setBookingError(
          "La cantidad de huéspedes supera la capacidad de la habitación."
        );
        return;
      }
    }

    const params = new URLSearchParams({
      roomId: String(selectedRoom?.databaseId || bookingForm.room_id),
      check_in: bookingForm.check_in,
      nights: String(bookingForm.nights),
      guests_count: String(bookingForm.guests_count),
      check_in_time: bookingForm.check_in_time,
    });

    navigate(`/reservar?${params.toString()}`);
  }

  return (
    <main className="home-page">
      {/* HERO */}
      <section id="inicio" className="hotel-hero scroll-mt-32">
    <div className="hotel-hero-image">
  <video
    className="hotel-hero-video"
    autoPlay
    muted
    loop
    playsInline
    preload="metadata"
    poster="https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1800&auto=format&fit=crop"
    aria-hidden="true"
  >
    <source
      src="/videos/pimentel.mp4"
      type="video/mp4"
    />
    Tu navegador no puede reproducir este video.
  </video>

  <div className="hotel-hero-overlay" />

          <div className="home-section hotel-hero-content">
            <div className="hotel-hero-text">
              <p className="hotel-hero-kicker">
                Descanso · Playa · Pimentel
              </p>

              <h1>Un refugio cerca al mar.</h1>

              <p>
                Habitaciones cómodas, atención directa y una estadía tranquila
                para disfrutar el balneario de Pimentel.
              </p>

              <div className="hotel-hero-actions">
                <button
                  type="button"
                  onClick={goToAvailability}
                  className="hotel-btn-primary"
                >
                  Reservar ahora
                </button>

                <a href="#habitaciones" className="hotel-btn-light">
                  Ver habitaciones
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* BARRA DE RESERVA */}
        <div className="hotel-booking-bar">
          <div className="hotel-booking-inner">
            <div className="hotel-booking-grid">
              <div className="hotel-booking-field">
                <label>Check-in</label>

                <input
                  type="date"
                  name="check_in"
                  value={bookingForm.check_in}
                  min={getTomorrowDate()}
                  onChange={handleBookingChange}
                />
              </div>

              <div className="hotel-booking-field">
                <label>Noches</label>

                <input
                  type="number"
                  name="nights"
                  min="1"
                  value={bookingForm.nights}
                  onChange={handleBookingChange}
                />
              </div>

              <div className="hotel-booking-field">
                <label>Huéspedes</label>

                <input
                  type="number"
                  name="guests_count"
                  min="1"
                  value={bookingForm.guests_count}
                  onChange={handleBookingChange}
                />
              </div>

              <button
                type="button"
                onClick={goToAvailability}
                className="hotel-booking-button"
              >
                Ver disponibilidad
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* POR QUÉ VIAJAR A PIMENTEL */}
      <StoryVideoSection
        id="por-que-pimentel"
        eyebrow="Destino"
        title="¿Por qué viajar a Pimentel?"
        description="Pimentel es un balneario tranquilo, ideal para caminar cerca al mar, visitar el muelle, disfrutar atardeceres y desconectarse en un ambiente costero sin complicaciones."
        videoSrc="/videos/pimentel.mp4"
      />

      {/* POR QUÉ HOSPEDARSE */}
      <StoryVideoSection
        id="nosotros"
        eyebrow="Hospedaje"
        title="¿Por qué hospedarse en Casa Huéspedes?"
        description="Porque tendrás una estadía sencilla, cómoda y cercana al mar. Casa Huéspedes Pimentel ofrece habitaciones funcionales, atención directa y una ubicación pensada para descansar durante tu visita."
        videoSrc="/videos/casa-huespedes.mp4"
        reverse
      />

      {/* HABITACIONES */}
      <section
        id="habitaciones"
        className="home-section hotel-rooms-section scroll-mt-32"
      >
        <div className="hotel-section-header">
          <div>
            <p className="hotel-eyebrow">Alojamiento</p>

            <h2 className="hotel-title">Habitaciones para cada viajero</h2>
          </div>

          <a href="#disponibilidad" className="hotel-small-link">
            Ver disponibilidad →
          </a>
        </div>

        {isLoadingRooms ? (
          <div className="hotel-empty-card">Cargando habitaciones...</div>
        ) : featuredRooms.length === 0 ? (
          <div className="hotel-empty-card">
            No hay habitaciones disponibles por el momento.
          </div>
        ) : (
          <div className="hotel-room-grid">
            {featuredRooms.map((room) => {
              const details = getRoomDetails(room);

              return (
                <article
                  key={details.roomNumber}
                  className="hotel-room-card hotel-room-card-media"
                >
                  <Link
                    to={`/habitaciones/${details.roomNumber}`}
                    className="hotel-room-image-link"
                  >
                    <div className="hotel-room-image-wrap">
                      <img
                        src={
                          room.main_image_url ||
                          "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1200&auto=format&fit=crop"
                        }
                        alt={details.name}
                      />

                      <div className="hotel-room-status-badge">
                        Habitación {details.roomNumber}
                      </div>

                      <div className="hotel-room-media-overlay">
                        <span>📍 {details.floorLabel}</span>
                        <span>🛏️ {details.roomType}</span>
                      </div>
                    </div>
                  </Link>

                  <div className="hotel-room-card-content">
                    <h3>{details.name}</h3>

                    <div className="hotel-room-meta">
                      <span>👤 Hasta {details.capacity} persona(s)</span>
                      <span>🛏️ {details.bedType}</span>
                    </div>

                    <p className="hotel-room-short-description">
{details.description}
                    </p>

                    <div className="hotel-room-tags">
                      {details.amenities.slice(0, 4).map((amenity) => (
                        <span key={amenity}>{amenity}</span>
                      ))}
                    </div>

                    <div className="mt-auto border-t border-[#eadfce] pt-5">
                      <Link
                        to={`/habitaciones/${details.roomNumber}`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#8b5427] px-5 py-3 font-black text-white transition hover:bg-[#633817] focus:outline-none focus:ring-2 focus:ring-[#8b5427] focus:ring-offset-2"
                      >
                        Ver habitación {details.roomNumber}
                        <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* SERVICIOS DESTACADOS */}
      <section id="servicios-incluidos" className="hotel-services-strip">
        <div className="home-section hotel-services-grid">
          {includedServices.map((service) => (
            <article key={service.title} className="hotel-service-item">
              <div className="hotel-service-icon">{service.icon}</div>

              <div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* GALERÍA Y TESTIMONIO */}
      <section
        id="galeria"
        className="home-section hotel-gallery-section scroll-mt-32"
      >
        <div>
          <p className="hotel-eyebrow">Galería</p>

          <h2 className="hotel-title hotel-gallery-title">
            Espacios que invitan a quedarse
          </h2>
        </div>

        <div className="hotel-gallery-grid">
          {galleryImages.map((image) => (
            <img
              key={image}
              src={image}
              alt="Galería Casa Huéspedes Pimentel"
              className="hotel-gallery-img"
            />
          ))}
        </div>

        <div className="hotel-testimonial">
          <p className="hotel-eyebrow">Testimonio</p>

          <p className="hotel-testimonial-text">
            “Un lugar tranquilo para descansar y disfrutar Pimentel. La atención
            fue cercana y la estadía muy cómoda.”
          </p>

          <p className="hotel-testimonial-name">Huésped visitante</p>
          <p className="hotel-testimonial-place">Casa Huéspedes Pimentel</p>
        </div>
      </section>

      {/* EXTRAS */}
      <section
        id="servicios-extras"
        className="hotel-extras-section scroll-mt-32"
      >
        <div className="home-section">
          <div className="hotel-section-header">
            <div>
              <p className="hotel-eyebrow">Servicios</p>

              <h2 className="hotel-title">Servicios extras</h2>
            </div>

            <p className="hotel-section-description">
              Servicios adicionales coordinados directamente con el hospedaje,
              según disponibilidad.
            </p>
          </div>

          <div className="hotel-extra-grid">
            {extraServices.map((service) => (
              <article key={service.title} className="hotel-extra-card">
                <img src={service.image} alt={service.title} />

                <div>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* DISPONIBILIDAD */}
      <section
        id="disponibilidad"
        className="home-section hotel-availability-section scroll-mt-32"
      >
        <div className="hotel-availability-grid">
          <form onSubmit={handleContinueToBooking} className="hotel-form-card">
            <p className="hotel-eyebrow">Reserva online</p>

            <h2 className="hotel-title hotel-form-title">
              Consulta disponibilidad
            </h2>

            <p className="hotel-form-description">
              Elige fecha, habitación y número de huéspedes. Luego continuarás
              al formulario de reserva y pago simulado.
            </p>

            <div className="hotel-form-grid">
              <div className="hotel-field hotel-field-full">
                <label className="hotel-label">Habitación</label>

                <select
                  name="room_id"
                  value={bookingForm.room_id}
                  onChange={handleBookingChange}
                  disabled={isLoadingRooms}
                  className="hotel-select"
                >
                  <option value="">
                    {isLoadingRooms
                      ? "Cargando habitaciones..."
                      : "Seleccionar habitación"}
                  </option>

                  {availableRooms.map((room) => {
                    const details = getRoomDetails(room);

                    return (
                      <option key={room.id} value={room.id}>
                        Hab. {details.roomNumber} — {details.roomType} — {details.floorLabel} — Hasta {details.capacity} persona(s)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="hotel-field">
                <label className="hotel-label">Fecha</label>

                <input
                  type="date"
                  name="check_in"
                  min={getTomorrowDate()}
                  value={bookingForm.check_in}
                  onChange={handleBookingChange}
                  className="hotel-input"
                />
              </div>

              <div className="hotel-field">
                <label className="hotel-label">Hora de ingreso</label>

                <select
                  name="check_in_time"
                  value={bookingForm.check_in_time}
                  onChange={handleBookingChange}
                  className="hotel-select"
                >
                  <option value="08:00">08:00</option>
                  <option value="09:00">09:00</option>
                  <option value="10:00">10:00</option>
                  <option value="11:00">11:00</option>
                  <option value="12:00">12:00</option>
                  <option value="13:00">13:00</option>
                  <option value="14:00">14:00</option>
                  <option value="15:00">15:00</option>
                  <option value="16:00">16:00</option>
                  <option value="17:00">17:00</option>
                  <option value="18:00">18:00</option>
                  <option value="19:00">19:00</option>
                  <option value="20:00">20:00</option>
                  <option value="21:00">21:00</option>
                  <option value="22:00">22:00</option>
                  <option value="23:00">23:00</option>
                </select>
              </div>

              <div className="hotel-field">
                <label className="hotel-label">Noches</label>

                <input
                  type="number"
                  name="nights"
                  min="1"
                  value={bookingForm.nights}
                  onChange={handleBookingChange}
                  className="hotel-input"
                />
              </div>

              <div className="hotel-field">
                <label className="hotel-label">Huéspedes</label>

                <input
                  type="number"
                  name="guests_count"
                  min="1"
                  value={bookingForm.guests_count}
                  onChange={handleBookingChange}
                  className="hotel-input"
                />
              </div>
            </div>

            {bookingError && (
              <div className="hotel-alert hotel-alert-error">
                {bookingError}
              </div>
            )}

            <button type="submit" className="hotel-submit-button">
              Continuar con la reserva
            </button>
          </form>

          <aside className="hotel-side-card">
            <p className="hotel-eyebrow">Disponibilidad</p>

            <h3 className="hotel-title hotel-side-title">
              Habitaciones por piso
            </h3>

            <p className="hotel-side-description">
              Revisa la ubicación, capacidad y disponibilidad de cada habitación.
            </p>

            <FloorPlan
              rooms={floorRooms}
              selectedRoomId={bookingForm.room_id}
              hasDateSelected={hasDateSelected}
              isChecking={isCheckingAvailability}
              onSelectRoom={handleSelectRoom}
            />

            {availabilityError && (
              <div className="hotel-alert hotel-alert-warning">
                {availabilityError}
              </div>
            )}

            <a
              href="https://wa.me/51901551287?text=Hola,%20quiero%20consultar%20disponibilidad%20en%20Casa%20Huéspedes%20Pimentel"
              target="_blank"
              rel="noreferrer"
              className="hotel-whatsapp-button"
            >
              Consultar por WhatsApp
            </a>
          </aside>
        </div>
      </section>

      {/* CTA */}
      <section className="hotel-cta">
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1800&auto=format&fit=crop"
          alt="Pimentel"
        />

        <div className="home-section hotel-cta-content">
          <div className="hotel-cta-card">
            <div>
              <h2 className="hotel-title">¿Listo para visitar Pimentel?</h2>

              <p>
                Consulta disponibilidad y continúa al formulario final de
                reserva.
              </p>
            </div>

            <button
              type="button"
              onClick={goToAvailability}
              className="hotel-btn-primary"
            >
              Reservar ahora
            </button>
          </div>
        </div>
      </section>

      <SocialDock />

      <FloatingSupportWidget
        isOpen={isSupportOpen}
        onOpen={() => setIsSupportOpen(true)}
        onClose={() => setIsSupportOpen(false)}
      />
    </main>
  );
}

function StoryVideoSection({
  id,
  eyebrow,
  title,
  description,
  videoSrc,
  poster,
  reverse = false,
}) {
  return (
    <section
      id={id}
      className={`home-section hotel-story-section scroll-mt-32 ${
        reverse ? "hotel-story-section-reverse" : ""
      }`}
    >
      <div className="hotel-story-copy">
        <p className="hotel-eyebrow">{eyebrow}</p>

        <h2 className="hotel-title hotel-story-title">{title}</h2>

        <p>{description}</p>
      </div>

      <div className="hotel-video-frame">
        <video controls muted playsInline poster={poster}>
          <source src={videoSrc} type="video/mp4" />
          Tu navegador no puede reproducir este video.
        </video>
      </div>
    </section>
  );
}

function FloorPlan({
  rooms,
  selectedRoomId,
  hasDateSelected,
  isChecking,
  onSelectRoom,
}) {
  const orderedRooms = [...rooms].sort((firstRoom, secondRoom) => {
    const firstDetails = getRoomDetails(firstRoom);
    const secondDetails = getRoomDetails(secondRoom);

    return (
      firstDetails.floorNumber - secondDetails.floorNumber ||
      Number(firstDetails.roomNumber) - Number(secondDetails.roomNumber)
    );
  });

  const roomsByFloor = orderedRooms.reduce((groups, room) => {
    const details = getRoomDetails(room);
    const floorKey = details.floorLabel;

    if (!groups[floorKey]) {
      groups[floorKey] = {
        floorNumber: details.floorNumber,
        rooms: [],
      };
    }

    groups[floorKey].rooms.push(room);
    return groups;
  }, {});

  const floors = Object.entries(roomsByFloor).sort(
    ([, firstFloor], [, secondFloor]) =>
      firstFloor.floorNumber - secondFloor.floorNumber
  );

  const availableCount = orderedRooms.filter(
    (room) => normalizeRoomStatus(room, hasDateSelected) === "available"
  ).length;

  const blockedCount = orderedRooms.filter(
    (room) => normalizeRoomStatus(room, hasDateSelected) === "blocked"
  ).length;

  return (
    <div className="floor-card">
      <div className="floor-legend">
        <div>
          <span className="floor-dot floor-dot-idle" />
          Pendiente
        </div>

        <div>
          <span className="floor-dot floor-dot-available" />
          Disponible
        </div>

        <div>
          <span className="floor-dot floor-dot-blocked" />
          Bloqueada
        </div>
      </div>

      <div className="floor-status-text">
        {isChecking
          ? "Consultando disponibilidad..."
          : hasDateSelected
            ? `${availableCount} disponible(s) y ${blockedCount} bloqueada(s) para la fecha seleccionada.`
            : `${orderedRooms.length} habitación(es). Selecciona una fecha para consultar disponibilidad.`}
      </div>

      <div className="mt-4 space-y-4">
        {floors.map(([floorLabel, floor]) => (
          <section
            key={floorLabel}
            className="rounded-2xl border border-[#eadfce] bg-white p-3"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="font-black text-[#2b2118]">📍 {floorLabel}</h4>
              <span className="rounded-full bg-[#f4eadc] px-3 py-1 text-xs font-black text-[#7b4a1f]">
                {floor.rooms.length} habitación(es)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {floor.rooms.map((room) => (
                <RoomBox
                  key={room.id}
                  room={room}
                  selectedRoomId={selectedRoomId}
                  hasDateSelected={hasDateSelected}
                  onSelectRoom={onSelectRoom}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="floor-note">
        Selecciona una habitación disponible para completar automáticamente el
        formulario de reserva.
      </div>
    </div>
  );
}

function RoomBox({
  room,
  selectedRoomId,
  hasDateSelected,
  onSelectRoom,
}) {
  const details = getRoomDetails(room);
  const roomStatus = normalizeRoomStatus(room, hasDateSelected);
  const isSelected = String(selectedRoomId) === String(room.id);
  const isBlocked = roomStatus === "blocked";

  return (
    <button
      type="button"
      onClick={() => onSelectRoom(room)}
      disabled={isBlocked}
      title={`${room.name} — ${details.bedType}`}
      className={`floor-room floor-room-${roomStatus} min-h-[118px] ${
        isSelected ? "floor-room-selected" : ""
      }`}
    >
      <strong>Hab. {details.roomNumber} · {details.roomType}</strong>
      <span>{details.capacity} persona(s)</span>
      <span>{details.bedType}</span>

      <small>
        {!hasDateSelected
          ? "Pendiente"
          : isBlocked
            ? "Bloqueada"
            : "Disponible"}
      </small>
    </button>
  );
}

function SocialDock() {
  return (
    <div className="fixed left-5 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center gap-3 bg-[#fbf7ef]/95 border border-[#eadfce] rounded-full px-2 py-4 shadow-xl backdrop-blur-md">
      <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-black text-[#2d261f] tracking-[0.25em] uppercase">
        Síguenos
      </span>

      <a
        href="https://www.facebook.com/casadehuespedespimentel/?locale=es_LA"
        target="_blank"
        rel="noreferrer"
        aria-label="Facebook"
        className="w-11 h-11 rounded-full bg-[#2b1d12] text-white grid place-items-center font-black text-lg hover:bg-[#a87545] transition"
      >
        f
      </a>

      <a
        href="https://www.tiktok.com/@casahuespedespimentel"
        target="_blank"
        rel="noreferrer"
        aria-label="TikTok"
        className="w-11 h-11 rounded-full bg-[#2b1d12] text-white grid place-items-center font-black text-lg hover:bg-[#a87545] transition"
      >
        ♪
      </a>

      <a
        href="https://www.instagram.com/casahuespedes.pimentel/"
        target="_blank"
        rel="noreferrer"
        aria-label="Instagram"
        className="w-11 h-11 rounded-full bg-[#2b1d12] text-white grid place-items-center font-black text-lg hover:bg-[#a87545] transition"
      >
        ◎
      </a>
    </div>
  );
}

function FloatingSupportWidget({ isOpen, onOpen, onClose }) {
  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={onOpen}
          className="hotel-floating-btn"
          aria-label="Abrir atención al cliente"
        >
          💬
        </button>
      )}

      {isOpen && (
        <div className="hotel-support-card">
          <button
            type="button"
            onClick={onClose}
            className="hotel-support-close"
            aria-label="Cerrar atención al cliente"
          >
            ×
          </button>

          <div className="hotel-support-header">
            <h3>¿Necesitas ayuda?</h3>
            <p>Escríbenos por WhatsApp para consultar disponibilidad.</p>
          </div>

          <div className="hotel-support-body">
            <a
              href="https://wa.me/51901551287?text=Hola,%20quiero%20consultar%20disponibilidad%20en%20Casa%20Huéspedes%20Pimentel"
              target="_blank"
              rel="noreferrer"
              className="hotel-whatsapp-button"
            >
              Escribir por WhatsApp
            </a>
          </div>
        </div>
      )}
    </>
  );
}