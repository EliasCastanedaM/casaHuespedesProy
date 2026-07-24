import { useState } from "react";
import { Link } from "react-router-dom";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

/* =========================================================
   VIDEOS

   Puedes pegar:
   - Links de YouTube
   - Links youtu.be
   - Links directos de Cloudinary
========================================================= */

// Video principal detrás del título
const videoPortadaPimentel = "/videos/pimentel.mp4";
// Primer video
const videoExperienciaPimentel =
  "https://youtu.be/i9sVbpX1v7U?si=FhqjNPrlLj24cQli";

// Segundo video
const videoGastronomiaPimentel =
  "https://youtu.be/9TlXvLy2_rw?si=mz5nWpckSbfk_Nnb";

// Imagen de respaldo de la portada
const imagenPortadaPimentel =
  "https://f.rpp-noticias.io/2020/10/10/285928_1008166.jpg?width=1020&quality=80";

/* =========================================================
   INFORMACIÓN DE LOS VIDEOS
========================================================= */

const tourismVideos = [
  {
    id: "experiencia-pimentel",
    eyebrow: "Pimentel en movimiento",
    title: "Una experiencia frente al mar",
    description:
      "Recorre el muelle, contempla el océano y descubre la tradición que convierte a Pimentel en uno de los destinos más especiales de Lambayeque.",
    videoSrc: videoExperienciaPimentel,
    buttonText: "Conocer las habitaciones",
    buttonLink: "/habitaciones",
  },
  {
    id: "gastronomia-pimentel",
    eyebrow: "Sabores de Lambayeque",
    title: "Tradición que también se disfruta",
    description:
      "La gastronomía lambayecana reúne productos del mar, recetas tradicionales y sabores que forman parte de la identidad del norte peruano.",
    videoSrc: videoGastronomiaPimentel,
    buttonText: "Consultar disponibilidad",
    buttonLink: "/#disponibilidad",
  },
];

/* =========================================================
   FOTOGRAFÍAS
========================================================= */

const gallerySections = [
  {
    id: "lugares",
    eyebrow: "Mar, historia y tradición",
    title: "Descubre Pimentel",
    description:
      "Conoce los principales atractivos de este histórico balneario de Lambayeque, donde la tradición pesquera convive con el mar y sus inolvidables atardeceres.",
    images: [
      {
        id: "caballitos-totora",
        src: "https://blog.howlanders.com/wp-content/uploads/2021/06/los-caballitos-de-totora.jpg",
        alt: "Caballitos de totora navegando en el mar de Pimentel",
        title: "Caballitos de Totora",
        category: "Tradición",
        description:
          "Embarcaciones artesanales de origen ancestral que todavía son utilizadas por los pescadores de Pimentel.",
      },
      {
        id: "muelle-pimentel",
        src: "https://lh3.googleusercontent.com/gps-cs-s/AHRPTWkyVc-k19HTUQmi1tKH5DgssSPDkMj3Uy2pcSssbkcRFwPJSnwSDdDYhrWMB4W5Qm-kkATZtmCIsIAErtAM9RAAQQleDstOFad9u_zqKtEHM3PfsmUcH2NYup897_Tj8jNZ4ubS=s1360-w1360-h1020-rw",
        alt: "Muelle histórico de Pimentel frente al océano Pacífico",
        title: "Muelle de Pimentel",
        category: "Historia",
        description:
          "Uno de los principales símbolos del balneario y un lugar privilegiado para contemplar el mar.",
      },
      {
        id: "playa-pimentel",
        src: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSzOo8uI-sItyPAUxivjiJVYcNYWJu31J1iDkIZlej61w&s=10",
        alt: "Playa de Pimentel en Lambayeque",
        title: "Playa de Pimentel",
        category: "Naturaleza",
        description:
          "Una extensa playa de arena ideal para caminar, descansar y disfrutar del paisaje de la costa norte.",
      },
      {
        id: "malecon-pimentel",
        src: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSb_rzKUPzfSsgsZ3iIe7PcMa9JR7agD7NQuXisqS8F3A&s=10",
        alt: "Malecón turístico de Pimentel",
        title: "Malecón de Pimentel",
        category: "Paseo",
        description:
          "Un agradable recorrido frente al mar rodeado de restaurantes, viviendas tradicionales y espacios para descansar.",
      },
      {
        id: "playa-las-rocas",
        src: "https://consultasenlinea.mincetur.gob.pe/fichaInventario//foto.aspx?cod=555297",
        alt: "Playa Las Rocas en el distrito de Pimentel",
        title: "Playa Las Rocas",
        category: "Naturaleza",
        description:
          "Un rincón costero que combina formaciones rocosas, brisa marina y paisajes naturales.",
      },
      {
        id: "casa-museo-quinones",
        src: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR48OMr_02c4mPikmLa_dEHbsCEIkM5ovO0YEqed_PKdA&s=10",
        alt: "Casa Museo José Abelardo Quiñones",
        title: "Casa Museo José Quiñones",
        category: "Cultura",
        description:
          "Casa natal del héroe de la aviación peruana, convertida en un espacio histórico y cultural.",
      },
      {
        id: "pesca-artesanal",
        src: "https://live.staticflickr.com/4013/4247805265_133f139857_b.jpg",
        alt: "Pescadores artesanales trabajando en Pimentel",
        title: "Pesca artesanal",
        category: "Identidad",
        description:
          "Una actividad que mantiene viva la relación histórica entre los habitantes de Pimentel y el océano.",
      },
      {
        id: "atardecer-pimentel",
        src: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT4Nt3RNJ0wlw_XQjZFve-f6DAZ693pNxb-bMRjG3b9kg&s=10",
        alt: "Atardecer frente al mar en Pimentel",
        title: "Atardeceres frente al mar",
        category: "Experiencia",
        description:
          "El muelle, la playa y el horizonte crean uno de los paisajes más especiales de la costa lambayecana.",
      },
    ],
  },
  {
    id: "gastronomia",
    eyebrow: "Sabores del norte",
    title: "Gastronomía de Pimentel",
    description:
      "La cercanía al mar y la tradición culinaria lambayecana ofrecen platos preparados con pescados, mariscos e ingredientes característicos del norte peruano.",
    images: [
      {
        id: "ceviche",
        src: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSQDLTbO_12T6u6YO8nEju4ZTybiffKMKZJkW5pxN0aMg&s=10",
        alt: "Ceviche de pescado preparado en Pimentel",
        title: "Ceviche de pescado",
        category: "Cocina marina",
        description:
          "Pescado fresco marinado con limón, cebolla y ají, acompañado con los sabores tradicionales de la costa norte.",
      },
      {
        id: "arroz-mariscos",
        src: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTzO9PMaWCd-B9JdTzQIjTEsqvSJH9kmn0LzYvI4mCOfA&s=10",
        alt: "Arroz con mariscos de Pimentel",
        title: "Arroz con mariscos",
        category: "Cocina marina",
        description:
          "Un plato abundante preparado con arroz sazonado y una variedad de mariscos frescos.",
      },
      {
        id: "chinguirito",
        src: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQPRYqzUCmyZsrVVofGMwfTREWDrmmSW5NHn6LWlmdkBA&s=10",
        alt: "Chinguirito tradicional de Lambayeque",
        title: "Chinguirito",
        category: "Tradición lambayecana",
        description:
          "Especialidad norteña elaborada con pescado seco deshilachado, limón, cebolla y ají.",
      },
      {
        id: "tortilla-raya",
        src: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQgESuP4BMzJbss7_fgZmVNhGh6iNMaX5T5cBVhrlnmkg&s=10",
        alt: "Tortilla de raya tradicional de Lambayeque",
        title: "Tortilla de raya",
        category: "Tradición lambayecana",
        description:
          "Preparación emblemática de la cocina costera elaborada con raya seca, huevos y condimentos.",
      },
      {
        id: "arroz-pato",
        src: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSBGdP-b6woqv8K9QoQkNcvA4xjcxOKB9Vp_uoZfMFAxw&s=10",
        alt: "Arroz con pato a la chiclayana",
        title: "Arroz con pato",
        category: "Cocina regional",
        description:
          "Uno de los platos bandera de Lambayeque, reconocido por su arroz verde con culantro y su sazón norteña.",
      },
      {
        id: "seco-cabrito",
        src: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTvSTTLrcCpHZfAmJu9swHLuAtaHlCf-xdCpbAMnuda7w&s=10",
        alt: "Seco de cabrito tradicional de Lambayeque",
        title: "Seco de cabrito",
        category: "Cocina regional",
        description:
          "Guiso tradicional norteño servido generalmente con frejoles, arroz y yuca.",
      },
    ],
  },
];

/* =========================================================
   CONVERTIR LINKS DE YOUTUBE
========================================================= */

function getYouTubeVideoId(videoUrl) {
  if (!videoUrl) {
    return "";
  }

  const normalizedVideoUrl = String(videoUrl).trim();

  // Los archivos locales y los enlaces directos de video no son YouTube.
  // Se reproducen posteriormente mediante la etiqueta <video>.
  if (
    /^(\/|\.\/|\.\.\/)/.test(normalizedVideoUrl) ||
    /\.(mp4|webm|ogg)(?:[?#].*)?$/i.test(normalizedVideoUrl)
  ) {
    return "";
  }

  try {
    const parsedUrl = new URL(normalizedVideoUrl);

    const hostname = parsedUrl.hostname
      .replace("www.", "")
      .replace("m.", "");

    // Ejemplo: https://youtu.be/i9sVbpX1v7U
    if (hostname === "youtu.be") {
      return parsedUrl.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (
      hostname === "youtube.com" ||
      hostname === "youtube-nocookie.com"
    ) {
      // Ejemplo: https://youtube.com/watch?v=i9sVbpX1v7U
      if (parsedUrl.pathname === "/watch") {
        return parsedUrl.searchParams.get("v") || "";
      }

      // Enlaces embed, shorts o live
      const pathParts = parsedUrl.pathname.split("/").filter(Boolean);

      if (
        pathParts[0] === "embed" ||
        pathParts[0] === "shorts" ||
        pathParts[0] === "live"
      ) {
        return pathParts[1] || "";
      }
    }
  } catch (error) {
    console.error("El enlace del video no es válido:", error);
  }

  return "";
}

/* =========================================================
   MENSAJE CUANDO NO EXISTE VIDEO
========================================================= */

function VideoPlaceholder({ title }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#51331f] to-[#1d1009] px-8 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm">
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="ml-1 h-7 w-7"
        >
          <path d="M8 5v14l11-7-11-7Z" />
        </svg>
      </span>

      <strong className="mt-5 font-serif text-2xl text-white">
        Agrega el link del video
      </strong>

      <small className="mt-2 text-sm text-white/60">
        {title}
      </small>
    </div>
  );
}

/* =========================================================
   REPRODUCTOR UNIVERSAL

   Acepta:
   - YouTube
   - Cloudinary
   - Archivos MP4 directos
========================================================= */

function TourismVideoPlayer({
  src,
  title,
  background = false,
  fallbackImage = "",
}) {
  const [videoError, setVideoError] = useState(false);

  const youtubeId = getYouTubeVideoId(src);

  // Si no se agregó ningún link
  if (!src) {
    if (background && fallbackImage) {
      return (
        <img
          src={fallbackImage}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      );
    }

    return <VideoPlaceholder title={title} />;
  }

  // Reproductor para YouTube
  if (youtubeId) {
    const youtubeParameters = background
      ? `autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&rel=0&playsinline=1&modestbranding=1`
      : "autoplay=0&controls=1&rel=0&playsinline=1&modestbranding=1";

    if (background) {
      return (
        <div className="absolute inset-0 overflow-hidden bg-black">
          {fallbackImage && (
            <img
              src={fallbackImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}

          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?${youtubeParameters}`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 border-0"
          />
        </div>
      );
    }

    return (
      <iframe
        src={`https://www.youtube.com/embed/${youtubeId}?${youtubeParameters}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
    );
  }

  // Si el link directo tiene un error
  if (videoError) {
    if (background && fallbackImage) {
      return (
        <img
          src={fallbackImage}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      );
    }

    return <VideoPlaceholder title={title} />;
  }

  // Reproductor para Cloudinary o MP4 directo
  return (
    <video
      src={src}
      poster={fallbackImage || undefined}
      autoPlay={background}
      muted={background}
      loop={background}
      playsInline
      controls={!background}
      preload="metadata"
      onError={() => setVideoError(true)}
      className={
        background
          ? "absolute inset-0 h-full w-full object-cover"
          : "absolute inset-0 h-full w-full object-cover"
      }
    >
      Tu navegador no puede reproducir este video.
    </video>
  );
}

/* =========================================================
   ICONOS DE LA BARRA SOCIAL
========================================================= */

function DockIcon({ type }) {
  const iconProps = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (type === "home") {
    return (
      <svg {...iconProps}>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v11h14V10" />
        <path d="M9 21v-7h6v7" />
      </svg>
    );
  }

  if (type === "mail") {
    return (
      <svg {...iconProps}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    );
  }

  if (type === "whatsapp") {
    return (
      <svg {...iconProps}>
        <path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.6A8.5 8.5 0 1 1 20.5 11.5Z" />
        <path d="M8.2 7.8c.5 3.7 2.3 5.5 6 6l1.4-1.4c.3-.3.7-.4 1.1-.2l2 .9" />
      </svg>
    );
  }

  if (type === "facebook") {
    return (
      <svg {...iconProps} fill="currentColor" stroke="none">
        <path d="M14 8h3V4.5c-.5-.1-1.9-.3-3.6-.3-3.5 0-5.9 2.1-5.9 6.1V13H4v4h3.5v7H12v-7h3.5l.6-4H12v-2.3C12 9.5 12.3 8 14 8Z" />
      </svg>
    );
  }

  if (type === "tiktok") {
    return (
      <svg {...iconProps}>
        <path d="M14 4v10.5a4.5 4.5 0 1 1-4.5-4.5" />
        <path d="M14 4c.8 2.6 2.4 4 5 4" />
      </svg>
    );
  }

  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle
        cx="17.5"
        cy="6.5"
        r="1"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

/* =========================================================
   BARRA SOCIAL
========================================================= */

function SocialDock() {
  const mensajeWhatsApp =
    "Hola, quisiera solicitar información sobre Casa de Huéspedes Pimentel.";

  const asuntoCorreo = encodeURIComponent(
    "Consulta sobre Casa de Huéspedes Pimentel",
  );

  const cuerpoCorreo = encodeURIComponent(
    "Hola, quisiera solicitar información sobre Casa de Huéspedes Pimentel.",
  );

  return (
    <aside
      aria-label="Redes sociales y contacto"
      className="
        fixed z-40
        left-1/2 bottom-4 -translate-x-1/2
        flex flex-row items-center gap-2
        rounded-full border border-[#eadfce]
        bg-[#fbf7ef]/95 px-3 py-2
        shadow-[0_15px_40px_rgba(43,29,18,0.20)]
        backdrop-blur-md

        lg:left-5 lg:top-1/2 lg:bottom-auto
        lg:translate-x-0 lg:-translate-y-1/2
        lg:flex-col lg:gap-3 lg:px-2 lg:py-4
      "
    >
      <span className="hidden lg:block [writing-mode:vertical-rl] rotate-180 text-[10px] font-black uppercase tracking-[0.25em] text-[#2d261f]">
        Contáctanos
      </span>

      <Link
        to="/"
        aria-label="Ir al inicio"
        title="Inicio"
        className="grid h-11 w-11 place-items-center rounded-full bg-[#2b1d12] text-white transition hover:-translate-y-0.5 hover:bg-[#a87545]"
      >
        <DockIcon type="home" />
      </Link>

      <a
        href={`mailto:casadehuespedespimentel2023@gmail.com?subject=${asuntoCorreo}&body=${cuerpoCorreo}`}
        aria-label="Enviar correo"
        title="Correo"
        className="grid h-11 w-11 place-items-center rounded-full bg-[#2b1d12] text-white transition hover:-translate-y-0.5 hover:bg-[#a87545]"
      >
        <DockIcon type="mail" />
      </a>

      <a
        href={`https://wa.me/51901551287?text=${encodeURIComponent(
          mensajeWhatsApp,
        )}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Contactar por WhatsApp"
        title="WhatsApp"
        className="grid h-11 w-11 place-items-center rounded-full bg-[#25D366] text-white transition hover:-translate-y-0.5 hover:bg-[#1faf54]"
      >
        <DockIcon type="whatsapp" />
      </a>

      <a
        href="https://www.facebook.com/casadehuespedespimentel/?locale=es_LA"
        target="_blank"
        rel="noreferrer"
        aria-label="Visitar Facebook"
        title="Facebook"
        className="grid h-11 w-11 place-items-center rounded-full bg-[#2b1d12] text-white transition hover:-translate-y-0.5 hover:bg-[#a87545]"
      >
        <DockIcon type="facebook" />
      </a>

      <a
        href="https://www.tiktok.com/@casahuespedespimentel"
        target="_blank"
        rel="noreferrer"
        aria-label="Visitar TikTok"
        title="TikTok"
        className="grid h-11 w-11 place-items-center rounded-full bg-[#2b1d12] text-white transition hover:-translate-y-0.5 hover:bg-[#a87545]"
      >
        <DockIcon type="tiktok" />
      </a>

      <a
        href="https://www.instagram.com/casahuespedes.pimentel/"
        target="_blank"
        rel="noreferrer"
        aria-label="Visitar Instagram"
        title="Instagram"
        className="grid h-11 w-11 place-items-center rounded-full bg-[#2b1d12] text-white transition hover:-translate-y-0.5 hover:bg-[#a87545]"
      >
        <DockIcon type="instagram" />
      </a>
    </aside>
  );
}

/* =========================================================
   TARJETA DE TURISMO
========================================================= */

function TourismCard({ image }) {
  return (
    <article className="group overflow-hidden rounded-[26px] border border-[#eadfce] bg-white shadow-[0_18px_45px_rgba(43,29,18,0.08)] transition duration-300 hover:-translate-y-2 hover:shadow-[0_25px_55px_rgba(43,29,18,0.15)]">
      <div className="relative h-[390px] overflow-hidden bg-[#e9ddce] sm:h-[430px]">
        {image.src ? (
          <img
            src={image.src}
            alt={image.alt}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#eee3d4] to-[#d8c2a8] px-8 text-center">
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#a87545]">
              Agrega el link de la fotografía
            </span>

            <strong className="mt-3 font-serif text-2xl text-[#2b1d12]">
              {image.title}
            </strong>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1009]/95 via-[#1c1009]/20 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-7">
          <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] backdrop-blur-md">
            {image.category}
          </span>

          <h3 className="mt-3 font-serif text-2xl font-semibold leading-tight sm:text-3xl">
            {image.title}
          </h3>

          <p className="mt-3 max-w-md text-sm leading-6 text-white/85">
            {image.description}
          </p>
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   SECCIÓN DE FOTOGRAFÍAS
========================================================= */

function TourismGallerySection({
  section,
  featured = false,
  background,
}) {
  return (
    <section
      id={section.id}
      className={`scroll-mt-24 py-20 sm:py-24 ${background}`}
    >
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mb-12 grid items-end gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.22em] text-[#a87545]">
              {section.eyebrow}
            </span>

            <h2 className="mt-4 font-serif text-4xl leading-[1.05] tracking-[-0.025em] text-[#2b1d12] sm:text-5xl lg:text-6xl">
              {section.title}
            </h2>
          </div>

          <p className="max-w-2xl text-base leading-8 text-[#6c5b50] sm:text-lg">
            {section.description}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {section.images.map((image, index) => (
            <div
              key={image.id}
              className={
                featured && index === 0
                  ? "sm:col-span-2"
                  : ""
              }
            >
              <TourismCard image={image} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   SECCIÓN DE VIDEO
========================================================= */

function TourismVideoSection({ video, reverse = false }) {
  return (
    <section
      id={video.id}
      className="relative overflow-hidden bg-[#2b1d12] py-20 sm:py-24"
    >
      <div className="absolute -left-32 top-12 h-72 w-72 rounded-full bg-[#a87545]/20 blur-[100px]" />

      <div className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-[#d9a86e]/10 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div
          className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
            reverse ? "lg:[&>*:first-child]:order-2" : ""
          }`}
        >
          {/* VIDEO */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-[36px] border border-white/10" />

            <div className="relative aspect-video overflow-hidden rounded-[28px] border border-white/15 bg-[#160c07] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
              <TourismVideoPlayer
                src={video.videoSrc}
                title={video.title}
              />
            </div>
          </div>

          {/* TEXTO */}
          <div className={reverse ? "lg:pr-8" : "lg:pl-8"}>
            <span className="text-xs font-black uppercase tracking-[0.24em] text-[#d9a86e]">
              {video.eyebrow}
            </span>

            <h2 className="mt-5 max-w-xl font-serif text-4xl leading-[1.05] tracking-[-0.025em] text-white sm:text-5xl lg:text-6xl">
              {video.title}
            </h2>

            <p className="mt-6 max-w-xl text-base leading-8 text-white/70 sm:text-lg">
              {video.description}
            </p>

            <a
              href={video.buttonLink}
              className="mt-8 inline-flex items-center justify-center rounded-full bg-[#a87545] px-7 py-4 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-1 hover:bg-[#bd8753] hover:shadow-xl"
            >
              {video.buttonText}

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="ml-3 h-4 w-4"
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   PÁGINA COMPLETA
========================================================= */

export default function Tourism() {
  return (
    <>
      <Navbar />

      <main
        id="inicio-turismo"
        className="min-h-screen overflow-hidden bg-[#fbf7ef] text-[#2b1d12]"
      >
        {/* =====================================================
            1. VIDEO PRINCIPAL
        ===================================================== */}
        <section className="relative flex min-h-[650px] items-center overflow-hidden lg:min-h-[720px]">
          <TourismVideoPlayer
            src={videoPortadaPimentel}
            title="Video principal de Pimentel"
            background
            fallbackImage={imagenPortadaPimentel}
          />

          {/* Capas oscuras */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#170c06]/95 via-[#211208]/70 to-[#211208]/20" />

          <div className="absolute inset-0 bg-gradient-to-t from-[#170c06]/80 via-transparent to-[#211208]/20" />

          <div className="absolute -right-28 top-20 h-96 w-96 rounded-full bg-[#d9a86e]/15 blur-[120px]" />

          {/* Texto de portada */}
          <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-24 md:px-10 lg:px-12">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#d9a86e] opacity-75" />

                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#d9a86e]" />
                </span>

                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white">
                  Descubre el norte del Perú
                </span>
              </div>

              <p className="mt-7 text-xs font-black uppercase tracking-[0.28em] text-[#e0b37f] sm:text-sm">
                Casa Huéspedes Pimentel
              </p>

              <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[1.02] tracking-[-0.035em] text-white sm:text-6xl lg:text-[82px]">
                Conoce la esencia de Pimentel
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-8 text-white/85 sm:text-lg">
                Tradición, historia, mar y gastronomía en uno de los
                balnearios más representativos de Lambayeque.
              </p>

              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <a
                  href="#videos-pimentel"
                  className="inline-flex items-center justify-center rounded-full bg-[#a87545] px-7 py-4 text-xs font-black uppercase tracking-[0.15em] text-white transition hover:-translate-y-1 hover:bg-[#8d5a2e] hover:shadow-xl"
                >
                  Ver Pimentel
                </a>

                <Link
                  to="/habitaciones"
                  className="inline-flex items-center justify-center rounded-full border border-white/50 bg-white/10 px-7 py-4 text-xs font-black uppercase tracking-[0.15em] text-white backdrop-blur-sm transition hover:bg-white hover:text-[#2b1d12]"
                >
                  Ver habitaciones
                </Link>
              </div>
            </div>
          </div>

          <a
            href="#videos-pimentel"
            aria-label="Bajar a los videos de Pimentel"
            className="absolute bottom-7 left-1/2 z-10 flex h-12 w-12 -translate-x-1/2 animate-bounce items-center justify-center rounded-full border border-white/40 bg-white/10 text-white backdrop-blur-sm"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </a>
        </section>

        {/* =====================================================
            PRESENTACIÓN DE LOS VIDEOS
        ===================================================== */}
        <section
          id="videos-pimentel"
          className="scroll-mt-24 bg-[#fbf7ef] px-5 py-20 text-center sm:py-24 md:px-8"
        >
          <div className="mx-auto max-w-4xl">
            <span className="text-xs font-black uppercase tracking-[0.24em] text-[#a87545]">
              Pimentel en movimiento
            </span>

            <h2 className="mt-5 font-serif text-4xl leading-[1.05] text-[#2b1d12] sm:text-5xl lg:text-6xl">
              Descubre este destino antes de visitarlo
            </h2>

            <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-[#6c5b50] sm:text-lg">
              Conoce el mar, el muelle, las tradiciones y los sabores de
              Pimentel mediante una selección de videos.
            </p>
          </div>
        </section>

        {/* VIDEO 1 */}
        <TourismVideoSection video={tourismVideos[0]} />

        {/* VIDEO 2 */}
        <TourismVideoSection
          video={tourismVideos[1]}
          reverse
        />

        {/* =====================================================
            INFORMACIÓN
        ===================================================== */}
        <section className="relative overflow-hidden bg-white px-5 py-20 text-center sm:py-24 md:px-8">
          <div className="absolute left-1/2 top-0 h-px w-[85%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#a87545]/40 to-transparent" />

          <div className="mx-auto max-w-4xl">
            <span className="text-xs font-black uppercase tracking-[0.24em] text-[#a87545]">
              Explora Pimentel
            </span>

            <h2 className="mt-5 font-serif text-4xl leading-[1.05] text-[#2b1d12] sm:text-5xl lg:text-6xl">
              Lugares, tradiciones y sabores
            </h2>

            <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-[#6c5b50] sm:text-lg">
              Después de conocer Pimentel en video, descubre sus
              principales atractivos y algunas de las especialidades más
              representativas de la gastronomía lambayecana.
            </p>

            <a
              href="#lugares"
              className="mt-8 inline-flex items-center gap-3 text-xs font-black uppercase tracking-[0.16em] text-[#a87545] transition hover:text-[#7b4a1f]"
            >
              Ver lugares turísticos

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </a>
          </div>
        </section>

        {/* LUGARES TURÍSTICOS */}
        <TourismGallerySection
          section={gallerySections[0]}
          featured
          background="bg-[#fbf7ef]"
        />

        {/* GASTRONOMÍA */}
        <TourismGallerySection
          section={gallerySections[1]}
          background="bg-white"
        />

        {/* INVITACIÓN FINAL */}
        <section className="relative overflow-hidden bg-[#2b1d12] py-24 text-white">
          <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-[#a87545]/15 blur-[110px]" />

          <div className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-[#d9a86e]/10 blur-[110px]" />

          <div className="relative mx-auto max-w-7xl px-5 text-center md:px-8">
            <span className="text-xs font-black uppercase tracking-[0.22em] text-[#d9a86e]">
              Descansa cerca del mar
            </span>

            <h2 className="mx-auto mt-5 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">
              Vive Pimentel desde Casa Huéspedes
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
              Encuentra una habitación cómoda y disfruta de los
              principales atractivos del balneario durante tu estadía.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                to="/habitaciones"
                className="inline-flex items-center justify-center rounded-full bg-[#a87545] px-8 py-4 text-xs font-black uppercase tracking-[0.15em] text-white transition hover:-translate-y-1 hover:bg-[#bd8753] hover:shadow-xl"
              >
                Ver habitaciones
              </Link>

              <a
                href="/#disponibilidad"
                className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/5 px-8 py-4 text-xs font-black uppercase tracking-[0.15em] text-white backdrop-blur-sm transition hover:-translate-y-1 hover:bg-white hover:text-[#2b1d12]"
              >
                Consultar disponibilidad
              </a>
            </div>
          </div>
        </section>
      </main>

      <SocialDock />
      <Footer />
    </>
  );
}

