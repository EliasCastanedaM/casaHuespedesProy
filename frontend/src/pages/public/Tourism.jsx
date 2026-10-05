import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const SITE_URL = "https://www.casahuespedespimentel.com";
const HERO_VIDEO = "/videos/pimentel.mp4";
const HERO_FALLBACK =
  "https://commons.wikimedia.org/wiki/Special:Redirect/file/Puesta%20de%20sol%20sobre%20el%20muelle%20de%20Pimentel.jpg?width=2200";

const museumGalleryModules = import.meta.glob(
  "../../assets/gallery/museo-*.{jpg,jpeg,png,webp}",
  { eager: true, import: "default" },
);

function getMuseumGalleryImage(fileName) {
  const galleryEntry = Object.entries(museumGalleryModules).find(([path]) =>
    path.endsWith(`/${fileName}`),
  );
  return galleryEntry?.[1] || "";
}

function commonsImage(fileName, width = 1600) {
  return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(
    fileName,
  )}?width=${width}`;
}

function commonsFile(fileName) {
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`;
}

const places = [
  {
    id: "muelle-pimentel",
    title: "Muelle de Pimentel",
    category: "Imperdible",
    description:
      "El ícono costero de Pimentel: una caminata sobre el Pacífico, historia portuaria y uno de los mejores puntos para ver caer el sol.",
    image: commonsImage("Muelle De Pimentel.jpg", 1700),
    source: commonsFile("Muelle De Pimentel.jpg"),
    credit: "José Enrique Montes Seminario · CC BY-SA 4.0",
    feature: true,
  },
  {
    id: "playa-pimentel",
    title: "Playa de Pimentel",
    category: "Mar y descanso",
    description:
      "Arena, brisa y un horizonte abierto para caminar, descansar y vivir la costa norte a pocos pasos del malecón.",
    image: commonsImage("Playa y muelle de Pimentel.jpg", 1700),
    source: commonsFile("Playa y muelle de Pimentel.jpg"),
    credit: "Frank Coronel Mendoza · CC BY-SA 4.0",
  },
  {
    id: "caballitos-totora",
    title: "Caballitos de Totora",
    category: "Tradición",
    description:
      "Embarcaciones ancestrales que siguen conectando a los pescadores con el mar y con una tradición viva del norte peruano.",
    image: commonsImage("Totoras in Chiclayo.JPG", 1600),
    source: commonsFile("Totoras in Chiclayo.JPG"),
    credit: "Uli von Oben · CC BY-SA 4.0",
  },
  {
    id: "malecon-pimentel",
    title: "Malecón de Pimentel",
    category: "Paseo",
    description:
      "Un recorrido junto al mar entre espacios para descansar, restaurantes, vistas abiertas y el ritmo cotidiano del balneario.",
    image: commonsImage("Pimentel beachpromenade.JPG", 1600),
    source: commonsFile("Pimentel beachpromenade.JPG"),
    credit: "Catatine · CC BY-SA 4.0",
  },
  {
    id: "pesca-artesanal",
    title: "Pesca artesanal",
    category: "Identidad",
    description:
      "Una escena que resume la relación histórica de Pimentel con el océano y la vida de quienes trabajan frente al mar.",
    image: commonsImage("Pescado Fresco - caballito totora.jpg", 1500),
    source: commonsFile("Pescado Fresco - caballito totora.jpg"),
    credit: "Miguel Vera León · CC BY 2.0",
  },
  {
    id: "atardeceres-pimentel",
    title: "Atardeceres frente al mar",
    category: "Experiencia",
    description:
      "La hora dorada transforma la playa y el muelle en una de las postales más memorables de la costa lambayecana.",
    image: commonsImage("Sunset in Pimentel, Peru.jpg", 1600),
    source: commonsFile("Sunset in Pimentel, Peru.jpg"),
    credit: "Pete Cable · CC BY 2.0",
  },
  {
    id: "casa-museo-quinones",
    title: "Casa Museo José Abelardo Quiñones",
    category: "Cultura",
    description:
      "La casa museo de Pimentel conserva ambientes, objetos y recuerdos vinculados al héroe de la aviación peruana José Abelardo Quiñones Gonzales.",
    image: "https://consultasenlinea.mincetur.gob.pe/fichaInventario/foto.aspx?cod=555332",
    source: "https://consultasenlinea.mincetur.gob.pe/fichaInventario/index.aspx?cod_Ficha=3781",
    credit: "MINCETUR · Inventario Nacional de Recursos Turísticos",
  },
  {
    id: "playa-las-rocas",
    title: "Playa Las Rocas",
    category: "Naturaleza",
    description:
      "Un rincón de la costa de Pimentel con formaciones rocosas, brisa marina y una atmósfera más tranquila para contemplar el paisaje.",
    image: "https://consultasenlinea.mincetur.gob.pe/fichaInventario/foto.aspx?cod=555297",
    source: "https://consultasenlinea.mincetur.gob.pe/fichaInventario/foto.aspx?cod=555297",
    credit: "MINCETUR · Inventario Nacional de Recursos Turísticos",
  },
];

const museumMap = getMuseumGalleryImage("museo-mapa-lambayeque.png");

const museums = [
  {
    id: "tumbas-reales-sipan",
    title: "Museo Tumbas Reales de Sipán",
    location: "Lambayeque",
    description:
      "Un museo de referencia mundial para conocer el legado del Señor de Sipán y la extraordinaria orfebrería mochica.",
    image: commonsImage("Tumbas Reales de Sipán Museum 01.jpg", 1400),
    source: commonsFile("Tumbas Reales de Sipán Museum 01.jpg"),
    credit: "Bernard Gagnon · CC BY-SA 3.0",
    brochure: getMuseumGalleryImage("museo-tumbas-reales-sipan.png"),
    officialUrl: "https://museos.cultura.pe/node/385",
  },
  {
    id: "museo-sitio-tucume",
    title: "Museo de Sitio Túcume",
    location: "Túcume",
    description:
      "El punto de entrada al Valle de las Pirámides y a siglos de continuidad cultural Lambayeque, Chimú e Inca.",
    image: commonsImage("Museo de Sitio, Túcume.jpg", 1400),
    source: commonsFile("Museo de Sitio, Túcume.jpg"),
    credit: "Bernard Gagnon · CC BY-SA 3.0",
    brochure: getMuseumGalleryImage("museo-sitio-tucume.png"),
    officialUrl: "https://museos.cultura.pe/museos/museo-de-sitio-t%C3%BAcume",
  },
  {
    id: "museo-bruning",
    title: "Museo Arqueológico Nacional Brüning",
    location: "Lambayeque",
    description:
      "Colecciones de cerámica, metales y objetos que recorren el desarrollo cultural del norte peruano.",
    image: commonsImage("Brüning Museum.jpg", 1400),
    source: commonsFile("Brüning Museum.jpg"),
    credit: "Bernard Gagnon · CC BY-SA 3.0",
    brochure: getMuseumGalleryImage("museo-arqueologico-bruning.png"),
    officialUrl:
      "https://museos.cultura.pe/museos/museo-arqueol%C3%B3gico-nacional-br%C3%BCning",
  },
  {
    id: "museo-sican",
    title: "Museo Nacional Sicán",
    location: "Ferreñafe",
    description:
      "Una visita para descubrir la cultura Sicán, su tecnología metalúrgica, sus símbolos y sus contextos funerarios.",
    image: commonsImage("Museo Nacional Sicán en Ferreñafe.jpg", 1400),
    source: commonsFile("Museo Nacional Sicán en Ferreñafe.jpg"),
    credit: "Ozesama · CC BY-SA 4.0",
    brochure: getMuseumGalleryImage("museo-nacional-sican.png"),
    officialUrl: "https://museos.cultura.pe/museos/museo-nacional-sic%C3%A1n",
  },
];

const dishes = [
  {
    id: "ceviche",
    title: "Ceviche de pescado",
    category: "Cocina marina",
    description: "Pescado, limón, cebolla y ají: frescura costera en cada bocado.",
    image: commonsImage("Ceviche Perú.jpg", 1300),
    source: commonsFile("Ceviche Perú.jpg"),
    credit: "Gatodemichi · CC BY-SA 4.0",
  },
  {
    id: "arroz-mariscos",
    title: "Arroz con mariscos",
    category: "Cocina marina",
    description: "Arroz sazonado y mariscos en una receta abundante y llena de sabor.",
    image: commonsImage("Arroz con mariscos.JPG", 1300),
    source: commonsFile("Arroz con mariscos.JPG"),
    credit: "Wikimedia Commons · Chiclayo, Lambayeque",
  },
  {
    id: "chinguirito",
    title: "Chinguirito",
    category: "Tradición lambayecana",
    description:
      "Pescado seco deshilachado, limón, cebolla y ají: una preparación profundamente norteña.",
    image: commonsImage("Chinguimixto.JPG", 1300),
    source: commonsFile("Chinguimixto.JPG"),
    credit: "Dtarazona · dominio público · la foto incluye una porción de chinguirito",
  },
  {
    id: "tortilla-raya",
    title: "Tortilla de raya",
    category: "Tradición lambayecana",
    description: "Raya seca, huevo y sazón norteña en uno de los platos más singulares de la región.",
    image: commonsImage("Tortilla de raya.JPG", 1300),
    source: commonsFile("Tortilla de raya.JPG"),
    credit: "Dtarazona · dominio público",
  },
  {
    id: "arroz-pato",
    title: "Arroz con pato",
    category: "Cocina regional",
    description: "El clásico chiclayano de arroz verde, culantro y pato con sazón del norte.",
    image: commonsImage("Arroz con pato a la chiclayana.JPG", 1300),
    source: commonsFile("Arroz con pato a la chiclayana.JPG"),
    credit: "Dtarazona · dominio público",
  },
  {
    id: "seco-cabrito",
    title: "Seco de cabrito",
    category: "Cocina regional",
    description: "Cabrito guisado con sabor intenso, acompañado tradicionalmente de arroz y frejoles.",
    image: commonsImage("Seco de Cabrito.JPG", 1300),
    source: commonsFile("Seco de Cabrito.JPG"),
    credit: "Dtarazona · dominio público",
  },
];

const videos = [
  {
    id: "pimentel-en-movimiento",
    eyebrow: "Pimentel en movimiento",
    title: "Una experiencia frente al mar",
    description:
      "Recorre el muelle, contempla el océano y descubre por qué Pimentel es uno de los destinos costeros más especiales de Lambayeque.",
    src: "https://youtu.be/i9sVbpX1v7U?si=FhqjNPrlLj24cQli",
    buttonText: "Conocer habitaciones",
    buttonLink: "/habitaciones",
  },
  {
    id: "sabores-en-movimiento",
    eyebrow: "Sabores de Lambayeque",
    title: "Tradición que también se disfruta",
    description:
      "La cocina lambayecana reúne mar, campo y recetas transmitidas por generaciones. Una razón más para quedarse y descubrir el norte.",
    src: "https://youtu.be/9TlXvLy2_rw?si=mz5nWpckSbfk_Nnb",
    buttonText: "Consultar disponibilidad",
    buttonLink: "/#disponibilidad",
  },
];

const faqItems = [
  {
    question: "¿Qué hacer en Pimentel, Perú?",
    answer:
      "Recorrer el muelle, caminar por la playa y el malecón, conocer los caballitos de totora, disfrutar la pesca artesanal, probar gastronomía lambayecana y aprovechar los atardeceres frente al mar.",
  },
  {
    question: "¿Cuáles son los lugares turísticos de Pimentel más conocidos?",
    answer:
      "El Muelle de Pimentel, la Playa de Pimentel, el malecón y la tradición de los caballitos de totora son algunos de los principales atractivos del balneario.",
  },
  {
    question: "¿Qué museos se pueden visitar desde Pimentel?",
    answer:
      "Entre las visitas culturales más destacadas de Lambayeque están el Museo Tumbas Reales de Sipán, el Museo de Sitio Túcume, el Museo Arqueológico Nacional Brüning y el Museo Nacional Sicán.",
  },
  {
    question: "¿Hay una casa museo en Pimentel?",
    answer:
      "Sí. La Casa Museo José Abelardo Quiñones Gonzales está en Pimentel y conserva ambientes, fotografías y objetos vinculados a la vida del héroe de la aviación peruana.",
  },
  {
    question: "¿Qué hacer en Pimentel de noche?",
    answer:
      "Después del atardecer puedes caminar por el malecón, contemplar el muelle iluminado y completar la noche con una cena de cocina marina o lambayecana frente al ambiente costero.",
  },
  {
    question: "¿Dónde hospedarse para conocer Pimentel?",
    answer:
      "Casa Huéspedes Pimentel funciona como una base cómoda para recorrer el balneario y organizar visitas por Lambayeque. Puedes consultar las habitaciones disponibles para tus fechas desde la web.",
  },
];

function getYouTubeId(videoUrl) {
  if (!videoUrl) return "";
  try {
    const parsed = new URL(videoUrl);
    const host = parsed.hostname.replace("www.", "").replace("m.", "");
    if (host === "youtu.be") return parsed.pathname.split("/").filter(Boolean)[0] || "";
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (parsed.pathname === "/watch") return parsed.searchParams.get("v") || "";
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(parts[0])) return parts[1] || "";
    }
  } catch {
    return "";
  }
  return "";
}

function ArrowIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function ChevronIcon({ direction = "down", className = "h-4 w-4" }) {
  const path = direction === "left" ? "m15 18-6-6 6-6" : direction === "right" ? "m9 18 6-6-6-6" : "m6 9 6 6 6-6";
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

function PlayIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 5v14l11-7-11-7Z" />
    </svg>
  );
}

function SafeImage({ src, fallback, alt, className = "", loading = "lazy" }) {
  const [current, setCurrent] = useState(src);
  return (
    <img
      src={current}
      alt={alt}
      loading={loading}
      onError={() => {
        if (fallback && current !== fallback) setCurrent(fallback);
      }}
      className={className}
    />
  );
}

function TiltSurface({ children, className = "" }) {
  const ref = useRef(null);

  const handlePointerMove = (event) => {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    node.style.transform = `perspective(1000px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg) translateY(-6px)`;
    node.style.setProperty("--shine-x", `${(x + 0.5) * 100}%`);
    node.style.setProperty("--shine-y", `${(y + 0.5) * 100}%`);
  };

  const reset = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
      className={`tourism-tilt ${className}`}
    >
      {children}
    </div>
  );
}

function TourismVideo({ src, title }) {
  const youtubeId = getYouTubeId(src);
  if (!youtubeId) return null;
  return (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&playsinline=1&modestbranding=1`}
      title={title}
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
      className="absolute inset-0 h-full w-full border-0"
    />
  );
}

function PlaceCard({ place, index }) {
  return (
    <TiltSurface className={place.feature ? "lg:col-span-2" : ""}>
      <article
        data-reveal
        style={{ "--delay": `${Math.min(index * 70, 280)}ms` }}
        className={`reveal group relative overflow-hidden rounded-[30px] border border-white/[0.35] bg-[#2b1d12] shadow-[0_24px_60px_rgba(43,29,18,0.15)] ${
          place.feature ? "min-h-[470px]" : "min-h-[390px]"
        }`}
      >
        <SafeImage
          src={place.image}
          fallback={HERO_FALLBACK}
          alt={place.title}
          className="absolute inset-0 h-full w-full object-cover transition duration-[1100ms] ease-out group-hover:scale-[1.08]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#160d08]/95 via-[#160d08]/20 to-transparent" />
        <div className="tourism-shine absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100" />
        <div className="absolute inset-x-0 bottom-0 z-10 p-6 sm:p-8">
          <span className="inline-flex rounded-full border border-white/[0.35] bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white backdrop-blur-md">
            {place.category}
          </span>
          <h3 className={`mt-4 font-serif leading-[1.02] text-white ${place.feature ? "text-4xl sm:text-5xl" : "text-3xl"}`}>
            {place.title}
          </h3>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
            {place.description}
          </p>
          <a
            href={place.source}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#f0c08d] transition group-hover:gap-4"
          >
            Ver fotografía real <ArrowIcon />
          </a>
        </div>
        <div className="absolute right-6 top-6 z-10 grid h-12 w-12 place-items-center rounded-full border border-white/[0.35] bg-black/20 text-white backdrop-blur-md transition duration-500 group-hover:rotate-[-10deg] group-hover:bg-[#a87545]">
          <ArrowIcon />
        </div>
      </article>
    </TiltSurface>
  );
}

function MuseumCard({ museum, index }) {
  return (
    <TiltSurface className="shrink-0 snap-start">
      <article
        data-reveal
        style={{ "--delay": `${index * 90}ms` }}
        className="reveal museum-card group relative w-[82vw] max-w-[355px] overflow-hidden rounded-[30px] border border-[#d8a369]/[0.35] bg-[#24150e] shadow-[0_30px_80px_rgba(0,0,0,0.38)] sm:w-[340px]"
      >
        <div className="relative h-[330px] overflow-hidden bg-[#1a0f0a]">
          <SafeImage
            src={museum.image}
            fallback={museum.brochure || HERO_FALLBACK}
            alt={`Fotografía real de ${museum.title}`}
            className="h-full w-full object-cover transition duration-[1000ms] ease-out group-hover:scale-[1.10]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#24150e] via-[#24150e]/15 to-transparent" />
          <div className="museum-aura absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#d9a86e]/20 blur-3xl transition duration-700 group-hover:scale-150 group-hover:bg-[#f1c180]/30" />
          <span className="absolute left-5 top-5 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.17em] text-white backdrop-blur-md">
            {museum.location}
          </span>
        </div>

        <div className="relative p-6 text-white">
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#d9a86e]">
            Historia viva del norte
          </span>
          <h3 className="mt-3 min-h-[74px] font-serif text-2xl leading-tight">
            {museum.title}
          </h3>
          <p className="mt-4 min-h-[105px] text-sm leading-7 text-white/[0.66]">
            {museum.description}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <a
              href={museum.officialUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#a87545] px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#c58b55]"
            >
              Información oficial <ArrowIcon />
            </a>
            {museum.brochure && (
              <a
                href={museum.brochure}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-white/20 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/[0.85] transition hover:bg-white hover:text-[#2b1d12]"
              >
                Folleto
              </a>
            )}
          </div>
          <a
            href={museum.source}
            target="_blank"
            rel="noreferrer"
            className="mt-5 block text-[10px] leading-5 text-white/[0.45] underline decoration-white/20 underline-offset-4 hover:text-white/75"
          >
            Foto: {museum.credit}
          </a>
        </div>
      </article>
    </TiltSurface>
  );
}

function DishCard({ dish, index }) {
  return (
    <TiltSurface>
      <article
        data-reveal
        style={{ "--delay": `${Math.min(index * 80, 320)}ms` }}
        className="reveal food-card group relative min-h-[420px] overflow-hidden rounded-[28px] border border-[#eadbc7] bg-[#2b1d12] shadow-[0_20px_55px_rgba(43,29,18,0.13)]"
      >
        <SafeImage
          src={dish.image}
          fallback={dish.fallback || HERO_FALLBACK}
          alt={`Fotografía real de ${dish.title}`}
          className="absolute inset-0 h-full w-full object-cover transition duration-[1050ms] ease-out group-hover:scale-[1.10]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1d100a]/95 via-[#1d100a]/10 to-transparent" />
        <div className="food-glint absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100" />
        <div className="absolute inset-x-0 bottom-0 z-10 p-6">
          <span className="inline-flex rounded-full border border-white/30 bg-black/25 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-md">
            {dish.category}
          </span>
          <h3 className="mt-4 font-serif text-3xl leading-none text-white">
            {dish.title}
          </h3>
          <p className="mt-3 text-sm leading-6 text-white/[0.78]">
            {dish.description}
          </p>
          <a
            href={dish.source}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-[#f0c08d]"
          >
            Ver fuente <ArrowIcon className="h-3.5 w-3.5" />
          </a>
        </div>
      </article>
    </TiltSurface>
  );
}

function SocialDock() {
  const whatsapp = encodeURIComponent(
    "Hola, quisiera información sobre Casa Huéspedes Pimentel.",
  );
  const links = [
    { label: "Inicio", href: "/", text: "⌂" },
    { label: "WhatsApp", href: `https://wa.me/51901551287?text=${whatsapp}`, text: "WA" },
    { label: "Instagram", href: "https://www.instagram.com/casahuespedes.pimentel/", text: "IG" },
    { label: "Facebook", href: "https://www.facebook.com/casadehuespedespimentel/?locale=es_LA", text: "f" },
  ];
  return (
    <aside
      aria-label="Contacto rápido"
      className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#eadfce] bg-[#fbf7ef]/95 px-3 py-2 shadow-[0_15px_40px_rgba(43,29,18,0.20)] backdrop-blur-md lg:bottom-auto lg:left-5 lg:top-1/2 lg:translate-x-0 lg:-translate-y-1/2 lg:flex-col lg:px-2 lg:py-4"
    >
      <span className="hidden text-[9px] font-black uppercase tracking-[0.22em] text-[#2b1d12] lg:block lg:[writing-mode:vertical-rl] lg:rotate-180">
        Contáctanos
      </span>
      {links.map((item) => {
        const external = item.href.startsWith("http");
        const classes = `grid h-10 w-10 place-items-center rounded-full text-[11px] font-black transition hover:-translate-y-0.5 ${
          item.label === "WhatsApp" ? "bg-[#25D366] text-white" : "bg-[#2b1d12] text-white hover:bg-[#a87545]"
        }`;
        if (!external) {
          return (
            <Link key={item.label} to={item.href} aria-label={item.label} className={classes}>
              {item.text}
            </Link>
          );
        }
        return (
          <a key={item.label} href={item.href} target="_blank" rel="noreferrer" aria-label={item.label} className={classes}>
            {item.text}
          </a>
        );
      })}
    </aside>
  );
}

function useRevealAnimations() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll(".tourism-page [data-reveal]"));
    if (!elements.length) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
}

function useHeroParallax(heroRef) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const hero = heroRef.current;
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const shift = Math.max(-55, Math.min(90, -rect.top * 0.11));
      hero.style.setProperty("--hero-shift", `${shift}px`);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [heroRef]);
}

function VideoSection({ video, reverse }) {
  return (
    <section className="relative overflow-hidden bg-[#25160f] py-16 text-white sm:py-20">
      <div className="absolute left-1/2 top-0 h-px w-[80%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#d9a86e]/[0.45] to-transparent" />
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
          <div data-reveal className="reveal relative">
            <div className="absolute -inset-4 rounded-[34px] border border-white/10" />
            <div className="relative aspect-video overflow-hidden rounded-[28px] bg-black shadow-[0_35px_90px_rgba(0,0,0,0.42)]">
              <TourismVideo src={video.src} title={video.title} />
            </div>
          </div>
          <div data-reveal className="reveal" style={{ "--delay": "120ms" }}>
            <span className="text-xs font-black uppercase tracking-[0.24em] text-[#d9a86e]">{video.eyebrow}</span>
            <h2 className="mt-5 max-w-xl font-serif text-4xl leading-[1.03] sm:text-5xl lg:text-6xl">{video.title}</h2>
            <p className="mt-6 max-w-xl text-base leading-8 text-white/70 sm:text-lg">{video.description}</p>
            <Link
              to={video.buttonLink}
              className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#a87545] px-7 py-4 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-1 hover:bg-[#c58b55]"
            >
              {video.buttonText} <ArrowIcon />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Tourism() {
  const heroRef = useRef(null);
  const museumTrackRef = useRef(null);

  useRevealAnimations();
  useHeroParallax(heroRef);

  const scrollMuseums = (direction) => {
    museumTrackRef.current?.scrollBy({ left: direction * 370, behavior: "smooth" });
  };

  return (
    <>
      <style>{`
        .tourism-page { --ink:#2b1d12; --copper:#a87545; --sand:#fbf7ef; }
        .tourism-page .reveal { opacity: 0; transform: translateY(42px) scale(.985); transition: opacity .85s cubic-bezier(.2,.65,.25,1), transform .85s cubic-bezier(.2,.65,.25,1); transition-delay: var(--delay,0ms); }
        .tourism-page .reveal.is-visible { opacity:1; transform:translateY(0) scale(1); }
        .tourism-page .hero-media { transform: translate3d(0,var(--hero-shift,0px),0) scale(1.08); transition: transform .08s linear; }
        .tourism-page .tourism-tilt { transform-style: preserve-3d; transition: transform .32s cubic-bezier(.2,.8,.2,1); }
        .tourism-page .tourism-shine { background: radial-gradient(circle at var(--shine-x,50%) var(--shine-y,50%), rgba(255,235,199,.28), transparent 38%); mix-blend-mode:screen; }
        .tourism-page .food-glint { background: linear-gradient(110deg, transparent 20%, rgba(255,255,255,.22) 45%, transparent 68%); transform: translateX(-100%); }
        .tourism-page .food-card:hover .food-glint { animation: tourism-glint 1.1s ease forwards; }
        .tourism-page .museum-card::after { content:""; position:absolute; inset:0; pointer-events:none; border-radius:inherit; border:1px solid transparent; background:linear-gradient(135deg, rgba(255,220,165,.58), transparent 35%, transparent 68%, rgba(168,117,69,.5)) border-box; -webkit-mask:linear-gradient(#fff 0 0) padding-box,linear-gradient(#fff 0 0); -webkit-mask-composite:xor; mask-composite:exclude; opacity:.16; transition:opacity .45s ease; }
        .tourism-page .museum-card:hover::after { opacity:1; }
        .tourism-page .museum-track { scrollbar-width:none; }
        .tourism-page .museum-track::-webkit-scrollbar { display:none; }
        .tourism-page .ambient-orbit { animation: tourism-float 7s ease-in-out infinite; }
        .tourism-page .scroll-line::after { content:""; position:absolute; left:50%; top:0; width:1px; height:34px; background:linear-gradient(to bottom, rgba(255,255,255,.75), transparent); animation:tourism-scroll 1.8s ease-in-out infinite; }
        .tourism-page details[open] .faq-chevron { transform:rotate(180deg); }
        .tourism-page .faq-chevron { transition:transform .3s ease; }
        @keyframes tourism-glint { to { transform:translateX(105%); } }
        @keyframes tourism-float { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-10px) rotate(1deg)} }
        @keyframes tourism-scroll { 0%{transform:translate(-50%,0);opacity:0} 30%{opacity:1} 100%{transform:translate(-50%,30px);opacity:0} }
        @media (prefers-reduced-motion: reduce) {
          .tourism-page *, .tourism-page *::before, .tourism-page *::after { animation-duration:.01ms!important; animation-iteration-count:1!important; scroll-behavior:auto!important; transition-duration:.01ms!important; }
          .tourism-page .reveal { opacity:1!important; transform:none!important; }
          .tourism-page .hero-media { transform:scale(1.03)!important; }
        }
      `}</style>

      <Navbar />

      <main id="inicio-turismo" className="tourism-page overflow-hidden bg-[#fbf7ef] text-[#2b1d12]">
        <section ref={heroRef} className="relative min-h-[720px] overflow-hidden lg:min-h-[820px]">
          <div className="hero-media absolute -inset-[8%]">
            <video
              src={HERO_VIDEO}
              poster={HERO_FALLBACK}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#120a06]/95 via-[#1c0f08]/[0.68] to-[#1c0f08]/15" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#150c07]/[0.82] via-transparent to-black/15" />
          <div className="ambient-orbit absolute right-[12%] top-[18%] h-64 w-64 rounded-full bg-[#d9a86e]/15 blur-[100px]" />

          <div className="relative z-10 mx-auto flex min-h-[720px] max-w-7xl items-center px-6 py-28 md:px-10 lg:min-h-[820px] lg:px-12">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md">
                <span className="h-2.5 w-2.5 rounded-full bg-[#e8b97f] shadow-[0_0_22px_rgba(232,185,127,.8)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white">Descubre el norte del Perú</span>
              </div>
              <p className="mt-7 text-xs font-black uppercase tracking-[0.3em] text-[#e8b97f]">Casa Huéspedes Pimentel</p>
              <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[.98] tracking-[-0.04em] text-white sm:text-7xl lg:text-[92px]">
                Pimentel, Perú: qué hacer y qué conocer
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-8 text-white/[0.82] sm:text-lg">
                Una guía visual para descubrir los lugares turísticos de Pimentel, su playa, el muelle, los caballitos de totora, la gastronomía y los museos de Lambayeque.
              </p>
              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <a href="#lugares-turisticos" className="inline-flex items-center justify-center gap-3 rounded-full bg-[#a87545] px-7 py-4 text-xs font-black uppercase tracking-[0.15em] text-white transition hover:-translate-y-1 hover:bg-[#c58b55]">
                  Explorar Pimentel <ArrowIcon />
                </a>
                <a href="#videos-pimentel" className="inline-flex items-center justify-center gap-3 rounded-full border border-white/30 bg-white/10 px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-white backdrop-blur-md transition hover:bg-white hover:text-[#2b1d12]">
                  <span className="grid h-8 w-8 place-items-center rounded-full border border-current"><PlayIcon className="h-3.5 w-3.5" /></span>
                  Ver Pimentel en movimiento
                </a>
              </div>
            </div>
          </div>

          <div className="scroll-line absolute bottom-8 left-1/2 z-20 h-12 -translate-x-1/2 pl-px text-white/70">
            <span className="absolute left-1/2 top-[-22px] -translate-x-1/2 whitespace-nowrap text-[9px] font-black uppercase tracking-[0.22em]">Scroll</span>
          </div>
        </section>

        <section className="relative bg-[#fbf7ef] py-20 sm:py-24">
          <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full border border-[#a87545]/10" />
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="grid items-end gap-10 lg:grid-cols-[1fr_.9fr] lg:gap-20">
              <div data-reveal className="reveal">
                <span className="text-xs font-black uppercase tracking-[0.24em] text-[#a87545]">Pimentel en movimiento</span>
                <h2 className="mt-5 max-w-3xl font-serif text-4xl leading-[1.02] sm:text-6xl lg:text-7xl">Descubre este destino antes de visitarlo</h2>
              </div>
              <div data-reveal className="reveal" style={{ "--delay": "120ms" }}>
                <p className="text-base leading-8 text-[#6c5b50] sm:text-lg">
                  Recorre el mar, la historia, la gastronomía y las tradiciones de Pimentel a través de una guía visual pensada para inspirar tu próxima visita al balneario.
                </p>
                <div className="mt-6 flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#7a5636]">
                  <a href="#lugares-turisticos" className="rounded-full border border-[#dfcfbb] px-4 py-2 transition hover:border-[#a87545] hover:bg-[#a87545] hover:text-white">Lugares</a>
                  <a href="#museos" className="rounded-full border border-[#dfcfbb] px-4 py-2 transition hover:border-[#a87545] hover:bg-[#a87545] hover:text-white">Museos</a>
                  <a href="#gastronomia" className="rounded-full border border-[#dfcfbb] px-4 py-2 transition hover:border-[#a87545] hover:bg-[#a87545] hover:text-white">Gastronomía</a>
                  <a href="#pimentel-de-noche" className="rounded-full border border-[#dfcfbb] px-4 py-2 transition hover:border-[#a87545] hover:bg-[#a87545] hover:text-white">Pimentel de noche</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div id="videos-pimentel" className="scroll-mt-24">
          <VideoSection video={videos[0]} />
          <VideoSection video={videos[1]} reverse />
        </div>

        <section id="lugares-turisticos" className="scroll-mt-24 bg-[#fbf7ef] py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="mb-12 grid items-end gap-8 lg:grid-cols-[.9fr_1.1fr] lg:gap-20">
              <div data-reveal className="reveal">
                <span className="text-xs font-black uppercase tracking-[0.24em] text-[#a87545]">Mar, tradición e historia</span>
                <h2 className="mt-5 font-serif text-4xl leading-[1.03] sm:text-6xl">Lugares turísticos de Pimentel</h2>
              </div>
              <p data-reveal className="reveal max-w-2xl text-base leading-8 text-[#6c5b50] sm:text-lg" style={{ "--delay": "110ms" }}>
                Desde el muelle y la playa hasta la pesca artesanal y la Casa Museo José Abelardo Quiñones, esta selección reúne lugares reales para construir una visita con mar, cultura e identidad local.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {places.map((place, index) => (
                <PlaceCard key={place.id} place={place} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section id="pimentel-de-noche" className="relative scroll-mt-24 overflow-hidden bg-[#170d08] py-20 text-white sm:py-24">
          <SafeImage
            src={commonsImage("Sunset in Pimentel, Peru.jpg", 2000)}
            fallback={HERO_FALLBACK}
            alt="Atardecer real en Pimentel, Perú"
            className="absolute inset-0 h-full w-full object-cover opacity-[0.38]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#140b07]/[0.98] via-[#1d100a]/[0.88] to-[#1d100a]/[0.55]" />
          <div className="ambient-orbit absolute -right-16 top-10 h-72 w-72 rounded-full bg-[#d9a86e]/15 blur-[100px]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-5 md:px-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-20">
            <div data-reveal className="reveal">
              <span className="text-xs font-black uppercase tracking-[0.24em] text-[#d9a86e]">Cuando cae el sol</span>
              <h2 className="mt-5 font-serif text-4xl leading-[1.02] sm:text-6xl">Pimentel de noche: el encanto continúa frente al mar</h2>
              <p className="mt-6 max-w-xl text-base leading-8 text-white/[0.72] sm:text-lg">
                El atardecer da paso a una experiencia más tranquila: paseo por el malecón, vistas del muelle iluminado y una cena para cerrar el día con sabor norteño.
              </p>
              <a href="#gastronomia" className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#a87545] px-7 py-4 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-1 hover:bg-[#c58b55]">
                Descubrir sabores <ArrowIcon />
              </a>
            </div>

            <div data-reveal className="reveal grid gap-4 sm:grid-cols-3" style={{ "--delay": "130ms" }}>
              {[
                ["Atardecer", "Empieza la noche viendo cómo el cielo cambia sobre el Pacífico."],
                ["Malecón", "Camina frente al mar y contempla el ambiente costero después del ocaso."],
                ["Cena norteña", "Termina el día con pescados, mariscos y platos tradicionales de Lambayeque."],
              ].map(([title, text], index) => (
                <article key={title} className="group rounded-[24px] border border-white/15 bg-black/25 p-5 backdrop-blur-md transition duration-500 hover:-translate-y-2 hover:border-[#d9a86e]/[0.55] hover:bg-black/40">
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-[#d9a86e]/40 bg-[#d9a86e]/10 text-xs font-black text-[#f0c08d]">0{index + 1}</span>
                  <h3 className="mt-5 font-serif text-2xl">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/[0.62]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="museos" className="relative scroll-mt-24 overflow-hidden bg-[#1f120c] py-20 text-white sm:py-24">
          <div className="absolute -left-44 top-24 h-96 w-96 rounded-full bg-[#a87545]/15 blur-[130px]" />
          <div className="absolute -right-40 bottom-0 h-[430px] w-[430px] rounded-full bg-[#d9a86e]/10 blur-[140px]" />
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="mb-10 grid items-end gap-8 lg:grid-cols-[1fr_.8fr]">
              <div data-reveal className="reveal">
                <span className="text-xs font-black uppercase tracking-[0.24em] text-[#d9a86e]">Historia viva del norte</span>
                <h2 className="mt-5 max-w-3xl font-serif text-4xl leading-[1.02] sm:text-6xl lg:text-7xl">Museos de Lambayeque: historia viva del norte</h2>
              </div>
              <div data-reveal className="reveal lg:text-right" style={{ "--delay": "120ms" }}>
                <p className="text-base leading-8 text-white/[0.65] sm:text-lg">Completa tu visita con algunos de los museos más representativos de Lambayeque y descubre el legado Mochica, Lambayeque y Sicán.</p>
                <div className="mt-6 flex gap-3 lg:justify-end">
                  <button type="button" onClick={() => scrollMuseums(-1)} aria-label="Museo anterior" className="grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-white/5 text-white transition hover:bg-white hover:text-[#2b1d12]"><ChevronIcon direction="left" /></button>
                  <button type="button" onClick={() => scrollMuseums(1)} aria-label="Museo siguiente" className="grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-white/5 text-white transition hover:bg-white hover:text-[#2b1d12]"><ChevronIcon direction="right" /></button>
                </div>
              </div>
            </div>

            {museumMap && (
              <div data-reveal className="reveal mb-10 overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] shadow-[0_28px_80px_rgba(0,0,0,.25)]" style={{ "--delay": "150ms" }}>
                <div className="grid items-center lg:grid-cols-[.7fr_1.3fr]">
                  <div className="bg-[#eadfce] p-5 sm:p-7">
                    <a href={museumMap} target="_blank" rel="noreferrer" aria-label="Ampliar mapa de museos de Lambayeque">
                      <img src={museumMap} alt="Mapa de la ruta de museos de Lambayeque" loading="lazy" className="mx-auto max-h-[360px] w-full object-contain transition duration-700 hover:scale-[1.025]" />
                    </a>
                  </div>
                  <div className="p-7 sm:p-10 lg:p-12">
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#d9a86e]">Planea tu recorrido</span>
                    <h3 className="mt-4 font-serif text-3xl sm:text-4xl">Ruta de museos de Lambayeque</h3>
                    <p className="mt-5 max-w-xl text-sm leading-7 text-white/60 sm:text-base">Ubica los principales museos de la región y combina cultura, arqueología y costa en una salida desde Pimentel.</p>
                    <a href={museumMap} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/5 px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white transition hover:bg-white hover:text-[#2b1d12]">Ampliar mapa <ArrowIcon /></a>
                  </div>
                </div>
              </div>
            )}

            <div ref={museumTrackRef} className="museum-track flex snap-x snap-mandatory gap-6 overflow-x-auto pb-5 pt-3">
              {museums.map((museum, index) => (
                <MuseumCard key={museum.id} museum={museum} index={index} />
              ))}
            </div>

            <p className="mt-8 max-w-4xl text-sm leading-7 text-white/[0.45]">
              Antes de visitar un museo, consulta horarios, tarifas y condiciones actuales en su enlace oficial del Ministerio de Cultura.
            </p>
          </div>
        </section>

        <section id="gastronomia" className="scroll-mt-24 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="mb-12 grid items-end gap-8 lg:grid-cols-[.9fr_1.1fr] lg:gap-20">
              <div data-reveal className="reveal">
                <span className="text-xs font-black uppercase tracking-[0.24em] text-[#a87545]">Sabores del norte</span>
                <h2 className="mt-5 font-serif text-4xl leading-[1.02] sm:text-6xl">Gastronomía de Pimentel y Lambayeque</h2>
              </div>
              <div data-reveal className="reveal" style={{ "--delay": "120ms" }}>
                <p className="text-base leading-8 text-[#6c5b50] sm:text-lg">La costa y la cocina lambayecana se encuentran en platos de mar, recetas tradicionales y sabores que forman parte de la identidad del norte peruano.</p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {dishes.map((dish, index) => (
                <DishCard key={dish.id} dish={dish} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section id="preguntas-pimentel" className="bg-[#f5ecdf] py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 md:px-8 lg:grid-cols-[.75fr_1.25fr] lg:gap-20">
            <div data-reveal className="reveal">
              <span className="text-xs font-black uppercase tracking-[0.24em] text-[#a87545]">Planifica tu visita</span>
              <h2 className="mt-5 font-serif text-4xl leading-[1.04] sm:text-5xl">Todo lo que necesitas saber para conocer Pimentel</h2>
              <p className="mt-6 text-base leading-8 text-[#6c5b50]">Respuestas rápidas para organizar tu visita, elegir qué conocer y aprovechar mejor tu estadía en Pimentel y Lambayeque.</p>
            </div>
            <div data-reveal className="reveal space-y-3" style={{ "--delay": "120ms" }}>
              {faqItems.map((item) => (
                <details key={item.question} className="group rounded-[22px] border border-[#dfcfbb] bg-white px-6 py-5 shadow-[0_12px_30px_rgba(43,29,18,.05)]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-serif text-xl text-[#2b1d12] marker:hidden sm:text-2xl">
                    {item.question}
                    <span className="faq-chevron grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f3e7d7] text-[#7b4a1f]"><ChevronIcon /></span>
                  </summary>
                  <p className="mt-4 max-w-3xl pr-10 text-sm leading-7 text-[#6c5b50] sm:text-base">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#2b1d12] text-white">
          <SafeImage src={`${SITE_URL}/img/galeria/galeria-1.jpg`} fallback={HERO_FALLBACK} alt="Casa Huéspedes Pimentel" className="absolute inset-0 h-full w-full object-cover opacity-[0.35]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1b0f09]/[0.96] via-[#1b0f09]/[0.86] to-[#1b0f09]/60" />
          <div className="relative mx-auto max-w-7xl px-5 py-24 md:px-8 sm:py-28">
            <div data-reveal className="reveal max-w-3xl">
              <span className="text-xs font-black uppercase tracking-[0.24em] text-[#d9a86e]">Tu base para explorar</span>
              <h2 className="mt-5 font-serif text-4xl leading-[1.02] sm:text-6xl">Vive Pimentel desde Casa Huéspedes</h2>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/[0.72] sm:text-lg">Después de conocer el muelle, la playa, los museos y los sabores del norte, vuelve a un espacio cómodo y cerca del mar.</p>
              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <Link to="/habitaciones" className="inline-flex items-center justify-center gap-3 rounded-full bg-[#a87545] px-7 py-4 text-xs font-black uppercase tracking-[0.15em] text-white transition hover:-translate-y-1 hover:bg-[#c58b55]">Ver habitaciones <ArrowIcon /></Link>
                <a href="/#disponibilidad" className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/5 px-7 py-4 text-xs font-black uppercase tracking-[0.15em] text-white backdrop-blur-sm transition hover:bg-white hover:text-[#2b1d12]">Consultar disponibilidad</a>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#160d08] py-8 text-white/50">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <details className="text-xs leading-6">
              <summary className="cursor-pointer font-bold uppercase tracking-[0.16em] text-white/70">Créditos de fotografías reales utilizadas</summary>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {[...places, ...museums, ...dishes].map((item) => (
                  <a key={`${item.id}-credit`} href={item.source} target="_blank" rel="noreferrer" className="hover:text-white">
                    {item.title}: {item.credit}
                  </a>
                ))}
              </div>
            </details>
          </div>
        </section>
      </main>

      <SocialDock />
      <Footer />
    </>
  );
}