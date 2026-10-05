import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getRoomCategoryBySlug } from "../../services/roomService";
import { searchCategoryAvailability } from "../../services/bookingService";
import "./RoomDetail.css";

const fallbackImage =
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1400&auto=format&fit=crop";

const LEGACY_ROOM_TO_CATEGORY = {
  101: "matrimonial-ejecutiva",
  205: "matrimonial",
  304: "matrimonial-ejecutiva",
  305: "matrimonial",
  505: "matrimonial-ejecutiva",
  201: "doble",
  301: "doble",
  202: "triple",
  302: "triple",
  303: "triple",
  406: "triple",
  407: "triple",
  203: "familiar",
  405: "familiar",
};

function getLocalDateValue(date = new Date()) {
  const timezoneOffset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffset)
    .toISOString()
    .split("T")[0];
}

function calculateNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;

  const [startYear, startMonth, startDay] = checkIn.split("-").map(Number);
  const [endYear, endMonth, endDay] = checkOut.split("-").map(Number);
  const start = Date.UTC(startYear, startMonth - 1, startDay);
  const end = Date.UTC(endYear, endMonth - 1, endDay);

  return Math.max(0, (end - start) / 86_400_000);
}

function formatMoney(value) {
  return `S/ ${Number(value || 0).toFixed(0)}`;
}

function amenityIcon(amenity) {
  const text = String(amenity || "").toLowerCase();

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
  const normalizedParam = String(id || "").trim().toLowerCase();
  const slug = LEGACY_ROOM_TO_CATEGORY[normalizedParam] || normalizedParam;

  const [category, setCategory] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [activeTab, setActiveTab] = useState("photos");
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState(null);
  const [error, setError] = useState("");
  const [dateError, setDateError] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestsCount, setGuestsCount] = useState(1);

  const today = getLocalDateValue();
  const nights = useMemo(
    () => calculateNights(checkIn, checkOut),
    [checkIn, checkOut]
  );

  useEffect(() => {
    async function loadCategory() {
      try {
        setLoading(true);
        setError("");

        if (
          ![
            "matrimonial",
            "matrimonial-ejecutiva",
            "doble",
            "triple",
            "familiar",
          ].includes(slug)
        ) {
          throw new Error("La categoría de habitación no existe.");
        }

        const data = await getRoomCategoryBySlug(slug);
        setCategory(data);

        const photos = Array.isArray(data?.images)
          ? data.images.filter((photo) => photo?.image_url)
          : [];
        const videos = Array.isArray(data?.videos)
          ? data.videos.filter((video) => video?.video_url)
          : [];

        const mainPhoto = photos.find((photo) => photo.is_main) || photos[0];
        const mainVideo = videos.find((video) => video.is_main) || videos[0];

        if (mainPhoto || data?.image_url) {
          setSelectedMedia({
            type: "image",
            url: mainPhoto?.image_url || data.image_url || fallbackImage,
            title: `Habitación ${data.name}`,
          });
          setActiveTab("photos");
        } else if (mainVideo) {
          setSelectedMedia({
            type: "video",
            url: mainVideo.video_url,
            title: `Video referencial · Habitación ${data.name}`,
            poster: mainVideo.poster_url || fallbackImage,
          });
          setActiveTab("videos");
        } else {
          setSelectedMedia({
            type: "image",
            url: fallbackImage,
            title: `Habitación ${data.name}`,
          });
        }
      } catch (loadError) {
        console.error("Error cargando categoría:", loadError);
        setError(
          loadError.response?.data?.message ||
            loadError.message ||
            "No se pudo cargar la categoría seleccionada."
        );
      } finally {
        setLoading(false);
      }
    }

    loadCategory();
  }, [slug]);

  const photos = useMemo(() => {
    const list = Array.isArray(category?.images)
      ? category.images.filter((photo) => photo?.image_url)
      : [];

    if (list.length > 0) return list;

    return [
      {
        id: "fallback-image",
        image_url: category?.image_url || fallbackImage,
        title: `Habitación ${category?.name || ""}`,
        is_main: true,
      },
    ];
  }, [category]);

  const categoryVideos = useMemo(() => {
    const list = Array.isArray(category?.videos)
      ? category.videos.filter((video) => video?.video_url)
      : [];

    if (list.length > 0) return list;

    return [
      {
        id: "general-room-video",
        video_url: "/videos/habitaciones.mp4",
        title: "Video referencial de nuestras habitaciones",
        poster_url: category?.image_url || fallbackImage,
        is_main: true,
      },
    ];
  }, [category]);

  const visiblePhotos = showAllPhotos ? photos : photos.slice(0, 12);

  function handleCheckInChange(event) {
    const nextCheckIn = event.target.value;
    setCheckIn(nextCheckIn);
    setDateError("");
    setAvailabilityResult(null);

    if (checkOut && checkOut <= nextCheckIn) {
      setCheckOut("");
    }
  }

  function handleCheckOutChange(event) {
    setCheckOut(event.target.value);
    setDateError("");
    setAvailabilityResult(null);
  }

  function handleGuestsChange(event) {
    setGuestsCount(Number(event.target.value || 1));
    setDateError("");
    setAvailabilityResult(null);
  }

  async function handleCheckAvailability() {
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

    if (
      !Number.isInteger(Number(guestsCount)) ||
      Number(guestsCount) < 1 ||
      Number(guestsCount) > Number(category.capacity)
    ) {
      setDateError(
        `Selecciona entre 1 y ${category.capacity} huésped(es) para esta categoría.`
      );
      return;
    }

    try {
      setCheckingAvailability(true);
      setDateError("");
      setAvailabilityResult(null);

      const response = await searchCategoryAvailability({
        check_in: checkIn,
        check_out: checkOut,
        guests_count: Number(guestsCount),
      });

      const selectedCategory = (response.categories || []).find(
        (item) => item.slug === category.slug
      );

      setAvailabilityResult({
        available: Number(selectedCategory?.available_quantity || 0) > 0,
        quantity: Number(selectedCategory?.available_quantity || 0),
        price_per_night: Number(selectedCategory?.price_per_night || 0),
        nights: Number(response.nights || nights),
      });
    } catch (availabilityError) {
      console.error(
        "Error consultando disponibilidad de categoría:",
        availabilityError
      );
      setDateError(
        availabilityError.response?.data?.message ||
          availabilityError.message ||
          "No se pudo consultar la disponibilidad."
      );
    } finally {
      setCheckingAvailability(false);
    }
  }

  function handleContinueToBooking() {
    const params = new URLSearchParams({
      category: category.slug,
      checkIn,
      checkOut,
      guests: String(guestsCount),
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

  if (error || !category) {
    return (
      <main className="bg-[#fbf7f0] min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6">
            {error || "Categoría no encontrada."}
          </div>
          <Link
            to="/habitaciones"
            className="mt-5 inline-flex font-bold text-[#4b250f]"
          >
            ← Volver a habitaciones
          </Link>
        </div>
      </main>
    );
  }

  const amenities = Array.isArray(category.amenities)
    ? category.amenities
    : [];
  const totalAmount = availabilityResult?.available
    ? Number(availabilityResult.price_per_night || 0) *
      Number(availabilityResult.nights || 0)
    : 0;

  return (
    <main className="room-detail-page">
      <div className="room-detail-shell">
        <Link
          to="/habitaciones"
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-[#4b250f]"
        >
          ← Volver a las habitaciones
        </Link>

        <section className="room-detail-layout">
          <div className="room-detail-main">
            <div className="room-detail-intro">
              <h1 className="text-3xl md:text-4xl font-black text-[#2b2118]">
                Habitación {category.name}
              </h1>

              <span className="rounded-full bg-[#efe2ce] px-4 py-2 text-sm font-black text-[#70401c]">
                Categoría {category.name}
              </span>
            </div>

            <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-600">
              {category.description}
            </p>

            <div className="room-detail-facts">
              <span className="rounded-full border border-[#eadfce] bg-white px-4 py-2 font-bold">
                👤 Hasta {category.capacity} persona(s)
              </span>
              <span className="rounded-full border border-[#eadfce] bg-white px-4 py-2 font-bold">
                🛏️ {category.bed_description}
              </span>
              <span className="rounded-full border border-[#eadfce] bg-white px-4 py-2 font-bold">
                🏨 {category.total_quantity} habitación(es) en esta categoría
              </span>
            </div>

            <div className="room-detail-showcase">
              <div className="room-detail-media">
                {selectedMedia?.type === "video" ? (
                  <video
                    src={selectedMedia.url}
                    controls
                    playsInline
                    className="h-[420px] w-full object-cover"
                    poster={
                      selectedMedia.poster ||
                      category.image_url ||
                      photos[0]?.image_url
                    }
                  />
                ) : (
                  <img
                    src={selectedMedia?.url || fallbackImage}
                    alt={selectedMedia?.title || `Habitación ${category.name}`}
                    className="h-[420px] w-full object-cover"
                  />
                )}

                <div className="absolute bottom-4 left-4 rounded-full bg-black/65 px-4 py-2 text-sm font-bold text-white">
                  Imagen referencial · {category.name}
                </div>
              </div>

              <aside className="room-detail-summary">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a87545]">
                  Categoría
                </p>
                <h2 className="mt-2 text-2xl font-black text-[#2b2118]">
                  Información principal
                </h2>

                <dl className="mt-6 space-y-5 text-sm">
                  <div>
                    <dt className="text-gray-500">Tipo</dt>
                    <dd className="mt-1 font-black text-[#2b2118]">
                      {category.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Distribución de camas</dt>
                    <dd className="mt-1 font-black text-[#2b2118]">
                      {category.bed_description}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Capacidad máxima</dt>
                    <dd className="mt-1 font-black text-[#2b2118]">
                      {category.capacity} persona(s)
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Cantidad de habitaciones</dt>
                    <dd className="mt-1 font-black text-[#2b2118]">
                      {category.total_quantity}
                    </dd>
                  </div>
                </dl>
              </aside>
            </div>

            <section className="room-detail-gallery-panel">
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
                  🎥 Videos ({categoryVideos.length})
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
                            title:
                              `Habitación ${category.name}`,
                          })
                        }
                        className={`room-detail-thumb ${selectedMedia?.type === "image" && selectedMedia?.url === photo.image_url ? "is-selected" : ""}`}
                      >
                        <img
                          src={photo.image_url}
                          alt={
                            `Foto referencial · Habitación ${category.name}`
                          }
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
                  {categoryVideos.map((video, index) => (
                    <button
                      key={video.id}
                      type="button"
                      onClick={() =>
                        setSelectedMedia({
                          type: "video",
                          url: video.video_url,
                          title:
                            `Video referencial ${index + 1} · ${category.name}`,
                          poster:
                            video.poster_url ||
                            category.image_url ||
                            fallbackImage,
                        })
                      }
                      className={`room-detail-video-thumb ${selectedMedia?.type === "video" && selectedMedia?.url === video.video_url ? "is-selected" : ""}`}
                    >
                      <video
                        src={video.video_url}
                        poster={video.poster_url || category.image_url}
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

              <p className="mt-4 text-xs font-bold text-gray-500">
                Las fotos y videos son referenciales de habitaciones
                pertenecientes a esta categoría.
              </p>
            </section>

            <div className="room-detail-info-grid">
              <section className="room-detail-info-panel">
                <h2 className="text-xl font-black text-[#2b2118]">
                  Distribución de la habitación
                </h2>

                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-[#eadfce] bg-[#fbf7f0] p-4">
                    <p className="text-sm text-gray-500">Categoría</p>
                    <p className="mt-1 font-black text-[#2b2118]">
                      {category.name}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#eadfce] bg-[#fbf7f0] p-4">
                    <p className="text-sm text-gray-500">
                      Distribución de camas
                    </p>
                    <p className="mt-1 font-black text-[#2b2118]">
                      {category.bed_description}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#eadfce] bg-[#fbf7f0] p-4">
                    <p className="text-sm text-gray-500">
                      Número de huéspedes
                    </p>
                    <p className="mt-1 font-black text-[#2b2118]">
                      Hasta {category.capacity} persona(s)
                    </p>
                  </div>
                </div>
              </section>

              <section className="room-detail-info-panel">
                <h2 className="text-xl font-black text-[#2b2118]">
                  Servicios y equipamiento
                </h2>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {(amenities.length > 0
                    ? amenities
                    : ["Baño privado", "Smart TV", "WiFi"]
                  ).map((amenity) => (
                    <div
                      key={amenity}
                      className="flex items-center gap-3 rounded-xl border border-[#eadfce] bg-[#fbf7f0] px-3 py-3 text-sm text-gray-700"
                    >
                      <span aria-hidden="true">{amenityIcon(amenity)}</span>
                      <span className="font-bold">{amenity}</span>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-xs text-gray-500">
                  El equipamiento mostrado es referencial y puede variar entre
                  habitaciones de la misma categoría.
                </p>
              </section>
            </div>
          </div>

          <aside className="room-detail-booking-aside">
            <div className="room-detail-booking-card">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a87545]">
                Consulta de disponibilidad
              </p>
              <h2 className="mt-2 text-2xl font-black text-[#2b2118]">
                Habitación {category.name}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                Selecciona tus fechas. El precio se mostrará únicamente
                después de comprobar que esta categoría tiene disponibilidad.
              </p>

              <div className="mt-5 space-y-3 border-y border-[#eadfce] py-5 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Categoría</span>
                  <span className="font-black">{category.name}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Camas</span>
                  <span className="max-w-[190px] text-right font-black">
                    {category.bed_description}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Capacidad</span>
                  <span className="font-black">
                    {category.capacity} persona(s)
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

                <div className="col-span-2">
                  <label className="text-sm font-bold text-gray-600">
                    Huéspedes
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={category.capacity}
                    value={guestsCount}
                    onChange={handleGuestsChange}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Máximo {category.capacity} persona(s) en esta categoría.
                  </p>
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

              <button
                type="button"
                onClick={handleCheckAvailability}
                disabled={checkingAvailability}
                className="room-detail-check-button"
              >
                {checkingAvailability
                  ? "Consultando..."
                  : "Consultar disponibilidad"}
              </button>

              {availabilityResult && (
                <div
                  className={`mt-5 rounded-2xl border p-5 ${
                    availabilityResult.available
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  {availabilityResult.available ? (
                    <>
                      <p className="font-black text-emerald-800">
                        Sí hay disponibilidad
                      </p>
                      <p className="mt-1 text-sm text-emerald-700">
                        {availabilityResult.quantity}{" "}
                        {availabilityResult.quantity === 1
                          ? "habitación disponible"
                          : "habitaciones disponibles"}{" "}
                        en esta categoría.
                      </p>

                      <div className="mt-4 border-t border-emerald-200 pt-4">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm text-gray-600">
                            Precio por noche
                          </span>
                          <strong className="text-xl text-[#2b2118]">
                            {formatMoney(
                              availabilityResult.price_per_night
                            )}
                          </strong>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-4">
                          <span className="text-sm text-gray-600">
                            Total · {availabilityResult.nights} noche(s)
                          </span>
                          <strong className="text-xl text-[#2b2118]">
                            {formatMoney(totalAmount)}
                          </strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleContinueToBooking}
                        className="room-detail-book-button"
                      >
                        Reservar esta categoría
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="font-black text-amber-800">
                        Sin disponibilidad para estas fechas
                      </p>
                      <p className="mt-1 text-sm text-amber-700">
                        Prueba con otras fechas o revisa otra categoría.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="room-detail-note-card">
              <h3 className="font-black text-[#2b2118]">
                Información importante
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                La habitación física se asignará internamente según
                disponibilidad. Las imágenes son referenciales de la categoría
                seleccionada.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
