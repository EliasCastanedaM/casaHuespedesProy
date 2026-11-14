import { useRef } from "react";
import { Link } from "react-router-dom";
import SocialDock from "../../components/SocialDock";
import { TOURISM_POSTER_URL } from "../../components/TourismRouteCTA";
import { places, museums, dishes, commonsImage, commonsFile } from "./tourismCatalog";
import "./WhatToDo.css";

const nearbyNature = [
  { id: "chaparri", title: "Reserva Ecológica Chaparrí", location: "Chongoyape", category: "Naturaleza",
    description: "Bosque seco y vida silvestre para descubrir otro paisaje de Lambayeque.",
    image: commonsImage("20250630 125710 Rerserva Ecológica Chaparri - Oso andino.jpg", 1200),
    source: commonsFile("20250630 125710 Rerserva Ecológica Chaparri - Oso andino.jpg"),
    credit: "Josefito123 · CC BY-SA 4.0" },
  { id: "pomac", title: "Santuario Histórico Bosque de Pómac", location: "Ferreñafe", category: "Naturaleza e historia",
    description: "Un encuentro con el bosque seco y el patrimonio cultural del norte peruano.",
    image: commonsImage("Bosque de Pómac.jpg", 1200),
    source: commonsFile("Bosque de Pómac.jpg"), credit: "Ozesama · autor y licencia en la fuente" },
];
const city = [
  { id: "parque", title: "Parque Principal de Chiclayo", category: "El corazón de la ciudad",
    description: "Una parada para pasear por el centro y conocer la vida cotidiana de Chiclayo.",
    image: commonsImage("Municipalidad de Chiclayo - Desde la catedral.jpg", 1000),
    source: commonsFile("Municipalidad de Chiclayo - Desde la catedral.jpg"), credit: "Enrique Jara · CC BY-SA 4.0" },
  { id: "musas", title: "Paseo de las Musas", category: "Paseo cultural",
    description: "Jardines y esculturas para una caminata y nuevas fotografías de tu viaje.",
    image: commonsImage("Paseo de las Musas - panorámica del lugar.jpg", 1000),
    source: commonsFile("Paseo de las Musas - panorámica del lugar.jpg"), credit: "Autor y licencia CC BY-SA 4.0 en la fuente" },
  { id: "mercado", title: "Mercado Modelo de Chiclayo", category: "Tradición y compras",
    description: "Un recorrido por el comercio local y las tradiciones de la ciudad.",
    image: commonsImage("MERCADO MODELO CHICLAYO.jpg", 1000),
    source: commonsFile("MERCADO MODELO CHICLAYO.jpg"), credit: "Pattylandia · CC0" },
];
const huaca = {
  id: "huaca-rajada", title: "Huaca Rajada · Sipán", location: "Sipán",
  description: "Completa tu recorrido cultural con el sitio arqueológico y su museo.",
  image: commonsImage("Museo de Sitio Huaca Rajada - Sipán.jpg", 1200),
  source: commonsFile("Museo de Sitio Huaca Rajada - Sipán.jpg"),
  credit: "Bernard Gagnon · autor y licencia en la fuente",
  officialUrl: "https://www.gob.pe/10988-visitar-el-museo-de-sitio-huaca-rajada-sipan",
};
const culture = [...museums, huaca];
const coastalPlaces = places.slice(0, 4);
const sections = [["mar", "Pimentel y el mar"], ["cultura", "Cultura y arqueología"], ["gastronomia", "Gastronomía"], ["naturaleza", "Naturaleza"], ["chiclayo", "Chiclayo"]];
const photoCredits = [...coastalPlaces, ...culture, ...dishes, ...nearbyNature, ...city];

function TravelImage({ item, eager = false }) {
  return <img src={item.image} alt={item.title} loading={eager ? "eager" : "lazy"} decoding="async"
    onError={(event) => {
      if (item.brochure && !event.currentTarget.dataset.fallback) {
        event.currentTarget.dataset.fallback = "true";
        event.currentTarget.src = item.brochure;
      }
    }} />;
}

function ExperienceCard({ item, museum = false, food = false }) {
  return (
    <article className={`pimentel-card ${museum ? "pimentel-card--museum" : ""}`}>
      <div className="pimentel-card__image">
        <TravelImage item={item} />
        <span className="pimentel-card__badge">{item.location || item.category}</span>
      </div>
      <div className="pimentel-card__body">
        <p className="pimentel-guide__eyebrow">{museum ? "Patrimonio cultural" : item.category}</p>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        {!food ? <div className="pimentel-card__actions">
          <a href={item.officialUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.title + ", Lambayeque, Perú")}`} target="_blank" rel="noopener noreferrer">
            {museum ? "Ver museo" : "Cómo llegar"} <span aria-hidden="true">↗</span>
          </a>
          {museum && item.brochure ? <a className="pimentel-card__secondary" href={item.brochure} target="_blank" rel="noopener noreferrer">Folleto</a> : null}
        </div> : null}
      </div>
    </article>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="pimentel-guide__heading">
      <div><p className="pimentel-guide__eyebrow">{eyebrow}</p><h2>{title}</h2></div>
      <p>{description}</p>
    </div>
  );
}

export default function WhatToDo() {
  const museumTrack = useRef(null);
  const scrollMuseums = (direction) => {
    const card = museumTrack.current?.firstElementChild;
    if (card) museumTrack.current.scrollBy({ left: direction * (card.getBoundingClientRect().width + 24), behavior: "smooth" });
  };
  return (
    <main className="pimentel-guide" id="que-hacer-en-pimentel">
      <header className="pimentel-guide__hero">
        <TravelImage item={places[1]} eager />
        <div className="pimentel-guide__wrap pimentel-guide__hero-copy">
          <p className="pimentel-guide__eyebrow">Mar · Cultura · Sabores del norte</p>
          <h1>Qué hacer<br />en Pimentel</h1>
          <p>El mar es solo el comienzo. Descubre Pimentel y Lambayeque desde Casa Huéspedes.</p>
          <a href="#mar" className="pimentel-guide__button">Descubre tu próxima experiencia <span aria-hidden="true">↓</span></a>
        </div>
      </header>

      <nav className="pimentel-guide__categories" aria-label="Experiencias para descubrir">
        {sections.map(([id, title]) => <a key={id} href={`#${id}`}>{title}</a>)}
      </nav>

      <section id="mar" className="pimentel-guide__section">
        <div className="pimentel-guide__wrap">
          <SectionHeading eyebrow="Un destino para disfrutar sin prisa" title="Pimentel y el mar"
            description="Recorre el muelle, camina por el malecón y disfruta de los atardeceres y la tradición de los caballitos de totora." />
          <div className="pimentel-guide__cards pimentel-guide__cards--four">
            {coastalPlaces.map(item => <ExperienceCard key={item.id} item={item} />)}
          </div>
        </div>
      </section>

      <section id="cultura" className="pimentel-guide__section pimentel-guide__section--dark">
        <div className="pimentel-guide__wrap">
          <SectionHeading eyebrow="Historia viva del norte" title="Museos de Lambayeque"
            description="Completa tu visita con una ruta por museos y sitios arqueológicos que conservan el legado Mochica, Lambayeque y Sicán." />
          <div className="pimentel-guide__controls">
            <a className="pimentel-guide__button" href="#mapa">Ver nuestra ruta <span aria-hidden="true">↗</span></a>
            <button type="button" onClick={() => scrollMuseums(-1)} aria-label="Museo anterior">‹</button>
            <button type="button" onClick={() => scrollMuseums(1)} aria-label="Museo siguiente">›</button>
          </div>
          <div ref={museumTrack} className="pimentel-guide__museum-track">
            {culture.map(item => <ExperienceCard key={item.id} item={item} museum />)}
          </div>
        </div>
      </section>

      <section id="gastronomia" className="pimentel-guide__section">
        <div className="pimentel-guide__wrap">
          <SectionHeading eyebrow="Sabores del norte" title="Gastronomía de Pimentel"
            description="Mar, tradición culinaria lambayecana e ingredientes del norte. Sabores que también forman parte del viaje." />
          <div className="pimentel-guide__cards">
            {dishes.map(item => <ExperienceCard key={item.id} item={item} food />)}
          </div>
          <div className="pimentel-guide__restaurants">
            <p className="pimentel-guide__eyebrow">Las recomendaciones de nuestra guía</p>
            <p>Arroz con pato · <strong>La Tienda del Pato</strong></p>
            <p>Ceviche · <strong>La Tintorera</strong></p>
            <p>Pescado frito · <strong>Bertika’s</strong></p>
            <small>Las fotografías de platos son referenciales; no corresponden necesariamente a estos restaurantes.</small>
          </div>
        </div>
      </section>

      <section id="naturaleza" className="pimentel-guide__section pimentel-guide__section--dark">
        <div className="pimentel-guide__wrap">
          <SectionHeading eyebrow="Una pausa entre paisajes" title="Naturaleza por descubrir"
            description="Explora el bosque seco y la vida silvestre de Lambayeque. Dos destinos para seguir descubriendo el norte." />
          <div className="pimentel-guide__cards pimentel-guide__cards--two">
            {nearbyNature.map(item => <ExperienceCard key={item.id} item={item} />)}
          </div>
        </div>
      </section>

      <section id="chiclayo" className="pimentel-guide__section">
        <div className="pimentel-guide__wrap">
          <SectionHeading eyebrow="Paseos y vida local" title="Una escapada a Chiclayo"
            description="Historia, tradición, gastronomía y compras locales. Suma un paseo por la ciudad a tu estadía en Pimentel." />
          <div className="pimentel-guide__cards">{city.map(item => <ExperienceCard key={item.id} item={item} />)}</div>
        </div>
      </section>

      <section id="mapa" className="pimentel-guide__section pimentel-guide__map-section">
        <div className="pimentel-guide__wrap">
          <SectionHeading eyebrow="Tu punto de partida" title="Descubre Pimentel y Lambayeque" description="Reúne tus próximos planes en nuestra guía turística ilustrada." />
          <figure className="pimentel-guide__map">
            <img src={TOURISM_POSTER_URL} width="1536" height="1024" alt="Mapa turístico de Pimentel y Lambayeque, con mar, gastronomía, cultura, naturaleza y Chiclayo" loading="lazy" decoding="async" />
            <figcaption>Mapa ilustrativo. Rutas, distancias y tiempos referenciales. Confirma horarios, tarifas y condiciones directamente con cada lugar.</figcaption>
          </figure>
        </div>
      </section>

      <section className="pimentel-guide__stay">
        <p className="pimentel-guide__eyebrow">Casa Huéspedes Pimentel</p>
        <h2>Descubre el norte.<br />Descansa cerca del mar.</h2>
        <Link to="/habitaciones" className="pimentel-guide__button">Conoce nuestras habitaciones <span aria-hidden="true">↗</span></Link>
      </section>
      <details className="pimentel-guide__credits pimentel-guide__wrap">
        <summary>Créditos y fuentes de las fotografías</summary>
        <p>Fotografías con encuadre de presentación. Consulta la autoría y las condiciones de cada imagen en su fuente original.</p>
        <ul>{photoCredits.map(item => <li key={item.id}><a href={item.source} target="_blank" rel="noopener noreferrer">{item.title}: {item.credit}</a></li>)}</ul>
      </details>
      <SocialDock />
    </main>
  );
}
