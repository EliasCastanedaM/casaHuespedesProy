import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getRoomById, getRooms } from "../../services/roomService";

const fallbackImage =
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1400&auto=format&fit=crop";

const BOOKING_DRAFT_KEY = "pimentelBookingDraft";

function getLocalDateValue(date = new Date()) {
  const timezoneOffset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffset)
    .toISOString()
    .split("T")[0];
}

const ROOM_DETAILS = {
  101: {
    name: "Habitación Matrimonial #101",
    roomType: "Matrimonial",
    floorLabel: "Primer piso",
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
    bedType: "1 cama de dos plazas",
    capacity: 2,
    description:
      "Habitación matrimonial ubicada en el quinto piso, con una cama de dos plazas y capacidad para 2 personas.",
    locationDetail: "Ubicada en el quinto piso.",
    amenities: ["Baño privado", "Smart TV", "Ropero", "Mesas de noche"],
  },
};

function extractRoomNumber(room) {
  if (room?.room_number) return String(room.room_number);

  const match = String(room?.name || "").match(
    /(?:#|hab(?:itaci[oó]n)?\.?\s*)?(101|201|202|203|205|301|302|303|304|305|405|407|505)\b/i
  );

  return match?.[1] || "";
}

function normalizeAmenities(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value || typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    // PostgreSQL puede devolver arreglos como texto.
  }

  return value
    .replace(/^\{?|\}?$/g, "")
    .split(",")
    .map((item) => item.replace(/^"|"$/g, "").trim())
    .filter(Boolean);
}

function createRoomView(roomNumber, databaseRoom = null) {
  const details = ROOM_DETAILS[roomNumber];
  const databaseAmenities = normalizeAmenities(databaseRoom?.amenities);

  return {
    ...databaseRoom,
    id: databaseRoom?.id ?? null,
    databaseId: databaseRoom?.id ?? null,
    room_number: roomNumber,
    name: details.name,
    description: details.description,
    room_type: details.roomType,
    floor_label: details.floorLabel,
    bed_type: details.bedType,
    capacity: details.capacity,
    amenities:
      details.amenities.length > 0 ? details.amenities : databaseAmenities,
    locationDetail: details.locationDetail,
    hasTerrace: Boolean(details.hasTerrace),
    main_image_url: databaseRoom?.main_image_url || fallbackImage,
  };
}

function amenityIcon(amenity) {
  const text = amenity.toLowerCase();

  if (text.includes("terraza")) return "🌤️";
  if (text.includes("baño") || text.includes("ducha")) return "🚿";
  if (text.includes("smart") || text.includes("tv")) return "📺";
  if (text.includes("ventil")) return "🌀";
  if (text.includes("ropero")) return "👕";
  if (text.includes("mesa") || text.includes("velador")) return "🛋️";
  if (text.includes("cama")) return "🛏️";
  return "✓";
}

export default function RoomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [activeTab, setActiveTab] = useState("photos");
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [dateError, setDateError] = useState("");

  const today = getLocalDateValue();

  useEffect(() => {
    async function loadRoom() {
      try {
        setLoading(true);
        setError("");

        let roomNumber = ROOM_DETAILS[id] ? String(id) : "";
        let databaseRoom = null;

        if (roomNumber) {
          try {
            const rooms = await getRooms();
            const roomSummary = Array.isArray(rooms)
              ? rooms.find(
                  (candidate) => extractRoomNumber(candidate) === roomNumber
                ) || null
              : null;

            // getRooms devuelve el resumen. Luego pedimos el detalle completo
            // para recibir los arreglos images y videos desde Supabase.
            databaseRoom = roomSummary?.id
              ? await getRoomById(roomSummary.id)
              : null;
          } catch (roomsError) {
            console.warn(
              "No se pudo cargar la habitación desde la API; se usará la ficha local.",
              roomsError
            );
          }
        } else {
          const roomById = await getRoomById(id);
          roomNumber = extractRoomNumber(roomById);

          if (!ROOM_DETAILS[roomNumber]) {
            throw new Error("La habitación no pertenece al catálogo actualizado.");
          }

          databaseRoom = roomById;
        }

        const roomView = createRoomView(roomNumber, databaseRoom);
        setRoom(roomView);

        const validImages = Array.isArray(roomView?.images)
          ? roomView.images.filter((image) => image?.image_url)
          : [];
        const validVideos = Array.isArray(roomView?.videos)
          ? roomView.videos.filter((video) => video?.video_url)
          : [];

        const mainImage = validImages.find((image) => image.is_main);
        const firstImage = validImages[0];
        const mainVideo = validVideos.find((video) => video.is_main);
        const firstVideo = validVideos[0];

        // La portada inicia con una foto. Si no existe ninguna, usa el video.
        if (mainImage || firstImage || roomView.main_image_url) {
          setSelectedMedia({
            type: "image",
            url:
              mainImage?.image_url ||
              firstImage?.image_url ||
              roomView.main_image_url ||
              fallbackImage,
            title:
              mainImage?.title || firstImage?.title || roomView.name,
          });
          setActiveTab("photos");
        } else if (mainVideo || firstVideo) {
          setSelectedMedia({
            type: "video",
            url: mainVideo?.video_url || firstVideo?.video_url,
            title:
              mainVideo?.title || firstVideo?.title || "Video de la habitación",
            poster: mainVideo?.poster_url || firstVideo?.poster_url || null,
          });
          setActiveTab("videos");
        } else {
          setSelectedMedia({
            type: "image",
            url: fallbackImage,
            title: roomView.name,
          });
          setActiveTab("photos");
        }
      } catch (loadError) {
        console.error("Error cargando habitación:", loadError);
        setError(
          loadError.message || "No se pudo cargar la habitación seleccionada."
        );
      } finally {
        setLoading(false);
      }
    }

    loadRoom();
  }, [id]);

  const photos = useMemo(() => {
    const databasePhotos = Array.isArray(room?.images)
      ? room.images.filter((photo) => photo?.image_url)
      : [];

    if (databasePhotos.length > 0) return databasePhotos;

    return [
      {
        id: "main-photo",
        image_url: room?.main_image_url || fallbackImage,
        is_main: true,
      },
    ];
  }, [room]);

  const videos = Array.isArray(room?.videos)
    ? room.videos.filter((video) => video?.video_url)
    : [];
  const visiblePhotos = showAllPhotos ? photos : photos.slice(0, 12);

  // Recupera las fechas si el usuario vuelve desde la página de reserva.
  useEffect(() => {
    if (!room?.databaseId) return;

    try {
      const storedDraft = JSON.parse(
        sessionStorage.getItem(BOOKING_DRAFT_KEY) || "null"
      );

      if (
        storedDraft &&
        String(storedDraft.roomId) === String(room.databaseId)
      ) {
        setCheckIn(storedDraft.checkIn || "");
        setCheckOut(storedDraft.checkOut || "");
      }
    } catch (storageError) {
      console.warn("No se pudieron recuperar las fechas guardadas.", storageError);
    }
  }, [room?.databaseId]);

  function handleCheckInChange(event) {
    const nextCheckIn = event.target.value;

    setCheckIn(nextCheckIn);
    setDateError("");

    // Si la salida dejó de ser válida, se limpia para evitar una reserva errónea.
    if (checkOut && checkOut <= nextCheckIn) {
      setCheckOut("");
    }
  }

  function handleCheckOutChange(event) {
    setCheckOut(event.target.value);
    setDateError("");
  }

  function handleContinueToBooking() {
    if (!checkIn || !checkOut) {
      setDateError("Selecciona la fecha de ingreso y la fecha de salida.");
      return;
    }

    if (checkOut <= checkIn) {
      setDateError(
        "La fecha de salida debe ser posterior a la fecha de ingreso."
      );
      return;
    }

    if (!room?.databaseId) {
      setDateError(
        "Esta habitación todavía no está habilitada para reserva online."
      );
      return;
    }

    const bookingDraft = {
      roomId: String(room.databaseId),
      checkIn,
      checkOut,
      guestsCount: 1,
    };

    // Mantiene la información si el usuario actualiza o vuelve a la página.
    sessionStorage.setItem(
      BOOKING_DRAFT_KEY,
      JSON.stringify(bookingDraft)
    );

    const params = new URLSearchParams({
      roomId: String(room.databaseId),
      checkIn,
      checkOut,
    });

    navigate(`/reservar?${params.toString()}`);
  }

  if (loading) {
    return (
      <main className="bg-[#fbf7f0] min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl p-6 border border-[#eadfce]">
            <p className="text-gray-600">Cargando habitación...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !room) {
    return (
      <main className="bg-[#fbf7f0] min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6">
            {error || "Habitación no encontrada."}
          </div>
        </div>
      </main>
    );
  }

  const whatsappUrl = `https://wa.me/51901551287?text=${encodeURIComponent(
    `Hola, quiero consultar disponibilidad para la habitación ${room.room_number} de Casa Huéspedes Pimentel.`
  )}`;

  return (
    <main className="bg-[#fbf7f0]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link
          to="/#habitaciones"
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-[#4b250f]"
        >
          ← Volver a las habitaciones
        </Link>

        <section className="mt-6 grid lg:grid-cols-[minmax(0,1fr)_360px] gap-8 items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-black text-[#2b2118]">
                {room.name}
              </h1>

              <span className="rounded-full bg-[#efe2ce] px-4 py-2 text-sm font-black text-[#70401c]">
                {room.room_type}
              </span>
            </div>

            <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-600">
              {room.description}
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-sm text-gray-700">
              <span className="rounded-full border border-[#eadfce] bg-white px-4 py-2 font-bold">
                📍 {room.floor_label}
              </span>
              <span className="rounded-full border border-[#eadfce] bg-white px-4 py-2 font-bold">
                👤 Hasta {room.capacity} persona(s)
              </span>
              <span className="rounded-full border border-[#eadfce] bg-white px-4 py-2 font-bold">
                🛏️ {room.bed_type}
              </span>
              {room.hasTerrace && (
                <span className="rounded-full bg-[#dfead8] px-4 py-2 font-black text-[#35562d]">
                  🌤️ Ubicada en la terraza
                </span>
              )}
            </div>

            <div className="mt-7 grid lg:grid-cols-[minmax(0,1fr)_300px] gap-4">
              <div className="relative min-h-[420px] overflow-hidden rounded-3xl bg-black">
                {selectedMedia?.type === "video" ? (
                  <video
                    src={selectedMedia.url}
                    controls
                    playsInline
                    className="h-[420px] w-full object-cover"
                    poster={selectedMedia?.poster || room.main_image_url || photos[0]?.image_url}
                  />
                ) : (
                  <img
                    src={selectedMedia?.url || fallbackImage}
                    alt={selectedMedia?.title || room.name}
                    className="h-[420px] w-full object-cover"
                  />
                )}

                <div className="absolute bottom-4 left-4 rounded-full bg-black/65 px-4 py-2 text-sm font-bold text-white">
                  Habitación {room.room_number}
                </div>
              </div>

              <aside className="rounded-3xl border border-[#eadfce] bg-white p-6">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a87545]">
                  Ficha confirmada
                </p>
                <h2 className="mt-2 text-2xl font-black text-[#2b2118]">
                  Información principal
                </h2>

                <dl className="mt-6 space-y-5 text-sm">
                  <div>
                    <dt className="text-gray-500">Número de habitación</dt>
                    <dd className="mt-1 font-black text-[#2b2118]">
                      #{room.room_number}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Ubicación</dt>
                    <dd className="mt-1 font-black text-[#2b2118]">
                      {room.locationDetail}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Tipo</dt>
                    <dd className="mt-1 font-black text-[#2b2118]">
                      {room.room_type}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Camas</dt>
                    <dd className="mt-1 font-black text-[#2b2118]">
                      {room.bed_type}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Capacidad máxima</dt>
                    <dd className="mt-1 font-black text-[#2b2118]">
                      {room.capacity} persona(s)
                    </dd>
                  </div>
                </dl>
              </aside>
            </div>

            {(photos.length > 1 || videos.length > 0) && (
              <section className="mt-8 rounded-3xl border border-[#eadfce] bg-white p-5">
                <div className="flex gap-3 border-b border-gray-100">
                  <button
                    type="button"
                    onClick={() => setActiveTab("photos")}
                    className={`px-4 py-3 font-bold ${
                      activeTab === "photos"
                        ? "border-b-2 border-[#b77a35] text-[#4b250f]"
                        : "text-gray-500"
                    }`}
                  >
                    📷 Fotos ({photos.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("videos")}
                    className={`px-4 py-3 font-bold ${
                      activeTab === "videos"
                        ? "border-b-2 border-[#b77a35] text-[#4b250f]"
                        : "text-gray-500"
                    }`}
                  >
                    🎥 Videos ({videos.length})
                  </button>
                </div>

                {activeTab === "photos" && (
                  <div className="mt-5">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      {visiblePhotos.map((photo) => (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() =>
                            setSelectedMedia({
                              type: "image",
                              url: photo.image_url,
                              title: photo.title || room.name,
                            })
                          }
                          className="h-32 overflow-hidden rounded-2xl bg-gray-100"
                        >
                          <img
                            src={photo.image_url}
                            alt={photo.alt_text || photo.title || room.name}
                            className="h-full w-full object-cover transition duration-300 hover:scale-105"
                          />
                        </button>
                      ))}
                    </div>

                    {photos.length > 12 && (
                      <div className="mt-5 text-center">
                        <button
                          type="button"
                          onClick={() => setShowAllPhotos((value) => !value)}
                          className="rounded-xl border border-[#eadfce] px-5 py-3 font-bold text-[#4b250f] hover:bg-[#fbf7f0]"
                        >
                          {showAllPhotos
                            ? "Ver menos fotos"
                            : `Ver todas las fotos (${photos.length})`}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "videos" && (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {videos.map((video, index) => (
                      <button
                        key={video.id}
                        type="button"
                        onClick={() =>
                          setSelectedMedia({
                            type: "video",
                            url: video.video_url,
                            title: video.title || `Video ${index + 1}`,
                            poster: video.poster_url || room.main_image_url,
                          })
                        }
                        className="relative h-48 overflow-hidden rounded-2xl bg-black text-left"
                      >
                        <video
                          src={video.video_url}
                          poster={video.poster_url || room.main_image_url}
                          className="h-full w-full object-cover opacity-75"
                          muted
                          preload="metadata"
                        />
                        <span className="absolute inset-0 grid place-items-center text-4xl text-white">
                          ▶
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <section className="rounded-3xl border border-[#eadfce] bg-white p-6">
                <h2 className="text-xl font-black text-[#2b2118]">
                  Distribución de la habitación
                </h2>

                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-[#eadfce] bg-[#fbf7f0] p-4">
                    <p className="text-sm text-gray-500">Piso o ubicación</p>
                    <p className="mt-1 font-black text-[#2b2118]">
                      {room.floor_label}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#eadfce] bg-[#fbf7f0] p-4">
                    <p className="text-sm text-gray-500">Distribución de camas</p>
                    <p className="mt-1 font-black text-[#2b2118]">
                      {room.bed_type}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#eadfce] bg-[#fbf7f0] p-4">
                    <p className="text-sm text-gray-500">Número de huéspedes</p>
                    <p className="mt-1 font-black text-[#2b2118]">
                      Hasta {room.capacity} persona(s)
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-[#eadfce] bg-white p-6">
                <h2 className="text-xl font-black text-[#2b2118]">
                  Servicios y equipamiento
                </h2>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {room.amenities.map((amenity) => (
                    <div
                      key={amenity}
                      className="flex items-center gap-3 rounded-xl border border-[#eadfce] bg-[#fbf7f0] px-3 py-3 text-sm text-gray-700"
                    >
                      <span aria-hidden="true">{amenityIcon(amenity)}</span>
                      <span className="font-bold">{amenity}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24">
            <div className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a87545]">
                Consulta de disponibilidad
              </p>
              <h2 className="mt-2 text-2xl font-black text-[#2b2118]">
                Habitación {room.room_number}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                Selecciona tus fechas o consulta directamente al hospedaje. Los
                precios no se muestran públicamente.
              </p>

              <div className="mt-5 space-y-3 border-y border-[#eadfce] py-5 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Tipo</span>
                  <span className="font-black">{room.room_type}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Ubicación</span>
                  <span className="text-right font-black">
                    {room.floor_label}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Camas</span>
                  <span className="max-w-[190px] text-right font-black">
                    {room.bed_type}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Capacidad</span>
                  <span className="font-black">
                    {room.capacity} persona(s)
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-gray-600">
                    Check-in
                  </label>
                  <input
                    type="date"
                    value={checkIn}
                    min={today}
                    onChange={handleCheckInChange}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-600">
                    Check-out
                  </label>
                  <input
                    type="date"
                    value={checkOut}
                    min={checkIn || today}
                    onChange={handleCheckOutChange}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                  />
                </div>
              </div>

              {dateError && (
                <p
                  role="alert"
                  className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
                >
                  {dateError}
                </p>
              )}

              {room.databaseId ? (
                <button
                  type="button"
                  onClick={handleContinueToBooking}
                  className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#8b5427] px-6 py-4 font-black text-white transition hover:bg-[#633817] focus:outline-none focus:ring-2 focus:ring-[#8b5427] focus:ring-offset-2"
                >
                  Consultar disponibilidad
                </button>
              ) : (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#8b5427] px-6 py-4 font-black text-white transition hover:bg-[#633817] focus:outline-none focus:ring-2 focus:ring-[#8b5427] focus:ring-offset-2"
                >
                  Consultar por WhatsApp
                </a>
              )}

              {!room.databaseId && (
                <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                  Esta ficha ya está visible, pero la habitación todavía debe
                  habilitarse en Supabase para usar la reserva en línea.
                </p>
              )}
            </div>

            <div className="mt-5 rounded-3xl border border-[#eadfce] bg-[#f4eadc] p-6">
              <h3 className="font-black text-[#2b2118]">
                ¿Necesitas más información?
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Consulta directamente por la habitación {room.room_number}.
              </p>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex rounded-xl border border-[#d7c3a8] bg-white px-5 py-3 font-bold text-[#4b250f] transition hover:bg-[#fbf7f0]"
              >
                Contactar al hospedaje
              </a>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
