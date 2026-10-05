import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import SocialDock from "../../components/SocialDock";

const SITE_URL = "https://www.casahuespedespimentel.com";
const HERO_VIDEO = "/videos/pimentel.mp4";
const HERO_FALLBACK = commonsImage("Playa y muelle de Pimentel.jpg", 2200);

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
    <TiltSurface>
      <article
        data-reveal
        style={{ "--delay": `${Math.min(index * 70, 280)}ms` }}
        className="reveal group relative h-[360px] overflow-hidden rounded-[28px] border border-[#e8d7c2] bg-[#2b1d12] shadow-[0_20px_55px_rgba(43,29,18,0.14)] sm:h-[390px] lg:h-[430px]"
      >
        <SafeImage
          src={place.image}
          fallback={HERO_FALLBACK}
          alt={place.title}
          className="absolute inset-0 h-full w-full object-cover transition duration-[1000ms] ease-out group-hover:scale-[1.09]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#160d08]/[0.96] via-[#160d08]/20 to-transparent" />
        <div className="tourism-shine absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100" />

        <div className="absolute inset-x-0 bottom-0 z-10 p-6">
          <span className="inline-flex rounded-full border border-white/30 bg-black/25 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-md">
            {place.category}
          </span>
          <h3 className="mt-3 font-serif text-[28px] leading-[1.02] text-white sm:text-3xl">
            {place.title}
          </h3>
          <p className="mt-3 max-w-md text-sm leading-6 text-white/75">
            {place.description}
          </p>
        </div>

        <a
          href={place.source}
          target="_blank"
          rel="noreferrer"
          aria-label={`Ver fuente de la fotografía de ${place.title}`}
          className="absolute bottom-6 right-6 z-20 grid h-11 w-11 place-items-center rounded-full border border-white/40 bg-black/25 text-white backdrop-blur-md transition duration-500 group-hover:-rotate-12 group-hover:bg-[#a87545]"
        >
          <ArrowIcon />
        </a>
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
        className="reveal museum-card group relative w-[84vw] max-w-[360px] overflow-hidden rounded-[26px] border border-[#d8a369]/35 bg-[#28170f] shadow-[0_28px_80px_rgba(0,0,0,.44)] sm:w-[330px] xl:w-[340px]"
      >
        <div className="relative h-[300px] overflow-hidden bg-[#160d08]">
          <SafeImage
            src={museum.image}
            fallback={museum.brochure || HERO_FALLBACK}
            alt={`Fotografía real de ${museum.title}`}
            className="h-full w-full object-cover transition duration-[1000ms] ease-out group-hover:scale-[1.12]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#28170f] via-transparent to-black/10" />
          <div className="museum-aura absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#d9a86e]/10 blur-3xl transition duration-700 group-hover:scale-150 group-hover:bg-[#f0b96d]/25" />
          <span className="absolute left-5 top-5 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.17em] text-white backdrop-blur-md">
            {museum.location}
          </span>
        </div>

        <div className="relative p-5 text-white">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#d9a86e]">
            Patrimonio cultural
          </span>
          <h3 className="mt-3 min-h-[58px] font-serif text-[23px] leading-[1.08]">
            {museum.title}
          </h3>
          <p className="mt-3 min-h-[88px] text-[13px] leading-6 text-white/62">
            {museum.description}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href={museum.officialUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#a87545] px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.13em] text-white transition hover:bg-[#c58b55]"
            >
              Ver museo <ArrowIcon className="h-3.5 w-3.5" />
            </a>
            {museum.brochure && (
              <a
                href={museum.brochure}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-white/20 px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.13em] text-white/80 transition hover:bg-white hover:text-[#2b1d12]"
              >
                Folleto
              </a>
            )}
          </div>
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
        style={{ "--delay": `${Math.min(index * 70, 300)}ms` }}
        className="reveal food-card group relative h-[390px] overflow-hidden rounded-[26px] border border-[#eadbc7] bg-[#2b1d12] shadow-[0_20px_55px_rgba(43,29,18,.14)] lg:h-[420px]"
      >
        <SafeImage
          src={dish.image}
          fallback={dish.fallback || HERO_FALLBACK}
          alt={`Fotografía real de ${dish.title}`}
          className="absolute inset-0 h-full w-full object-cover transition duration-[1000ms] ease-out group-hover:scale-[1.12]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#180d08]/[0.97] via-[#180d08]/10 to-transparent" />
        <div className="food-glint absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100" />

        <div className="absolute inset-x-0 bottom-0 z-10 p-5">
          <span className="inline-flex rounded-full border border-white/30 bg-black/25 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.15em] text-white backdrop-blur-md">
            {dish.category}
          </span>
          <h3 className="mt-3 font-serif text-[24px] leading-none text-white">
            {dish.title}
          </h3>
          <p className="mt-2 text-[12px] leading-5 text-white/72">
            {dish.description}
          </p>
        </div>

        <a
          href={dish.source}
          target="_blank"
          rel="noreferrer"
          aria-label={`Ver fuente de la fotografía de ${dish.title}`}
          className="absolute bottom-5 right-5 z-20 grid h-9 w-9 place-items-center rounded-full border border-white/35 bg-black/25 text-white backdrop-blur-md transition group-hover:bg-[#a87545]"
        >
          <ArrowIcon className="h-3.5 w-3.5" />
        </a>
      </article>
    </TiltSurface>
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
      <div className="mx-auto max-w-[1500px] px-5 md:px-8">
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
        .tourism-page .food-card:hover .food-glint { animation: tourism-glint 1.1s ease forwards; }\n        .tourism-page .food-card:hover { box-shadow:0 28px 70px rgba(43,29,18,.20); }\n        .tourism-page .museum-card:hover { box-shadow:0 36px 95px rgba(0,0,0,.55),0 0 45px rgba(217,168,110,.08); }
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
        {/* HERO — misma composición del concepto visual */}
        <section ref={heroRef} className="relative min-h-[720px] overflow-hidden lg:min-h-[820px]">
          <div className="hero-media absolute -inset-[6%]">
            <SafeImage
              src={HERO_FALLBACK}
              fallback={places[0].image}
              alt="Atardecer real frente al mar en Pimentel, Perú"
              loading="eager"
              className="h-full w-full object-cover brightness-[0.92] saturate-[1.08]"
            />
          </div>

          <div className="absolute inset-0 bg-gradient-to-r from-[#120a06]/[0.82] via-[#1c0f08]/38 to-[#1c0f08]/05" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#150c07]/45 via-transparent to-black/10" />
          <div className="ambient-orbit absolute right-[12%] top-[18%] h-64 w-64 rounded-full bg-[#d9a86e]/15 blur-[100px]" />

          <div className="relative z-10 mx-auto flex min-h-[720px] max-w-[1540px] items-center px-6 py-28 md:px-10 lg:min-h-[820px] lg:px-14">
            <div className="max-w-[780px]">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-black/15 px-4 py-2 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-[#e8b97f] shadow-[0_0_20px_rgba(232,185,127,.9)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white">
                  Descubre el norte del Perú
                </span>
              </div>

              <h1 className="mt-7 max-w-[760px] font-serif text-5xl leading-[.96] tracking-[-0.04em] text-white sm:text-7xl lg:text-[88px]">
                Pimentel, Perú:
                <span className="block font-normal text-white/92">qué hacer y qué conocer</span>
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-8 text-white/90 sm:text-lg">
                Guía para descubrir Pimentel, Lambayeque: playa, muelle, caballitos de totora,
                gastronomía y experiencias frente al mar.
              </p>

              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <a
                  href="#lugares-turisticos"
                  className="inline-flex items-center justify-center gap-3 rounded-full bg-[#b77c42] px-7 py-4 text-[11px] font-black uppercase tracking-[0.15em] text-white shadow-[0_12px_30px_rgba(98,55,26,.25)] transition hover:-translate-y-1 hover:bg-[#c88d55]"
                >
                  Ver Pimentel <ArrowIcon />
                </a>
                <a
                  href={videos[0].src}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-3 rounded-full border border-white/35 bg-black/15 px-6 py-4 text-[11px] font-black uppercase tracking-[0.14em] text-white backdrop-blur-md transition hover:bg-white hover:text-[#2b1d12]"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-current">
                    <PlayIcon className="h-3.5 w-3.5" />
                  </span>
                  Mira el video
                </a>
              </div>
            </div>
          </div>

          <div className="absolute right-8 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-end gap-3 xl:flex">
            {["Mar", "Gastronomía", "Cultura", "Tradición", "Experiencias"].map((item) => (
              <span key={item} className="text-[9px] font-black uppercase tracking-[0.22em] text-white/70">
                {item}
              </span>
            ))}
          </div>

          <div className="absolute bottom-12 right-[8%] z-20 hidden items-center gap-4 lg:flex">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-[0_15px_35px_rgba(0,0,0,.35)]">
              <SafeImage src={places[0].image} fallback={HERO_FALLBACK} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="rounded-2xl border border-white/15 bg-black/35 px-5 py-3 text-white backdrop-blur-md">
              <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-[#e8b97f]">Movimiento de fondo</span>
              <span className="mt-1 block text-xs text-white/75">Parallax suave al hacer scroll</span>
            </div>
          </div>

          <div className="absolute left-7 top-1/2 z-20 hidden -translate-y-1/2 lg:block">
            <span className="[writing-mode:vertical-rl] rotate-180 text-[9px] font-black uppercase tracking-[0.25em] text-white/65">
              Scroll
            </span>
            <div className="scroll-line relative mx-auto mt-4 h-12 w-px" />
          </div>
        </section>

        {/* LUGARES — 3 x 2 como en el mockup */}
        <section id="lugares-turisticos" className="relative scroll-mt-24 bg-[#fbf7ef] py-20 sm:py-24">
          <div className="pointer-events-none absolute -left-28 top-14 h-72 w-72 rounded-full border border-[#a87545]/10" />
          <div className="pointer-events-none absolute -right-24 top-10 h-64 w-64 rounded-full border border-[#a87545]/10" />

          <div className="mx-auto max-w-[1380px] px-5 md:px-8">
            <div className="mb-12 grid items-end gap-9 lg:grid-cols-[1fr_.85fr] lg:gap-20">
              <div data-reveal className="reveal">
                <span className="text-xs font-black uppercase tracking-[0.24em] text-[#a87545]">
                  Pimentel en movimiento
                </span>
                <h2 className="mt-5 max-w-3xl font-serif text-4xl leading-[1.01] sm:text-6xl lg:text-7xl">
                  Descubre este destino antes de visitarlo
                </h2>
              </div>

              <div data-reveal className="reveal pb-2" style={{ "--delay": "120ms" }}>
                <p className="text-base leading-8 text-[#6c5b50] sm:text-lg">
                  Conoce el mar, el muelle, las tradiciones y los sabores de Pimentel mediante
                  una selección visual de lugares y experiencias reales.
                </p>
                <p className="mt-6 font-serif text-2xl italic leading-tight text-[#a87545]">
                  Donde el mar, la tradición y la hospitalidad se encuentran.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-12">
              {places.slice(0, 6).map((place, index) => {
                const spans = [
                  "lg:col-span-5",
                  "lg:col-span-3",
                  "lg:col-span-4",
                  "lg:col-span-3",
                  "lg:col-span-4",
                  "lg:col-span-5",
                ];
                return (
                  <div key={place.id} className={spans[index]}>
                    <PlaceCard place={place} index={index} />
                  </div>
                );
              })}
            </div>

            <div data-reveal className="reveal mt-9 flex flex-wrap items-center justify-between gap-5 rounded-[24px] border border-[#e3d3bf] bg-white px-6 py-5 shadow-[0_14px_35px_rgba(43,29,18,.05)]">
              <div>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#a87545]">También en Pimentel</span>
                <p className="mt-2 font-serif text-2xl">Casa Museo José Abelardo Quiñones y Playa Las Rocas</p>
              </div>
              <a href="#preguntas-pimentel" className="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#7b4a1f]">
                Más información <ArrowIcon />
              </a>
            </div>
          </div>
        </section>

        {/* MUSEOS — bloque oscuro y cinematográfico */}
        <section id="museos" className="relative scroll-mt-24 overflow-hidden bg-[#21130c] py-20 text-white sm:py-24">
          <SafeImage
            src={museums[0].image}
            fallback={HERO_FALLBACK}
            alt=""
            className="pointer-events-none absolute -left-24 top-24 h-[520px] w-[360px] rounded-[50%] object-cover opacity-[0.08] blur-[1px]"
          />
          <div className="absolute -left-40 top-20 h-[430px] w-[430px] rounded-full bg-[#a87545]/15 blur-[135px]" />
          <div className="absolute -right-40 bottom-0 h-[430px] w-[430px] rounded-full bg-[#d9a86e]/10 blur-[145px]" />

          <div className="relative mx-auto max-w-[1500px] px-5 md:px-8">
            <div className="mb-10 grid items-end gap-8 lg:grid-cols-[1fr_.8fr]">
              <div data-reveal className="reveal">
                <span className="text-xs font-black uppercase tracking-[0.24em] text-[#d9a86e]">
                  Historia viva del norte
                </span>
                <h2 className="mt-5 max-w-3xl font-serif text-4xl leading-[1.02] sm:text-6xl lg:text-7xl">
                  Museos de Lambayeque
                </h2>
                <p className="mt-5 max-w-3xl text-sm leading-7 text-white/60 sm:text-base">
                  Completa tu visita a Pimentel con una ruta por museos que conservan el legado
                  Mochica, Lambayeque y Sicán.
                </p>
              </div>

              <div data-reveal className="reveal flex flex-wrap gap-3 lg:justify-end" style={{ "--delay": "120ms" }}>
                {museumMap && (
                  <a
                    href={museumMap}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-3 rounded-full bg-[#a87545] px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-1 hover:bg-[#c58b55]"
                  >
                    Ver ruta de museos <ArrowIcon />
                  </a>
                )}
                <button type="button" onClick={() => scrollMuseums(-1)} aria-label="Museo anterior" className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/5 transition hover:bg-white hover:text-[#2b1d12]">
                  <ChevronIcon direction="left" />
                </button>
                <button type="button" onClick={() => scrollMuseums(1)} aria-label="Museo siguiente" className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/5 transition hover:bg-white hover:text-[#2b1d12]">
                  <ChevronIcon direction="right" />
                </button>
              </div>
            </div>

            <div ref={museumTrackRef} className="museum-track flex snap-x snap-mandatory gap-6 overflow-x-auto pb-7 pt-4 xl:justify-between">
              {museums.map((museum, index) => (
                <MuseumCard key={museum.id} museum={museum} index={index} />
              ))}
            </div>

            <div className="mt-4 flex justify-center gap-2">
              {museums.map((museum, index) => (
                <span key={museum.id} className={index === 0 ? "h-1 w-10 rounded-full bg-[#d9a86e]" : "h-1 w-6 rounded-full bg-white/20"} />
              ))}
            </div>
          </div>
        </section>

        {/* GASTRONOMÍA — fila de seis como en el concepto */}
        <section id="gastronomia" className="relative scroll-mt-24 bg-[#fbf7ef] py-20 sm:py-24">
          <div className="mx-auto max-w-[1450px] px-5 md:px-8">
            <div className="mb-10 grid items-end gap-8 lg:grid-cols-[.9fr_1.1fr] lg:gap-20">
              <div data-reveal className="reveal">
                <span className="text-xs font-black uppercase tracking-[0.24em] text-[#a87545]">
                  Sabores del norte
                </span>
                <h2 className="mt-5 font-serif text-4xl leading-[1.02] sm:text-6xl">
                  Gastronomía de Pimentel
                </h2>
              </div>
              <p data-reveal className="reveal max-w-2xl text-base leading-8 text-[#6c5b50] sm:text-lg" style={{ "--delay": "120ms" }}>
                Mar, tradición culinaria lambayecana e ingredientes del norte en seis platos
                que forman parte de la experiencia de viajar por esta región.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {dishes.map((dish, index) => (
                <DishCard key={dish.id} dish={dish} index={index} />
              ))}
            </div>
          </div>
        </section>

        {/* FAQ compacto para mantener el valor SEO sin romper el diseño */}
        <section id="preguntas-pimentel" className="bg-white py-12 sm:py-14">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:gap-20">
              <div data-reveal className="reveal">
                <span className="text-xs font-black uppercase tracking-[0.24em] text-[#a87545]">Antes de viajar</span>
                <h2 className="mt-5 font-serif text-4xl leading-[1.03] sm:text-5xl">Conoce Pimentel mejor</h2>
                <p className="mt-5 text-base leading-8 text-[#6c5b50]">
                  Información útil sobre turismo, cultura y experiencias para organizar tu visita.
                </p>
              </div>
              <div data-reveal className="reveal grid gap-3 sm:grid-cols-2" style={{ "--delay": "110ms" }}>
                {faqItems.map((item) => (
                  <details key={item.question} className="rounded-[18px] border border-[#e6d7c5] bg-[#fbf7ef] px-5 py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-lg marker:hidden">
                      {item.question}
                      <span className="faq-chevron text-[#a87545]"><ChevronIcon /></span>
                    </summary>
                    <p className="mt-3 text-sm leading-6 text-[#6c5b50]">{item.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA final — dormitorio + conversión */}
        <section className="relative overflow-hidden bg-[#2b1d12] text-white">
          <SafeImage
            src={SITE_URL + "/img/galeria/galeria-2.jpg"}
            fallback={HERO_FALLBACK}
            alt="Casa Huéspedes Pimentel"
            className="absolute inset-0 h-full w-full object-cover object-center opacity-[0.62]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1b0f09]/[0.95] via-[#1b0f09]/[0.68] to-[#1b0f09]/35" />

          <div className="relative mx-auto grid max-w-[1450px] items-center gap-12 px-5 py-24 md:px-8 lg:grid-cols-[1.1fr_.7fr] lg:py-28">
            <div data-reveal className="reveal max-w-3xl">
              <span className="text-xs font-black uppercase tracking-[0.24em] text-[#d9a86e]">
                Vive Pimentel desde
              </span>
              <h2 className="mt-5 font-serif text-5xl leading-[.98] sm:text-6xl">
                Casa Huéspedes
              </h2>
              <p className="mt-6 max-w-xl text-base leading-8 text-white/72">
                Descansa en un ambiente acogedor y disfruta de una ubicación ideal para vivir
                todo lo que Pimentel tiene para ofrecer.
              </p>
              <div className="mt-8 flex flex-wrap gap-5 text-[10px] font-black uppercase tracking-[0.13em] text-white/75">
                <span>Habitaciones cómodas</span>
                <span>•</span>
                <span>Cerca del mar</span>
                <span>•</span>
                <span>Atención personalizada</span>
              </div>
            </div>

            <div data-reveal className="reveal rounded-[30px] border border-white/35 bg-[#fbf7ef]/90 p-6 text-[#2b1d12] shadow-[0_32px_85px_rgba(0,0,0,.34)] backdrop-blur-xl sm:p-8" style={{ "--delay": "140ms" }}>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a87545]">Tu experiencia comienza aquí</span>
              <h3 className="mt-3 font-serif text-3xl">Hospédate en Pimentel</h3>
              <p className="mt-4 text-sm leading-7 text-[#6c5b50]">
                Revisa las categorías disponibles y elige tus fechas para comenzar tu estadía.
              </p>
              <div className="mt-7 grid gap-3">
                <Link to="/habitaciones" className="inline-flex items-center justify-center gap-3 rounded-full bg-[#a87545] px-6 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-1 hover:bg-[#c58b55]">
                  Ver habitaciones <ArrowIcon />
                </Link>
                <a href="/#disponibilidad" className="inline-flex items-center justify-center rounded-full border border-[#d7c5ae] px-6 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-[#2b1d12] transition hover:border-[#a87545] hover:text-[#a87545]">
                  Consultar disponibilidad
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#160d08] py-7 text-white/45">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <details className="text-[11px] leading-6">
              <summary className="cursor-pointer font-black uppercase tracking-[0.16em] text-white/65">
                Créditos de las fotografías reales utilizadas
              </summary>
              <div className="mt-5 grid gap-2 md:grid-cols-2">
                {[...places, ...museums, ...dishes].map((item) => (
                  <a key={item.id + "-credit"} href={item.source} target="_blank" rel="noreferrer" className="hover:text-white">
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