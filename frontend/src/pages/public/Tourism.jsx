import { Link } from "react-router-dom";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

/*
  PEGA AQUÍ EL LINK DIRECTO DE LA IMAGEN DE PORTADA.

  Ejemplo:
  https://res.cloudinary.com/tu-cloud/image/upload/portada.jpg
*/
const heroImage = "";

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
        src: "", // PEGA AQUÍ EL LINK
        alt: "Caballitos de totora navegando en el mar de Pimentel",
        title: "Caballitos de Totora",
        category: "Tradición",
        description:
          "Embarcaciones artesanales de origen ancestral que todavía son utilizadas por los pescadores de Pimentel.",
      },
      {
        id: "muelle-pimentel",
        src: "", // PEGA AQUÍ EL LINK
        alt: "Muelle histórico de Pimentel frente al océano Pacífico",
        title: "Muelle de Pimentel",
        category: "Historia",
        description:
          "Uno de los principales símbolos del balneario y un lugar privilegiado para contemplar el mar.",
      },
      {
        id: "playa-pimentel",
        src: "", // PEGA AQUÍ EL LINK
        alt: "Playa de Pimentel en Lambayeque",
        title: "Playa de Pimentel",
        category: "Naturaleza",
        description:
          "Una extensa playa de arena ideal para caminar, descansar y disfrutar del paisaje de la costa norte.",
      },
      {
        id: "malecon-pimentel",
        src: "", // PEGA AQUÍ EL LINK
        alt: "Malecón turístico de Pimentel",
        title: "Malecón de Pimentel",
        category: "Paseo",
        description:
          "Un agradable recorrido frente al mar rodeado de restaurantes, viviendas tradicionales y espacios para descansar.",
      },
      {
        id: "playa-las-rocas",
        src: "", // PEGA AQUÍ EL LINK
        alt: "Playa Las Rocas en el distrito de Pimentel",
        title: "Playa Las Rocas",
        category: "Naturaleza",
        description:
          "Un rincón costero que combina formaciones rocosas, brisa marina y paisajes naturales.",
      },
      {
        id: "casa-museo-quinones",
        src: "", // PEGA AQUÍ EL LINK
        alt: "Casa Museo José Abelardo Quiñones",
        title: "Casa Museo José Quiñones",
        category: "Cultura",
        description:
          "Casa natal del héroe de la aviación peruana, convertida en un espacio histórico y cultural.",
      },
      {
        id: "pesca-artesanal",
        src: "", // PEGA AQUÍ EL LINK
        alt: "Pescadores artesanales trabajando en Pimentel",
        title: "Pesca artesanal",
        category: "Identidad",
        description:
          "Una actividad que mantiene viva la relación histórica entre los habitantes de Pimentel y el océano.",
      },
      {
        id: "atardecer-pimentel",
        src: "", // PEGA AQUÍ EL LINK
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
        src: "", // PEGA AQUÍ EL LINK
        alt: "Ceviche de pescado preparado en Pimentel",
        title: "Ceviche de pescado",
        category: "Cocina marina",
        description:
          "Pescado fresco marinado con limón, cebolla y ají, acompañado con los sabores tradicionales de la costa norte.",
      },
      {
        id: "arroz-mariscos",
        src: "", // PEGA AQUÍ EL LINK
        alt: "Arroz con mariscos de Pimentel",
        title: "Arroz con mariscos",
        category: "Cocina marina",
        description:
          "Un plato abundante preparado con arroz sazonado y una variedad de mariscos frescos.",
      },
      {
        id: "chinguirito",
        src: "", // PEGA AQUÍ EL LINK
        alt: "Chinguirito tradicional de Lambayeque",
        title: "Chinguirito",
        category: "Tradición lambayecana",
        description:
          "Especialidad norteña elaborada con pescado seco deshilachado, limón, cebolla y ají.",
      },
      {
        id: "tortilla-raya",
        src: "", // PEGA AQUÍ EL LINK
        alt: "Tortilla de raya tradicional de Lambayeque",
        title: "Tortilla de raya",
        category: "Tradición lambayecana",
        description:
          "Preparación emblemática de la cocina costera elaborada con raya seca, huevos y condimentos.",
      },
      {
        id: "arroz-pato",
        src: "", // PEGA AQUÍ EL LINK
        alt: "Arroz con pato a la chiclayana",
        title: "Arroz con pato",
        category: "Cocina regional",
        description:
          "Uno de los platos bandera de Lambayeque, reconocido por su arroz verde con culantro y su sazón norteña.",
      },
      {
        id: "seco-cabrito",
        src: "", // PEGA AQUÍ EL LINK
        alt: "Seco de cabrito tradicional de Lambayeque",
        title: "Seco de cabrito",
        category: "Cocina regional",
        description:
          "Guiso tradicional norteño servido generalmente con frejoles, arroz y yuca.",
      },
    ],
  },
];

/* ICONOS DE LA BARRA SOCIAL */

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

/* BARRA SOCIAL IZQUIERDA */

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

/* TARJETA DE TURISMO */

function TourismCard({ image }) {
  return (
    <article className="group overflow-hidden rounded-[26px] border border-[#eadfce] bg-white shadow-[0_18px_45px_rgba(43,29,18,0.08)]">
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
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mb-5 h-12 w-12 text-[#a87545]"
            >
              <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-13Z" />
              <path d="m3 16 5-5 4 4 2-2 7 7" />
              <circle cx="16.5" cy="7.5" r="1.5" />
            </svg>

            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#a87545]">
              Agrega el link de la fotografía
            </span>

            <strong className="mt-3 font-serif text-2xl text-[#2b1d12]">
              {image.title}
            </strong>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1009]/95 via-[#1c1009]/25 to-transparent" />

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

/* PÁGINA COMPLETA */

export default function Tourism() {
  return (
    <>
      {/* NAVBAR */}
      <Navbar />

      <main
        id="inicio-turismo"
        className="min-h-screen overflow-hidden bg-[#fbf7ef] text-[#2b1d12]"
      >
        {/* PORTADA */}
        <section className="relative flex min-h-[650px] items-center lg:min-h-[720px]">
          {heroImage ? (
            <img
              src={heroImage}
              alt="Vista del mar y del muelle de Pimentel"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#62432c] via-[#3c2618] to-[#1e1109]" />
          )}

          <div className="absolute inset-0 bg-gradient-to-r from-[#211208]/95 via-[#211208]/70 to-[#211208]/20" />

          <div className="absolute inset-0 bg-gradient-to-t from-[#211208]/70 via-transparent to-[#211208]/20" />

          <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-24 md:px-10 lg:px-12">
            <div className="max-w-4xl">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#e0b37f] sm:text-sm">
                Casa Huéspedes Pimentel
              </p>

              <h1 className="mt-6 max-w-4xl font-serif text-5xl leading-[1.05] tracking-[-0.035em] text-white sm:text-6xl lg:text-[82px]">
                Conoce la esencia de Pimentel
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-8 text-white/85 sm:text-lg">
                Tradición, historia, mar y gastronomía en uno de los balnearios
                más representativos de Lambayeque.
              </p>

              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <a
                  href="#lugares"
                  className="inline-flex items-center justify-center rounded-full bg-[#a87545] px-7 py-4 text-xs font-black uppercase tracking-[0.15em] text-white transition hover:-translate-y-1 hover:bg-[#8d5a2e] hover:shadow-xl"
                >
                  Descubrir Pimentel
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
            href="#lugares"
            aria-label="Bajar a la galería turística"
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

        {/* LUGARES Y GASTRONOMÍA */}
        {gallerySections.map((section, sectionIndex) => (
          <section
            key={section.id}
            id={section.id}
            className={`scroll-mt-24 py-20 sm:py-24 ${
              sectionIndex % 2 === 0 ? "bg-[#fbf7ef]" : "bg-white"
            }`}
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
                {section.images.map((image, imageIndex) => (
                  <div
                    key={image.id}
                    className={
                      imageIndex === 0 && section.images.length > 6
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
        ))}

        {/* INVITACIÓN FINAL */}
        <section className="bg-[#2b1d12] py-20 text-white">
          <div className="mx-auto max-w-7xl px-5 text-center md:px-8">
            <span className="text-xs font-black uppercase tracking-[0.22em] text-[#d9a86e]">
              Descansa cerca del mar
            </span>

            <h2 className="mx-auto mt-4 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">
              Vive Pimentel desde Casa Huéspedes
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
              Encuentra una habitación cómoda y disfruta de los principales
              atractivos del balneario durante tu estadía.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                to="/habitaciones"
                className="inline-flex items-center justify-center rounded-full bg-[#a87545] px-8 py-4 text-xs font-black uppercase tracking-[0.15em] text-white transition hover:-translate-y-1 hover:bg-[#bd8753]"
              >
                Ver habitaciones
              </Link>

              <a
                href="/#disponibilidad"
                className="inline-flex items-center justify-center rounded-full border border-white/30 px-8 py-4 text-xs font-black uppercase tracking-[0.15em] text-white transition hover:bg-white hover:text-[#2b1d12]"
              >
                Consultar disponibilidad
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* BARRA SOCIAL */}
      <SocialDock />

      {/* FOOTER */}
      <Footer />
    </>
  );
}