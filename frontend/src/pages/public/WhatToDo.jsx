import { Link } from "react-router-dom";
import { TOURISM_POSTER_URL } from "../../components/TourismRouteCTA";
import "./WhatToDo.css";

const experiences = [
  {
    id: "mar", label: "01 / Pimentel y el mar", title: "Déjate llevar por la costa",
    description: "Disfruta del mar, los paseos al atardecer y la cultura viva de los pescadores.",
    places: ["Muelle de Pimentel", "Playa de Pimentel", "Caballitos de totora", "Malecón de Pimentel"],
    color: "#17617a",
  },
  {
    id: "gastronomia", label: "02 / Gastronomía en Pimentel", title: "Sabores del norte, frente al mar",
    description: "Cocina criolla, marina y tradicional para acompañar tu visita.",
    places: ["Arroz con pato · La Tienda del Pato", "Ceviche · La Tintorera", "Pescado frito · Bertika’s"],
    color: "#a44927",
  },
  {
    id: "cultura", label: "03 / Cultura y arqueología", title: "Un encuentro con nuestra historia",
    description: "Descubre el patrimonio de Lambayeque en sus museos y sitios arqueológicos.",
    places: ["Museo Tumbas Reales de Sipán · Lambayeque", "Pirámides y Museo de Sitio de Túcume", "Museo Nacional Sicán · Ferreñafe", "Huaca Rajada · Sipán"],
    color: "#91601a",
  },
  {
    id: "naturaleza", label: "04 / Naturaleza", title: "Otro paisaje por descubrir",
    description: "Explora el lado natural de Lambayeque, entre bosque seco y vida silvestre.",
    places: ["Reserva Ecológica Chaparrí", "Santuario Histórico Bosque de Pómac"],
    color: "#48613b",
  },
  {
    id: "chiclayo", label: "05 / Chiclayo", title: "Paseos, tradición y vida local",
    description: "Una ciudad para los paseos culturales, la gastronomía y las compras locales.",
    places: ["Parque Principal", "Paseo de las Musas", "Mercado Modelo"],
    color: "#17617a",
  },
];

export default function WhatToDo() {
  return (
    <main className="pimentel-guide" id="que-hacer-en-pimentel">
      <header className="pimentel-guide__intro">
        <p className="pimentel-guide__eyebrow">Desde Casa Huéspedes Pimentel</p>
        <h1>Qué hacer en Pimentel</h1>
        <p className="pimentel-guide__lead">El mar es solo el comienzo.</p>
        <p>Playa, sabores, historia y naturaleza. Encuentra tu próxima experiencia en Pimentel y Lambayeque.</p>
      </header>

      <figure className="pimentel-guide__map">
        <img src={TOURISM_POSTER_URL} width="1536" height="1024" alt="Mapa ilustrado de Pimentel y Lambayeque: mar, gastronomía, cultura, naturaleza y Chiclayo" decoding="async" />
        <figcaption>Mapa turístico ilustrativo. Las rutas, distancias y tiempos del afiche son referenciales.</figcaption>
      </figure>

      <nav className="pimentel-guide__categories" aria-label="Experiencias para descubrir">
        {experiences.map((experience) => (
          <a key={experience.id} href={`#${experience.id}`}>{experience.label.split(" / ")[1]}</a>
        ))}
      </nav>

      <div className="pimentel-guide__grid">
        {experiences.map((experience) => (
          <section key={experience.id} id={experience.id} className="pimentel-guide__experience" style={{ "--experience-color": experience.color }} aria-labelledby={`${experience.id}-title`}>
            <p className="pimentel-guide__eyebrow">{experience.label}</p>
            <h2 id={`${experience.id}-title`}>{experience.title}</h2>
            <p>{experience.description}</p>
            <ul>{experience.places.map((place) => <li key={place}>{place}</li>)}</ul>
          </section>
        ))}
        <aside className="pimentel-guide__stay">
          <p className="pimentel-guide__eyebrow">Tu punto de partida</p>
          <h2>Descubre el norte.<br />Descansa en Pimentel.</h2>
          <p>Elige tu habitación y empieza a planear tu estadía con nosotros.</p>
          <Link to="/habitaciones">Conoce nuestras habitaciones <span aria-hidden="true">↗</span></Link>
        </aside>
      </div>
      <p className="pimentel-guide__note">Recomendaciones de nuestra guía ilustrada. Antes de salir, confirma directamente con cada lugar sus horarios, tarifas y condiciones de visita.</p>
    </main>
  );
}
