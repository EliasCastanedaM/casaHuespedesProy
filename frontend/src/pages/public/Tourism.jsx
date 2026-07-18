import { Link } from "react-router-dom";

const places = [
  {
    title: "Playa Pimentel",
    tag: "Mar y descanso",
    description:
      "Un lugar ideal para caminar, relajarse, tomar fotografías y disfrutar el ambiente costero.",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    large: true,
  },
  {
    title: "Muelle de Pimentel",
    tag: "Lugar icónico",
    description:
      "Uno de los puntos más representativos del balneario, perfecto para pasear y ver el mar.",
    image:
      "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Malecón",
    tag: "Paseo costero",
    description:
      "Espacio tranquilo para caminar, conversar y disfrutar la brisa marina.",
    image:
      "https://images.unsplash.com/photo-1520942702018-0862200e6873?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Atardeceres",
    tag: "Experiencia",
    description:
      "Pimentel ofrece atardeceres cálidos frente al mar, ideales para cerrar el día.",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
  },
];

const foods = [
  {
    title: "Ceviche frente al mar",
    description:
      "Una opción fresca y perfecta para disfrutar durante una visita a Pimentel.",
    image:
      "https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Pescado frito",
    description:
      "Un plato clásico de playa, ideal para almorzar después de una caminata.",
    image:
      "https://images.unsplash.com/photo-1604908177522-0406f5b0b4c0?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Arroz con mariscos",
    description:
      "Sabor marino y norteño para quienes buscan una comida más completa.",
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80",
  },
];

const experiences = [
  {
    icon: "🌅",
    title: "Atardecer en el malecón",
    description:
      "Camina cerca al mar y disfruta una vista tranquila al finalizar el día.",
  },
  {
    icon: "🌊",
    title: "Paseo por el muelle",
    description:
      "Un recorrido sencillo y representativo para conocer el lado más tradicional de Pimentel.",
  },
  {
    icon: "🍽️",
    title: "Comida marina",
    description:
      "Disfruta platos frescos y sabores costeros durante tu estadía.",
  },
];

const routeSteps = [
  {
    number: "1",
    title: "Llegada y descanso",
    description:
      "Haz check-in, acomódate y empieza la estadía con una caminata cerca al mar.",
  },
  {
    number: "2",
    title: "Playa y muelle",
    description:
      "Recorre la playa, visita el muelle y toma fotografías del paisaje costero.",
  },
  {
    number: "3",
    title: "Cena o atardecer",
    description:
      "Cierra el día con comida marina o una vista tranquila frente al mar.",
  },
];

export default function Tourism() {
  return (
    <main className="bg-[#f7f1e8] text-[#2d261f] overflow-x-hidden">
      {/* NAVBAR */}
      <header className="w-full sticky top-0 z-50 bg-[#fbf7ef]/95 backdrop-blur-md border-b border-[#eadfce]">
        <nav className="max-w-7xl mx-auto px-5 md:px-8 h-[76px] flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <div className="w-11 h-11 rounded-full border border-[#a87545] text-[#a87545] flex items-center justify-center font-black text-sm overflow-hidden bg-white">
              <img
                src="/img/brand/logo-casa-huespedes.png"
                alt="Casa Huéspedes Pimentel"
                className="w-full h-full object-contain p-1.5"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                  event.currentTarget.parentElement.textContent = "CH";
                }}
              />
            </div>

            <div className="leading-tight">
              <p className="font-black text-[#2d261f] text-sm md:text-base">
                Casa Huéspedes
              </p>
              <p className="text-xs text-[#8b7b6d] tracking-wide">Pimentel</p>
            </div>
          </Link>

          <div className="hidden lg:flex items-center justify-center gap-7 flex-1">
            <Link
              to="/"
              className="bg-[#a87545] text-white px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wide hover:bg-[#8f623a] transition"
            >
              Volver al hospedaje
            </Link>

            <a
              href="#inicio-turismo"
              className="text-xs font-black uppercase tracking-wide text-[#a87545] border-b-2 border-[#a87545] pb-2"
            >
              Inicio
            </a>

            <a
              href="#atractivos"
              className="text-xs font-black uppercase tracking-wide text-[#5f5147] hover:text-[#a87545] transition pb-2"
            >
              Atractivos
            </a>

            <a
              href="#comidas"
              className="text-xs font-black uppercase tracking-wide text-[#5f5147] hover:text-[#a87545] transition pb-2"
            >
              Comidas
            </a>

            <a
              href="#experiencias"
              className="text-xs font-black uppercase tracking-wide text-[#5f5147] hover:text-[#a87545] transition pb-2"
            >
              Experiencias
            </a>

            <a
              href="#ruta"
              className="text-xs font-black uppercase tracking-wide text-[#5f5147] hover:text-[#a87545] transition pb-2"
            >
              Ruta
            </a>
          </div>

          <Link
            to="/#disponibilidad"
            className="hidden md:inline-flex bg-[#a87545] text-white px-6 py-3 rounded-lg font-black text-xs uppercase tracking-wide hover:bg-[#8f623a] transition whitespace-nowrap shadow-sm"
          >
            Reservar ahora
          </Link>

          <Link
            to="/#disponibilidad"
            className="lg:hidden bg-[#a87545] text-white px-4 py-2.5 rounded-lg font-black text-xs uppercase tracking-wide"
          >
            Reservar
          </Link>
        </nav>
      </header>

      {/* HERO */}
      <section id="inicio-turismo" className="relative scroll-mt-32">
        <div className="relative h-[610px] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=80"
            alt="Pimentel"
            className="absolute inset-0 w-full h-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[#2b1d12]/80 via-[#2b1d12]/45 to-transparent" />

          <div className="relative max-w-7xl mx-auto px-5 md:px-8 h-full flex items-center">
            <div className="max-w-2xl text-white">
              <p className="uppercase tracking-[0.28em] text-xs font-black text-white/80">
                Playa · Muelle · Atardecer
              </p>

              <h1 className="font-serif text-5xl md:text-7xl font-medium leading-[0.95] tracking-[-0.04em] mt-5">
                Conoce Pimentel.
              </h1>

              <p className="text-white/90 text-lg leading-relaxed mt-6 max-w-xl">
                Un balneario tranquilo para caminar frente al mar, visitar el
                muelle, disfrutar comida marina y descansar cerca de la playa.
              </p>

              <div className="flex flex-wrap gap-3 mt-8">
                <a
                  href="#atractivos"
                  className="bg-[#a87545] text-white px-8 py-4 rounded-lg font-black hover:bg-[#8f623a] transition"
                >
                  Descubrir Pimentel
                </a>

                <Link
                  to="/#disponibilidad"
                  className="bg-white/15 border border-white/30 text-white px-8 py-4 rounded-lg font-black hover:bg-white/25 transition"
                >
                  Consultar hospedaje
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* TARJETA FLOTANTE */}
        <div className="relative max-w-5xl mx-auto px-5 -mt-12 z-10">
          <div className="bg-white rounded-xl shadow-2xl border border-[#eadfce] p-5 md:p-6 grid md:grid-cols-4 gap-5">
            {[
              ["🌊", "Playa", "Ambiente costero"],
              ["🌉", "Muelle", "Lugar icónico"],
              ["🌅", "Atardecer", "Vista al mar"],
              ["🍽️", "Comida", "Sabores marinos"],
            ].map(([icon, title, text]) => (
              <div
                key={title}
                className="border-b md:border-b-0 md:border-r last:border-r-0 border-[#eadfce] pb-4 md:pb-0 md:pr-4"
              >
                <div className="text-3xl">{icon}</div>
                <p className="font-black text-[#2d261f] mt-2">{title}</p>
                <p className="text-sm text-[#6f6258] mt-1">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ATRACTIVOS */}
      <section
        id="atractivos"
        className="max-w-7xl mx-auto px-5 md:px-8 pt-24 pb-16 scroll-mt-32"
      >
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
          <div>
            <p className="uppercase tracking-[0.25em] text-xs font-black text-[#a87545]">
              Atractivos
            </p>

            <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-[-0.035em] text-[#2d261f] mt-2">
              Lugares para disfrutar
            </h2>
          </div>

          <p className="text-[#6f6258] max-w-xl leading-relaxed">
            Pimentel combina playa, muelle, malecón y espacios tranquilos para
            una estadía simple y agradable cerca al mar.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr_0.8fr] gap-5">
          {places.map((place) => (
            <article
              key={place.title}
              className={`relative overflow-hidden rounded-xl bg-cover bg-center border border-[#eadfce] min-h-[310px] shadow-sm ${
                place.large ? "lg:row-span-2 lg:min-h-[640px]" : ""
              }`}
              style={{ backgroundImage: `url(${place.image})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

              <div className="absolute left-6 right-6 bottom-6 z-10">
                <span className="inline-flex bg-[#a87545] text-white px-3 py-2 rounded-lg text-xs font-black mb-3">
                  {place.tag}
                </span>

                <h3 className="text-3xl font-black text-white">
                  {place.title}
                </h3>

                <p className="text-white/85 text-sm leading-relaxed mt-2">
                  {place.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* COMIDAS */}
      <section
        id="comidas"
        className="bg-white py-16 scroll-mt-32 border-y border-[#eadfce]"
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
            <div>
              <p className="uppercase tracking-[0.25em] text-xs font-black text-[#a87545]">
                Gastronomía
              </p>

              <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-[-0.035em] text-[#2d261f] mt-2">
                Sabores cerca al mar
              </h2>
            </div>

            <p className="text-[#6f6258] max-w-xl leading-relaxed">
              La visita a Pimentel también se disfruta con comida marina,
              platos frescos y sabores costeros.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {foods.map((food) => (
              <article
                key={food.title}
                className="bg-[#f7f1e8] rounded-xl border border-[#eadfce] overflow-hidden"
              >
                <img
                  src={food.image}
                  alt={food.title}
                  className="w-full h-52 object-cover"
                />

                <div className="p-5">
                  <h3 className="font-black text-[#2d261f] text-xl">
                    {food.title}
                  </h3>

                  <p className="text-sm text-[#6f6258] mt-2 leading-relaxed">
                    {food.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* EXPERIENCIAS */}
      <section
        id="experiencias"
        className="max-w-7xl mx-auto px-5 md:px-8 py-16 scroll-mt-32"
      >
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
          <div>
            <p className="uppercase tracking-[0.25em] text-xs font-black text-[#a87545]">
              Experiencias
            </p>

            <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-[-0.035em] text-[#2d261f] mt-2">
              Qué hacer en Pimentel
            </h2>
          </div>

          <p className="text-[#6f6258] max-w-xl leading-relaxed">
            Actividades simples para disfrutar la estadía sin salir del ambiente
            costero.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {experiences.map((item) => (
            <article
              key={item.title}
              className="bg-white border border-[#eadfce] rounded-xl p-7 shadow-sm"
            >
              <div className="w-14 h-14 rounded-xl bg-[#efe5d8] text-[#a87545] flex items-center justify-center text-2xl mb-5">
                {item.icon}
              </div>

              <h3 className="font-black text-[#2d261f] text-xl">
                {item.title}
              </h3>

              <p className="text-[#6f6258] leading-relaxed mt-3">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* RUTA */}
      <section
        id="ruta"
        className="bg-[#efe5d8] py-16 scroll-mt-32 border-y border-[#eadfce]"
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
            <div>
              <p className="uppercase tracking-[0.25em] text-xs font-black text-[#a87545]">
                Ruta sugerida
              </p>

              <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-[-0.035em] text-[#2d261f] mt-2">
                Un día en Pimentel
              </h2>
            </div>

            <p className="text-[#6f6258] max-w-xl leading-relaxed">
              Una ruta simple para que el visitante imagine cómo aprovechar su
              estadía cerca al mar.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {routeSteps.map((step) => (
              <article
                key={step.number}
                className="bg-white border border-[#eadfce] rounded-xl p-7 shadow-sm"
              >
                <div className="w-12 h-12 rounded-full bg-[#a87545] text-white flex items-center justify-center font-black mb-5">
                  {step.number}
                </div>

                <h3 className="font-black text-[#2d261f] text-xl">
                  {step.title}
                </h3>

                <p className="text-[#6f6258] leading-relaxed mt-3">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1800&q=80"
            alt="Hospedaje en Pimentel"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#2b1d12]/70" />
        </div>

        <div className="relative max-w-7xl mx-auto px-5 md:px-8 py-16">
          <div className="bg-white rounded-2xl border border-[#eadfce] p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-2xl">
            <div>
              <h2 className="font-serif text-4xl font-medium tracking-[-0.035em] text-[#2d261f]">
                Hospédate cerca al mar
              </h2>

              <p className="text-[#6f6258] mt-2 max-w-xl">
                Casa Huéspedes Pimentel es una opción cómoda para descansar y
                disfrutar una visita tranquila al balneario.
              </p>
            </div>

            <Link
              to="/#disponibilidad"
              className="bg-[#a87545] text-white rounded-lg px-8 py-4 font-black hover:bg-[#8f623a] transition text-center"
            >
              Consultar disponibilidad
            </Link>
          </div>
        </div>
      </section>

      {/* SOCIAL DOCK */}
      <div className="fixed left-5 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center gap-3 bg-[#fbf7ef]/95 border border-[#eadfce] rounded-full px-2 py-4 shadow-xl backdrop-blur-md">
        <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-black text-[#2d261f] tracking-[0.25em] uppercase">
          Síguenos
        </span>

        <a
          href="https://www.facebook.com/casadehuespedespimentel/?locale=es_LA"
          target="_blank"
          rel="noreferrer"
          aria-label="Facebook"
          className="w-11 h-11 rounded-full bg-[#2b1d12] text-white grid place-items-center font-black text-lg hover:bg-[#a87545] transition"
        >
          f
        </a>

        <a
          href="https://www.tiktok.com/@casahuespedespimentel"
          target="_blank"
          rel="noreferrer"
          aria-label="TikTok"
          className="w-11 h-11 rounded-full bg-[#2b1d12] text-white grid place-items-center font-black text-lg hover:bg-[#a87545] transition"
        >
          ♪
        </a>

        <a
          href="https://www.instagram.com/casahuespedes.pimentel/"
          target="_blank"
          rel="noreferrer"
          aria-label="Instagram"
          className="w-11 h-11 rounded-full bg-[#2b1d12] text-white grid place-items-center font-black text-lg hover:bg-[#a87545] transition"
        >
          ◎
        </a>
      </div>
    </main>
  );
}