import "./TourismRouteCTA.css";

export const TOURISM_POSTER_URL = "/img/home/descubre-pimentel-y-lambayeque.png";

export default function TourismGuideSection() {
  return (
    <section id="ruta-turistica-recomendada" className="tourism-invite scroll-mt-28" aria-label="Mapa turístico de Pimentel y Lambayeque">
      <img
        src={TOURISM_POSTER_URL}
        width="1536"
        height="1024"
        alt="Descubre Pimentel y Lambayeque: mapa de playas, gastronomía, museos, naturaleza y paseos en Chiclayo"
        className="tourism-invite__poster"
        loading="lazy"
        decoding="async"
      />
    </section>
  );
}
