import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Wifi, Bath, Tv, Fan, Coffee, Utensils, Waves, Sun, Armchair, Shirt, Flame, Plane, Car, PawPrint, ShieldCheck, Sparkles, ClipboardCheck, Languages, CigaretteOff, MapPin, ArrowUpRight, Plus } from "lucide-react";
import api from "../../services/api.js";
import SocialDock from "../../components/SocialDock";
import "./Services.css";

const includedIds = ["wifi", "bano-privado", "tv-netflix", "ventilador", "desayuno-continental"];
const spaceIds = ["terraza", "cocina-compartida", "salon-compartido", "exteriores", "playa-pediluvio"];
const extraIds = ["lavanderia", "barbacoa", "traslado-aeropuerto", "comida-bebida", "menus-dieteticos", "estacionamiento", "taxi", "mascotas"];
const icons = { wifi: Wifi, "bano-privado": Bath, "tv-netflix": Tv, ventilador: Fan, "desayuno-continental": Coffee,
  terraza: Waves, "cocina-compartida": Utensils, "salon-compartido": Armchair, exteriores: Sun, "playa-pediluvio": Waves,
  lavanderia: Shirt, barbacoa: Flame, "traslado-aeropuerto": Plane, "comida-bebida": Utensils, "menus-dieteticos": Utensils,
  estacionamiento: Car, taxi: Car, mascotas: PawPrint, seguridad: ShieldCheck, "limpieza-diaria": Sparkles,
  recepcion: ClipboardCheck, idiomas: Languages, "habitaciones-familiares": CigaretteOff, "orientacion-turistica": MapPin };

function ServiceIcon({ slug }) {
  const Icon = icons[slug] || Sparkles;
  return <Icon size={25} strokeWidth={1.4} aria-hidden="true" />;
}
function ServiceCondition({ service }) {
  const included = service.price_type === "included" && !service.requires_coordination;
  const label = included ? "Incluido en tu estadía" : service.requires_coordination ? "Previa coordinación" : "Consulta condiciones";
  return <span className={"hotel-services__condition" + (included ? " hotel-services__condition--included" : "")}>{label}</span>;
}
function SectionHeading({ eyebrow, title, description }) {
  return <div className="hotel-services__heading"><div><p className="hotel-services__eyebrow">{eyebrow}</p><h2>{title}</h2></div><p>{description}</p></div>;
}
export default function Services() {
  const [services, setServices] = useState([]);
  const [status, setStatus] = useState("loading");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    api.get("/services", { signal: controller.signal }).then(({ data }) => {
      if (controller.signal.aborted) return;
      setServices((Array.isArray(data?.data) ? data.data : []).filter(service => service?.name && service.is_active !== false &&
        (!service.verification_status || ["approved", "publicly_listed"].includes(service.verification_status))));
      setStatus("ready");
    }).catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => controller.abort();
  }, [retry]);
  const included = services.filter(s => includedIds.includes(s.slug) && s.price_type === "included" && !s.requires_coordination);
  const spaces = services.filter(s => spaceIds.includes(s.slug));
  const extras = services.filter(s => extraIds.includes(s.slug) || (includedIds.includes(s.slug) && !included.includes(s)));
  const information = services.filter(s => !included.includes(s) && !spaces.includes(s) && !extras.includes(s));
  const terrace = spaces.find(s => s.slug === "terraza");
  return <main className="hotel-services" id="servicios">
    <header className="hotel-services__hero">
      <img src="/img/galeria/galeria-3.jpg" alt="Terraza de Casa Huéspedes Pimentel al atardecer" fetchPriority="high" />
      <div className="hotel-services__wrap hotel-services__hero-copy">
        <p className="hotel-services__eyebrow">Nuestros servicios · Casa Huéspedes Pimentel</p>
        <h1>Siéntete en casa.<br />Disfruta Pimentel.</h1>
        <p>Descubre los pequeños detalles, los espacios para compartir y los servicios que acompañan tu estadía cerca al mar.</p>
        <a href="#incluidos" className="hotel-services__button">Conoce nuestros servicios <span aria-hidden="true">↓</span></a>
      </div>
      <span className="hotel-services__photo-caption">Un atardecer en nuestra terraza</span>
    </header>
    <nav className="hotel-services__navigation" aria-label="Explorar servicios">
      <a href="#incluidos">En tu estadía</a><a href="#espacios">Espacios para disfrutar</a><a href="#adicionales">Servicios adicionales</a><a href="#antes-de-llegar">Antes de llegar</a>
    </nav>
    {status !== "ready" || services.length === 0 ? <section className="hotel-services__wrap hotel-services__state" aria-live="polite">
      {status === "loading" ? <p role="status">Estamos preparando los detalles de tu estadía…</p> : <>
        <h2>{status === "error" ? "Un momento, por favor" : "Te ayudamos a planificar tu estadía"}</h2>
        <p>{status === "error" ? "No pudimos cargar los servicios. Puedes intentarlo nuevamente o consultar con nuestro equipo." : "Consulta con nuestro equipo los servicios disponibles para tu visita."}</p>
        {status === "error" && <button className="hotel-services__button" onClick={() => setRetry(value => value + 1)}>Volver a intentar</button>}
        <Link to="/contacto" className="hotel-services__text-link">Contactar al hospedaje <ArrowUpRight size={17} aria-hidden="true" /></Link>
      </>}
    </section> : <>
      {included.length > 0 && <section id="incluidos" className="hotel-services__section"><div className="hotel-services__wrap">
        <SectionHeading eyebrow="Lo esencial, incluido" title="Comodidad en cada detalle." description="Descansa, desconéctate y disfruta tu visita. Estos servicios forman parte de tu alojamiento." />
        <div className="hotel-services__included">{included.map(s => <article key={s.slug}>
          <ServiceIcon slug={s.slug} /><h3>{s.name}</h3><p>{s.description}</p><ServiceCondition service={s} />
        </article>)}</div>
      </div></section>}
      {spaces.length > 0 && <section id="espacios" className="hotel-services__section hotel-services__section--dark"><div className="hotel-services__wrap">
        <div className="hotel-services__space-feature">
          <figure><img src="/img/galeria/galeria-4.jpg" alt="Mesas, plantas y vista hacia el mar desde la terraza del hospedaje" loading="lazy" decoding="async" /></figure>
          <div><p className="hotel-services__eyebrow">Espacios para disfrutar</p><h2>Una pausa.<br />Una brisa.<br />Un buen momento.</h2>
            {terrace ? <><p>{terrace.description}</p><ServiceCondition service={terrace} /></> : <p>Conoce nuestros espacios de uso compartido para disfrutar durante tu visita.</p>}
          </div>
        </div>
        <div className="hotel-services__spaces">{spaces.filter(s => s.slug !== "terraza").map(s => <article key={s.slug}>
          <ServiceIcon slug={s.slug} /><div><h3>{s.name}</h3><p>{s.description}</p><ServiceCondition service={s} /></div>
        </article>)}</div>
      </div></section>}
      {extras.length > 0 && <section id="adicionales" className="hotel-services__section"><div className="hotel-services__wrap">
        <SectionHeading eyebrow="A tu manera" title="Haz tu viaje más sencillo." description="Servicios adicionales y opciones que puedes coordinar con nuestro equipo. Confirma las condiciones, los cargos y la disponibilidad antes de contratarlos." />
        <div className="hotel-services__extras">{extras.map(s => <article key={s.slug}>
          <div className="hotel-services__card-top"><ServiceIcon slug={s.slug} /><ServiceCondition service={s} /></div>
          <h3>{s.name}</h3><p>{s.description}</p>
          {Number(s.price) > 0 && !/S\/\s*\d/.test(s.description || "") && <p className="hotel-services__price">Cargo: S/ {Number(s.price).toFixed(2)}. Consulta las condiciones de aplicación.</p>}
        </article>)}</div>
      </div></section>}
      {information.length > 0 && <section id="antes-de-llegar" className="hotel-services__section hotel-services__practical"><div className="hotel-services__wrap hotel-services__practical-layout">
        <div><p className="hotel-services__eyebrow">Para una visita tranquila</p><h2>Antes<br />de llegar.</h2><p>Información útil para organizar tu visita y sentirte cómodo desde el primer día.</p>
          <Link to="/contacto" className="hotel-services__text-link">Conversemos sobre tu visita <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>
        <div className="hotel-services__details">{information.map(s => <details key={s.slug || s.name}>
          <summary><ServiceIcon slug={s.slug} /><span>{s.name}</span><Plus size={18} strokeWidth={1.5} aria-hidden="true" /></summary>
          <p>{s.description}</p><ServiceCondition service={s} />
        </details>)}</div>
      </div></section>}
    </>}
    <section className="hotel-services__closing"><div className="hotel-services__wrap">
      <div><p className="hotel-services__eyebrow">Tu próximo descanso empieza aquí</p><h2>Encuentra tu espacio<br />cerca al mar.</h2></div>
      <Link to="/habitaciones" className="hotel-services__button">Ver habitaciones <ArrowUpRight size={17} aria-hidden="true" /></Link>
    </div></section>
    <SocialDock />
  </main>;
}
