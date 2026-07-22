import { Link } from "react-router-dom";

import { Link } from "react-router-dom";

// Pega aquí el enlace de la imagen principal
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
        src: "", // LINK DE LA FOTO
        alt: "Caballitos de totora navegando en el mar de Pimentel",
        title: "Caballitos de Totora",
        category: "Tradición",
        description:
          "Embarcaciones artesanales de origen ancestral que todavía son utilizadas por los pescadores de Pimentel.",
      },
      {
        id: "muelle-pimentel",
        src: "", // LINK DE LA FOTO
        alt: "Muelle histórico de Pimentel frente al océano Pacífico",
        title: "Muelle de Pimentel",
        category: "Historia",
        description:
          "Uno de los principales símbolos del balneario y un lugar privilegiado para contemplar el mar.",
      },
      {
        id: "playa-pimentel",
        src: "", // LINK DE LA FOTO
        alt: "Playa de Pimentel en Lambayeque",
        title: "Playa de Pimentel",
        category: "Naturaleza",
        description:
          "Una extensa playa de arena ideal para caminar, descansar y disfrutar del paisaje de la costa norte.",
      },
      {
        id: "malecon-pimentel",
        src: "", // LINK DE LA FOTO
        alt: "Malecón turístico de Pimentel",
        title: "Malecón de Pimentel",
        category: "Paseo",
        description:
          "Un agradable recorrido frente al mar rodeado de restaurantes, viviendas tradicionales y espacios para descansar.",
      },
      {
        id: "playa-las-rocas",
        src: "", // LINK DE LA FOTO
        alt: "Playa Las Rocas en Pimentel",
        title: "Playa Las Rocas",
        category: "Naturaleza",
        description:
          "Un rincón costero que combina formaciones rocosas, brisa marina y paisajes naturales.",
      },
      {
        id: "casa-museo-quinones",
        src: "", // LINK DE LA FOTO
        alt: "Casa Museo José Abelardo Quiñones",
        title: "Casa Museo José Quiñones",
        category: "Cultura",
        description:
          "Casa natal del héroe de la aviación peruana, convertida en un espacio histórico y cultural.",
      },
      {
        id: "pesca-artesanal",
        src: "", // LINK DE LA FOTO
        alt: "Pescadores artesanales trabajando en Pimentel",
        title: "Pesca artesanal",
        category: "Identidad",
        description:
          "Una actividad que mantiene viva la relación histórica entre los habitantes de Pimentel y el océano.",
      },
      {
        id: "atardecer-pimentel",
        src: "", // LINK DE LA FOTO
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
        src: "", // LINK DE LA FOTO
        alt: "Ceviche de pescado preparado en Pimentel",
        title: "Ceviche de pescado",
        category: "Cocina marina",
        description:
          "Pescado fresco marinado con limón, cebolla y ají, acompañado con los sabores tradicionales de la costa norte.",
      },
      {
        id: "arroz-mariscos",
        src: "", // LINK DE LA FOTO
        alt: "Arroz con mariscos",
        title: "Arroz con mariscos",
        category: "Cocina marina",
        description:
          "Un plato abundante preparado con arroz sazonado y una variedad de mariscos frescos.",
      },
      {
        id: "chinguirito",
        src: "", // LINK DE LA FOTO
        alt: "Chinguirito tradicional de Lambayeque",
        title: "Chinguirito",
        category: "Tradición lambayecana",
        description:
          "Especialidad norteña elaborada con pescado seco deshilachado, limón, cebolla y ají.",
      },
      {
        id: "tortilla-raya",
        src: "", // LINK DE LA FOTO
        alt: "Tortilla de raya tradicional",
        title: "Tortilla de raya",
        category: "Tradición lambayecana",
        description:
          "Preparación emblemática de la cocina costera elaborada con raya seca, huevos y condimentos.",
      },
      {
        id: "arroz-pato",
        src: "", // LINK DE LA FOTO
        alt: "Arroz con pato a la chiclayana",
        title: "Arroz con pato",
        category: "Cocina regional",
        description:
          "Uno de los platos bandera de Lambayeque, reconocido por su arroz verde y sazón norteña.",
      },
      {
        id: "seco-cabrito",
        src: "", // LINK DE LA FOTO
        alt: "Seco de cabrito tradicional",
        title: "Seco de cabrito",
        category: "Cocina regional",
        description:
          "Guiso tradicional norteño servido generalmente con frejoles, arroz y yuca.",
      },
    ],
  },
];

function TourismCard({ image }) {
  return (
    <article className="group overflow-hidden rounded-[26px] bg-white border border-[#eadfce] shadow-[0_18px_45px_rgba(43,29,18,0.08)]">
      <div className="relative h-[360px] sm:h-[410px] overflow-hidden bg-[#e9ddce]">
        <img
          src={image.src}
          alt={image.alt}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={(event) => {
            event.currentTarget.style.display = "none";
            event.currentTarget.nextElementSibling.style.display = "flex";
          }}
        />

        {/* Aparece solamente si la fotografía no existe */}
        <div className="absolute inset-0 hidden flex-col items-center justify-center bg-[#e9ddce] px-6 text-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="mb-4 h-10 w-10 text-[#a87545]"
          >
            <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-13Z" />
            <path d="m3 16 5-5 4 4 2-2 7 7" />
            <circle cx="16.5" cy="7.5" r="1.5" />
          </svg>

          <span className="text-xs font-black uppercase tracking-[0.18em] text-[#a87545]">
            Agrega la fotografía
          </span>

          <strong className="mt-2 text-xl text-[#2b1d12]">
            {image.title}
          </strong>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1009]/95 via-[#1c1009]/25 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7 text-white">
          <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] backdrop-blur-md">
            {image.category}
          </span>

          <h3 className="mt-3 text-2xl sm:text-3xl font-serif font-semibold leading-tight">
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

export default function Tourism() {
  return (
    <main
      id="inicio-turismo"
      className="min-h-screen overflow-hidden bg-[#fbf7ef] text-[#2b1d12]"
    >
      {/* PORTADA */}
      <section className="relative min-h-[650px] lg:min-h-[720px] flex items-center">
        <img
          src="/img/turismo/portada-pimentel.jpg"
          alt="Vista del mar y del muelle de Pimentel"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#211208]/95 via-[#211208]/70 to-[#211208]/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#211208]/70 via-transparent to-[#211208]/20" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-12 py-24">
          <div className="max-w-4xl">
            <p className="text-xs sm:text-sm font-black uppercase tracking-[0.28em] text-[#e0b37f]">
              Casa Huéspedes Pimentel
            </p>

            <h1 className="mt-6 max-w-4xl font-serif text-5xl sm:text-6xl lg:text-[82px] leading-[0.98] tracking-[-0.035em] text-white">
              Conoce la esencia de Pimentel
            </h1>

            <p className="mt-7 max-w-2xl text-base sm:text-lg leading-8 text-white/85">
              Tradición, historia, mar y gastronomía en uno de los balnearios
              más representativos de Lambayeque.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-4">
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
          aria-label="Bajar a la galería"
          className="absolute z-10 bottom-7 left-1/2 -translate-x-1/2 flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white backdrop-blur-sm animate-bounce"
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

      {/* SECCIONES DE TURISMO */}
      {gallerySections.map((section, sectionIndex) => (
        <section
          key={section.id}
          id={section.id}
          className={`scroll-mt-24 py-20 sm:py-24 ${
            sectionIndex % 2 === 0 ? "bg-[#fbf7ef]" : "bg-white"
          }`}
        >
          <div className="max-w-7xl mx-auto px-5 md:px-8">
            <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-7 lg:gap-20 items-end mb-12">
              <div>
                <span className="text-xs font-black uppercase tracking-[0.22em] text-[#a87545]">
                  {section.eyebrow}
                </span>

                <h2 className="mt-4 font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.02] tracking-[-0.025em] text-[#2b1d12]">
                  {section.title}
                </h2>
              </div>

              <p className="max-w-2xl text-base sm:text-lg leading-8 text-[#6c5b50]">
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

      {/* LLAMADO A RESERVAR */}
      <section className="bg-[#2b1d12] py-20 text-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8 text-center">
          <span className="text-xs font-black uppercase tracking-[0.22em] text-[#d9a86e]">
            Descansa cerca del mar
          </span>

          <h2 className="mx-auto mt-4 max-w-3xl font-serif text-4xl sm:text-5xl lg:text-6xl leading-tight">
            Vive Pimentel desde Casa Huéspedes
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg leading-8 text-white/70">
            Encuentra una habitación cómoda y disfruta de los principales
            atractivos del balneario durante tu estadía.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row justify-center gap-4">
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
  );
}