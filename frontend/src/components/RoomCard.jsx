import { Link } from "react-router-dom";

export default function RoomCard({ room, onChoose }) {
  const imageUrl =
    room.main_image_url ||
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1200&auto=format&fit=crop";

  return (
    <article className="hotel-room-card">
      <Link to={`/habitaciones/${room.id}`} className="hotel-room-image-link">
        <div className="hotel-room-image-wrap">
          <img src={imageUrl} alt={room.name} />

          <div className="hotel-room-status-badge">
            Disponible
          </div>

          <div className="hotel-room-media-overlay">
            <span>📷 {room.photos_count || 30} fotos</span>
            <span>🎥 {room.videos_count || 5} videos</span>
          </div>
        </div>
      </Link>

      <div className="hotel-room-card-content">
        <h3>{room.name}</h3>

        <div className="hotel-room-meta">
          <span>👤 {room.capacity} huésped(es)</span>
          <span>🛏 Hab. {room.id}</span>
        </div>

        <p className="hotel-room-short-description">
          {room.description ||
            "Habitación cómoda con contenido visual disponible para revisar antes de reservar."}
        </p>

        <div className="hotel-room-tags">
          <span>Fotos reales</span>
          <span>Videos del ambiente</span>
        </div>

        <div className="hotel-room-footer">
          <div>
            <p className="hotel-price">
              S/ {Number(room.price_per_night || 0).toFixed(2)}
              <span> / noche</span>
            </p>
          </div>

          <div className="hotel-room-actions">
            <Link to={`/habitaciones/${room.id}`} className="hotel-link-btn">
              Ver habitación
            </Link>

            {onChoose ? (
              <button
                type="button"
                onClick={() => onChoose(room)}
                className="hotel-room-reserve-btn"
              >
                Elegir
              </button>
            ) : (
              <Link
                to={`/reservar?roomId=${room.id}`}
                className="hotel-room-reserve-btn"
              >
                Reservar
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}