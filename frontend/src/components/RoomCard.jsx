import { Link } from "react-router-dom";

import "./RoomCard.css";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85";

function getRoomNumber(room) {
  const directNumber =
    room.room_number ??
    room.roomNumber ??
    room.number ??
    room.code;

  if (directNumber) {
    return String(directNumber);
  }

  // Si el nombre contiene "#101", obtiene solamente 101.
  const numberInName = String(room.name ?? room.title ?? "").match(
    /#?\s*(\d{3})\b/
  );

  if (numberInName) {
    return numberInName[1];
  }

  return String(room.id ?? "");
}

function getRoomImage(room) {
  const firstImage = room.images?.[0];

  const firstImageSource =
    typeof firstImage === "string"
      ? firstImage
      : firstImage?.url ?? firstImage?.image_url;

  return (
    room.main_image_url ??
    room.mainImageUrl ??
    room.image_url ??
    room.image ??
    firstImageSource ??
    DEFAULT_IMAGE
  );
}

function getMediaCount(room, type) {
  if (type === "photos") {
    return Number(
      room.photos_count ??
        room.images_count ??
        room._photos_count ??
        room.images?.length ??
        0
    );
  }

  return Number(
    room.videos_count ??
      room._videos_count ??
      room.videos?.length ??
      0
  );
}

function isRoomAvailable(room) {
  const status = String(room.status ?? "").toLowerCase();

  const unavailableStatuses = [
    "inactive",
    "inactivo",
    "maintenance",
    "mantenimiento",
    "blocked",
    "bloqueado",
    "unavailable",
    "no disponible",
  ];

  return (
    room.active !== false &&
    room.is_active !== false &&
    room.is_available !== false &&
    !unavailableStatuses.includes(status)
  );
}

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="room-card-small-icon"
    >
      <path d="M8.5 5.5 10 3.7h4l1.5 1.8H19a3 3 0 0 1 3 3v8.5a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V8.5a3 3 0 0 1 3-3h3.5Zm3.5 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 1.8a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4Z" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="room-card-small-icon"
    >
      <path d="M4.5 5h10A3.5 3.5 0 0 1 18 8.5v.65l2.4-1.45A1.05 1.05 0 0 1 22 8.6v6.8a1.05 1.05 0 0 1-1.6.9L18 14.85v.65a3.5 3.5 0 0 1-3.5 3.5h-10A3.5 3.5 0 0 1 1 15.5v-7A3.5 3.5 0 0 1 4.5 5Z" />
    </svg>
  );
}

function GuestIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-5 0-8 2.7-8 6.2 0 .45.35.8.8.8h14.4c.45 0 .8-.35.8-.8C20 16.7 17 14 12 14Z" />
    </svg>
  );
}

function DoorIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 3.8A1.8 1.8 0 0 1 6.8 2h9.4A1.8 1.8 0 0 1 18 3.8V20h2v2H3v-2h2V3.8Zm2 1V20h9V4H7Zm6.4 7.2a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.3 5.3a1 1 0 0 1 1.4 0l6 6a1 1 0 0 1 0 1.4l-6 6a1 1 0 1 1-1.4-1.4l4.3-4.3H4a1 1 0 1 1 0-2h13.6l-4.3-4.3a1 1 0 0 1 0-1.4Z" />
    </svg>
  );
}

export default function RoomCard({ room }) {
  const roomNumber = getRoomNumber(room);
  const roomImage = getRoomImage(room);
  const photosCount = getMediaCount(room, "photos");
  const videosCount = getMediaCount(room, "videos");
  const available = isRoomAvailable(room);

  const capacity = Number(room.capacity ?? room.max_guests ?? 1);

  const roomType =
    room.room_type ??
    room.type ??
    room.category ??
    "Habitación";

  const roomTitle =
    room.name ??
    room.title ??
    `Habitación ${roomType}${roomNumber ? ` #${roomNumber}` : ""}`;

  const description =
    room.description ??
    "Un espacio cómodo y preparado para disfrutar una estadía tranquila en Pimentel.";

  const price = Number(room.price_per_night ?? room.price ?? 0);
  const showPrice = Number.isFinite(price) && price > 0;

  return (
    <article className="room-card">
      {/* Imagen principal */}
      <Link
        to={`/habitaciones/${room.id}`}
        className="room-card-image-wrapper"
        aria-label={`Ver detalles de ${roomTitle}`}
      >
        <img
          src={roomImage}
          alt={roomTitle}
          className="room-card-image"
          loading="lazy"
        />

        <div className="room-card-image-shade" />

        <span
          className={`room-card-status ${
            available
              ? "room-card-status-available"
              : "room-card-status-unavailable"
          }`}
        >
          <span className="room-card-status-dot" />
          {available ? "Disponible" : "No disponible"}
        </span>

        {(photosCount > 0 || videosCount > 0) && (
          <div className="room-card-media">
            {photosCount > 0 && (
              <span>
                <CameraIcon />
                {photosCount} {photosCount === 1 ? "foto" : "fotos"}
              </span>
            )}

            {videosCount > 0 && (
              <span>
                <VideoIcon />
                {videosCount} {videosCount === 1 ? "video" : "videos"}
              </span>
            )}
          </div>
        )}
      </Link>

      {/* Información */}
      <div className="room-card-body">
        <div className="room-card-heading">
          <div>
            <p className="room-card-eyebrow">Casa Huéspedes Pimentel</p>
            <h3>{roomTitle}</h3>
          </div>

          {roomNumber && (
            <span className="room-card-number">
              Hab. {roomNumber}
            </span>
          )}
        </div>

        <div className="room-card-details">
          <span>
            <GuestIcon />
            Hasta {capacity}{" "}
            {capacity === 1 ? "huésped" : "huéspedes"}
          </span>

          <span>
            <DoorIcon />
            Baño privado
          </span>
        </div>

        <p className="room-card-description">{description}</p>

        <div className="room-card-footer">
          <div className="room-card-price">
            {showPrice ? (
              <>
                <span>Desde</span>
                <strong>S/ {price.toFixed(2)}</strong>
                <small>por noche</small>
              </>
            ) : (
              <>
                <span>Tarifa</span>
                <strong>Consultar</strong>
                <small>según fechas y huéspedes</small>
              </>
            )}
          </div>

          <div className="room-card-actions">
            <Link
              to={`/habitaciones/${room.id}`}
              className="room-card-detail-button"
            >
              Ver habitación
            </Link>

            {available ? (
              <Link
                to={`/reservar?roomId=${room.id}`}
                className="room-card-book-button"
              >
                Consultar
                <ArrowIcon />
              </Link>
            ) : (
              <span className="room-card-disabled-button">
                No disponible
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
