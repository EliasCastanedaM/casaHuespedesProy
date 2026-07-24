import { useState } from "react";
import { Link } from "react-router-dom";
import "./Home.css";

const includedServices = [
  {
    icon: "☕",
    title: "Cafetería",
    description: "Espacio cómodo para iniciar el día durante la estadía.",
  },
  {
    icon: "🚿",
    title: "Baño privado",
    description: "Habitaciones con baño privado para mayor comodidad.",
  },
  {
    icon: "📶",
    title: "WiFi",
    description: "Conectividad disponible para huéspedes.",
  },
  {
    icon: "🌅",
    title: "Terraza",
    description: "Terraza con vista al mar para disfrutar Pimentel.",
  },
];

const extraServices = [
  {
    title: "Cocina para uso de Huéspedes",
    image: "https://www.casahuespedespimentel.com/wp-content/uploads/elementor/thumbs/WhatsApp-Image-2026-01-29-at-9.49.51-AM-3-rji065r0by8iez82rkb1evh747e3vj68wquxlxyw48.jpeg",
    alt: "Cocina disponible en Casa Huéspedes Pimentel",
    description:
      "Espacio disponible para que los huéspedes puedan preparar sus alimentos, previa coordinación.",
  },
  {
    title: "Lavado y planchado",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_pyP3gWez8kIDJJAhu_ENU5VWF5rdfhW3eUWRXzNrxQ&s=10",
    alt: "Servicio de lavado y planchado de Casa Huéspedes Pimentel",
    description:
      "Servicio adicional de lavado y planchado disponible previa coordinación con el hospedaje.",
  },
  {
    title: "Movilidad y estacionamiento",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTu5InvjMrkiLLGxwyUPvryBqhKGVzenaO21qn4U6GGHg&s=10",
    alt: "Ingreso y orientación de estacionamiento en Casa Huéspedes Pimentel",
    description:
      "Orientación sobre movilidad local, servicios de taxi y estacionamiento cercano al hospedaje.",
  },
];

const galleryImages = [
  {
    src: "/img/galeria/galeria-1.jpg",
    alt: "Fachada de Casa Huéspedes Pimentel",
  },
  {
    src: "/img/galeria/galeria-2.jpg",
    alt: "Habitación de Casa Huéspedes Pimentel",
  },
  {
    src: "/img/galeria/galeria-3.jpg",
    alt: "Espacios comunes de Casa Huéspedes Pimentel",
  },
  {
    src: "/img/galeria/galeria-4.jpg",
    alt: "Vista desde Casa Huéspedes Pimentel",
  },
];

const ROOM_DETAILS = {
  101: {
    name: "Habitación Matrimonial #101",
    roomType: "Matrimonial",
    floorLabel: "Primer piso",
    floorNumber: 1,
    bedType: "1 cama de dos plazas",
    capacity: 2,
    description:
      "Habitación matrimonial ubicada en el primer piso, preparada para 2 personas y equipada con baño privado.",
    locationDetail: "Ubicada en el primer piso.",
    amenities: [
      "Baño privado",
      "Ducha con agua fría y caliente",
      "Smart TV",
      "Ventilador",
      "Veladores",
      "Ropero",
    ],
  },
  201: {
    name: "Habitación Doble #201",
    roomType: "Doble",
    floorLabel: "Segundo piso",
    floorNumber: 2,
    bedType: "2 camas de plaza y media",
    capacity: 2,
    description:
      "Habitación doble ubicada en el segundo piso, con dos camas de plaza y media y capacidad para 2 personas.",
    locationDetail: "Ubicada en el segundo piso.",
    amenities: [
      "Baño privado",
      "Smart TV",
      "Ventilador",
      "Mesa de noche",
      "Ropero",
    ],
  },
  202: {
    name: "Habitación Triple #202",
    roomType: "Triple",
    floorLabel: "Segundo piso",
    floorNumber: 2,
    bedType: "3 camas de plaza y media",
    capacity: 3,
    description:
      "Habitación triple ubicada en el segundo piso, con tres camas de plaza y media y capacidad para 3 personas.",
    locationDetail: "Ubicada en el segundo piso.",
    amenities: ["Baño privado", "Smart TV", "Ventilador", "Ropero"],
  },
  203: {
    name: "Habitación Familiar #203",
    roomType: "Familiar",
    floorLabel: "Segundo piso",
    floorNumber: 2,
    bedType: "2 camas de dos plazas y 3 camas de plaza y media",
    capacity: 7,
    description:
      "Habitación familiar ubicada en el segundo piso. Cuenta con cinco camas y capacidad máxima para 7 personas.",
    locationDetail: "Ubicada en el segundo piso.",
    amenities: ["Baño privado", "Smart TV", "Ventiladores", "Ropero"],
  },
  205: {
    name: "Habitación Matrimonial #205",
    roomType: "Matrimonial",
    floorLabel: "Segundo piso",
    floorNumber: 2,
    bedType: "1 cama de dos plazas",
    capacity: 2,
    description:
      "Habitación matrimonial ubicada en el segundo piso, con una cama de dos plazas y capacidad para 2 personas.",
    locationDetail: "Ubicada en el segundo piso.",
    amenities: [
      "Baño privado",
      "Smart TV",
      "Ventilador",
      "Mesa de noche",
      "Ropero",
    ],
  },
  301: {
    name: "Habitación Doble #301",
    roomType: "Doble",
    floorLabel: "Tercer piso",
    floorNumber: 3,
    bedType: "2 camas de plaza y media",
    capacity: 2,
    description:
      "Habitación doble ubicada en el tercer piso, con dos camas de plaza y media y capacidad para 2 personas.",
    locationDetail: "Ubicada en el tercer piso.",
    amenities: [
      "Baño privado",
      "Smart TV",
      "Ventilador",
      "Mesa de noche",
      "Ropero",
    ],
  },
  302: {
    name: "Habitación Triple #302",
    roomType: "Triple",
    floorLabel: "Tercer piso",
    floorNumber: 3,
    bedType: "3 camas de plaza y media",
    capacity: 3,
    description:
      "Habitación triple ubicada en el tercer piso, con tres camas de plaza y media y capacidad para 3 personas.",
    locationDetail: "Ubicada en el tercer piso.",
    amenities: ["Baño privado", "Smart TV", "Ropero", "Velador"],
  },
  303: {
    name: "Habitación Triple #303",
    roomType: "Triple",
    floorLabel: "Tercer piso",
    floorNumber: 3,
    bedType: "3 camas de plaza y media",
    capacity: 3,
    description:
      "Habitación triple ubicada en el tercer piso, con tres camas de plaza y media y capacidad para 3 personas.",
    locationDetail: "Ubicada en el tercer piso.",
    amenities: ["Baño privado", "Smart TV", "Ventilador", "Ropero"],
  },
  304: {
    name: "Habitación Matrimonial #304",
    roomType: "Matrimonial",
    floorLabel: "Tercer piso",
    floorNumber: 3,
    bedType: "1 cama de dos plazas",
    capacity: 2,
    description:
      "Habitación matrimonial ubicada en el tercer piso, con una cama de dos plazas y capacidad para 2 personas.",
    locationDetail: "Ubicada en el tercer piso.",
    amenities: ["Baño privado", "Smart TV", "Ventilador"],
  },
  305: {
    name: "Habitación Matrimonial #305",
    roomType: "Matrimonial",
    floorLabel: "Tercer piso",
    floorNumber: 3,
    bedType: "1 cama de dos plazas",
    capacity: 2,
    description:
      "Habitación matrimonial ubicada en el tercer piso, con una cama de dos plazas y capacidad para 2 personas.",
    locationDetail: "Ubicada en el tercer piso.",
    amenities: ["Baño privado", "Smart TV", "Ventilador", "Velador", "Ropero"],
  },
  405: {
    name: "Habitación Familiar #405",
    roomType: "Familiar",
    floorLabel: "Terraza",
    floorNumber: 4,
    bedType: "1 cama de dos plazas y 3 camas de plaza y media",
    capacity: 5,
    description:
      "Habitación familiar ubicada en la terraza, con cuatro camas y capacidad máxima para 5 personas.",
    locationDetail: "Ubicada en la terraza.",
    hasTerrace: true,
    amenities: [
      "Baño privado",
      "Smart TV",
      "Ropero",
      "Velador",
      "Ubicación en terraza",
    ],
  },
  407: {
    name: "Habitación Triple #407",
    roomType: "Triple",
    floorLabel: "Segundo piso",
    floorNumber: 2,
    bedType: "3 camas de plaza y media",
    capacity: 3,
    description:
      "Habitación triple ubicada en el segundo piso, con tres camas de plaza y media y capacidad para 3 personas.",
    locationDetail: "Ubicada en el segundo piso.",
    amenities: ["Baño privado", "Smart TV", "Ventilador", "Ropero"],
  },
  505: {
    name: "Habitación Matrimonial #505",
    roomType: "Matrimonial",
    floorLabel: "Quinto piso",
    floorNumber: 5,
    bedType: "1 cama de dos plazas",
    capacity: 2,
    description:
      "Habitación matrimonial ubicada en el quinto piso, con una cama de dos plazas y capacidad para 2 personas.",
    locationDetail: "Ubicada en el quinto piso.",
    amenities: ["Baño privado", "Smart TV", "Ropero", "Mesas de noche"],
  },
};

const HOUSE_FLOORS = [
  {
    number: 5,
    label: "Quinto piso",
    rooms: ["505"],
  },
  {
    number: 4,
    label: "Terraza",
    rooms: ["405"],
  },
  {
    number: 3,
    label: "Tercer piso",
    rooms: ["301", "302", "303", "304", "305"],
  },
  {
    number: 2,
    label: "Segundo piso",
    rooms: ["201", "202", "203", "205", "407"],
  },
  {
    number: 1,
    label: "Primer piso",
    rooms: ["101"],
  },
];

export default function Home() {
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  return (
    <main className="home-page">
      {/* HERO */}
      <section id="inicio" className="hotel-hero scroll-mt-32">
        <div className="hotel-hero-image">
          <video
            className="hotel-hero-video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRkHdw5hzGtHMnAH_fmaZXxD6XIvDdJFRQkP5tack1E0BG9rSwu4THaP9mj&s=10"
            aria-hidden="true"
          >
            <source src="/videos/pimentel.mp4" type="video/mp4" />
            Tu navegador no puede reproducir este video.
          </video>

          <div className="hotel-hero-overlay" />

          <div className="home-section hotel-hero-content">
            <div className="hotel-hero-text">
              <p className="hotel-hero-kicker">Descanso · Playa · Pimentel</p>

              <h1 className="hotel-hero-main-title">
                Un refugio cerca al mar:
                <span>Casa Huéspedes Pimentel</span>
              </h1>

              <p>
                Habitaciones de acuerdo a tus necesidades, atención familiar y
                una estadía tranquila para disfrutar el balneario de Pimentel.
              </p>

              <div className="hotel-hero-actions">
                <Link to="/habitaciones" className="hotel-btn-primary">
                  Reservar ahora
                </Link>

                <Link to="/habitaciones" className="hotel-btn-light">
                  Ver habitaciones
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* POR QUÉ VIAJAR A PIMENTEL */}
      <StoryVideoSection
        id="por-que-pimentel"
        eyebrow="Destino"
        title="Viaje a Pimentel"
        description="Disfruta de la tranquilidad de Pimentel, un destino ideal para caminar junto al mar, visitar su emblemático muelle y descubrir restaurantes donde podrás disfrutar lo mejor de la gastronomía peruana.
        Pimentel es un encantador balneario ubicado en la costa norte del Perú, en el departamento de Lambayeque. Destaca por sus hermosas playas, su tradicional muelle y su ambiente tranquilo, ideal para descansar y disfrutar de la riqueza cultural y gastronómica de la región.
        "
        videoSrc="/videos/pimentel.mp4"
        poster="https://www.caminoincamachu.com/wp-content/uploads/2024/03/playa-pimentel-1.jpg"
      />

      {/* POR QUÉ HOSPEDARSE */}
      <StoryVideoSection
        id="nosotros"
        eyebrow="Hospedaje"
        title="¿Por qué hospedarse en Casa Huéspedes Pimentel?"
        description="Porque tendrás una estadía sencilla, cómoda y cercana al mar. Casa Huéspedes Pimentel ofrece habitaciones funcionales, atención directa y una ubicación pensada para descansar durante tu visita."
        videoSrc="/videos/casa-huespedes.mp4"
        reverse
        poster="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNgk5I02gkcVtGTCcBFDQw7JPuzaGrK-w26uUyhTMgTQ&s=10"
      />

      {/* CÓMO LLEGAR */}
      <HowToGetThereSection videoSrc="/videos/como-llegar.mp4" />

      {/* SERVICIOS DESTACADOS */}
      <section id="servicios-incluidos" className="hotel-services-strip">
        <div className="home-section hotel-services-grid">
          {includedServices.map((service) => (
            <article key={service.title} className="hotel-service-item">
              <div className="hotel-service-icon">{service.icon}</div>

              <div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* GALERÍA Y TESTIMONIO */}
      <section
        id="galeria"
        className="home-section hotel-gallery-section scroll-mt-32"
      >
        <div>
          <p className="hotel-eyebrow">Galería</p>

          <h2 className="hotel-title hotel-gallery-title">
            Espacios que invitan a quedarse
          </h2>
        </div>

        <div className="hotel-gallery-grid">
          {galleryImages.map((image) => (
            <img
              key={image.src}
              src={image.src}
              alt={image.alt}
              loading="lazy"
            />
          ))}
        </div>

        <div className="hotel-testimonial">
          <p className="hotel-eyebrow">Testimonio</p>

          <p className="hotel-testimonial-text">
            “Un lugar tranquilo para descansar y disfrutar Pimentel. La atención
            fue cercana y la estadía muy cómoda.”
          </p>

          <p className="hotel-testimonial-name">Huésped visitante</p>
          <p className="hotel-testimonial-place">Casa Huéspedes Pimentel</p>
        </div>
      </section>

      {/* EXTRAS */}
      <section
        id="servicios-extras"
        className="hotel-extras-section scroll-mt-32"
      >
        <div className="home-section">
          <div className="hotel-section-header">
            <div>
              <p className="hotel-eyebrow">Servicios</p>

              <h2 className="hotel-title">Servicios extras</h2>
            </div>

            <p className="hotel-section-description">
              Servicios adicionales coordinados directamente con el hospedaje,
              según disponibilidad.
            </p>
          </div>

          <div className="hotel-extra-grid">
            {extraServices.map((service) => (
              <article key={service.title} className="hotel-extra-card">
                <img src={service.image} alt={service.title} />

                <div>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="hotel-cta">
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1800&auto=format&fit=crop"
          alt="Pimentel"
        />

        <div className="home-section hotel-cta-content">
          <div className="hotel-cta-card">
            <div>
              <h2 className="hotel-title">¿Listo para visitar Pimentel?</h2>

              <p>
                Conoce nuestras habitaciones y elige el espacio ideal para tu
                próxima estadía.
              </p>
            </div>

            <Link to="/habitaciones" className="hotel-btn-primary">
              Ver habitaciones
            </Link>
          </div>
        </div>
      </section>

      <HouseConcept />

      <SocialDock />

      <FloatingSupportWidget
        isOpen={isSupportOpen}
        onOpen={() => setIsSupportOpen(true)}
        onClose={() => setIsSupportOpen(false)}
      />
    </main>
  );
}

function StoryVideoSection({
  id,
  eyebrow,
  title,
  description,
  videoSrc,
  poster,
  reverse = false,
}) {
  return (
    <section
      id={id}
      className={`home-section hotel-story-section scroll-mt-32 ${reverse ? "hotel-story-section-reverse" : ""
        }`}
    >
      <div className="hotel-story-copy">
        <p className="hotel-eyebrow">{eyebrow}</p>

        <h2 className="hotel-title hotel-story-title">{title}</h2>

        <p>{description}</p>
      </div>

      <div className="hotel-video-frame">
        <video controls muted playsInline poster={poster}>
          <source src={videoSrc} type="video/mp4" />
          Tu navegador no puede reproducir este video.
        </video>
      </div>
    </section>
  );
}

function HowToGetThereSection({ videoSrc }) {
  const latitude = -6.836223132813942;
  const longitude = -79.93713663068512;
  const googleMapsEmbedUrl = `https://www.google.com/maps?q=${latitude},${longitude}&z=17&output=embed`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  return (
    <section
      id="como-llegar"
      className="home-section scroll-mt-32 pb-16 pt-8 lg:pb-24 lg:pt-12"
    >
      <div className="mx-auto mb-10 max-w-3xl text-center lg:mb-14">
        <p className="hotel-eyebrow">Ubicación</p>

        <h2 className="hotel-title hotel-story-title mt-3">
          ¿Cómo llegar a Casa de Huéspedes Pimentel?
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#6f6257]">
          Conoce nuestra ubicación y planifica tu llegada de manera sencilla.
          Revisa el video o abre el mapa para obtener indicaciones desde tu
          ubicación.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <article className="overflow-hidden rounded-[28px] border border-[#eadfce] bg-white shadow-[0_18px_50px_rgba(43,33,24,0.10)]">
          <div className="aspect-video overflow-hidden bg-[#2b2118]">
            <video
              className="h-full w-full object-cover"
              controls
              muted
              playsInline
              preload="metadata"
              poster="https://lh3.googleusercontent.com/gps-cs-s/AHRPTWnIW04XObA4w_sLFpFazaqVZjuWjTnTv9stcaizVWyN3NX05tDQ5rhJzFqVd7FT9N6Ro8EKNn3pKusyTkOff-bVCmxNxrQ6mYuqqogUKdCahS2x8U_ioHj78CGX9vtvrqCs0o9BnUlak2hs=s1360-w1360-h1020-rw"
            >
              <source src={videoSrc} type="video/mp4" />
              Tu navegador no puede reproducir este video.
            </video>
          </div>

          <div className="p-6 lg:p-7">
            <h3 className="text-xl font-black text-[#2b2118]">
              Mira cómo llegar
            </h3>
            <p className="mt-2 leading-7 text-[#6f6257]">
              Sigue el recorrido del video para reconocer los principales puntos
              de referencia antes de tu llegada.
            </p>
          </div>
        </article>

        <article className="overflow-hidden rounded-[28px] border border-[#eadfce] bg-white shadow-[0_18px_50px_rgba(43,33,24,0.10)]">
          <div className="aspect-video overflow-hidden bg-[#eee7dc]">
            <iframe
              className="h-full w-full border-0"
              src={googleMapsEmbedUrl}
              title="Ubicación de Casa de Huéspedes Pimentel en Google Maps"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between lg:p-7">
            <div>
              <h3 className="text-xl font-black text-[#2b2118]">
                Nuestra ubicación
              </h3>
              <p className="mt-2 leading-7 text-[#6f6257]">
                Consulta la ruta más conveniente desde donde te encuentres.
              </p>
            </div>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#2b1d12] px-5 py-3 text-sm font-black text-white transition hover:bg-[#a87545]"
            >
              Abrir en Maps
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </article>
      </div>
    </section>
  );
}

function HouseConcept() {
  return (
    <section
      id="distribucion-casa"
      className="scroll-mt-28 bg-[#f7f0e6] px-4 py-12 sm:px-6 sm:py-14 md:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="hotel-eyebrow">Distribución referencial</p>

          <h2 className="hotel-title mt-2">
            Habitaciones por piso
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#6f6257] sm:text-base">
            Consulta rápidamente dónde se encuentra cada habitación dentro de
            Casa Huéspedes Pimentel.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-5xl">
          {/* Techo más pequeño para que el edificio pueda verse completo */}
          <div
            aria-hidden="true"
            className="mx-auto h-12 w-[94%] bg-[#7b4a1f] [clip-path:polygon(50%_0,100%_100%,0_100%)] sm:h-16"
          />

          <div className="overflow-hidden rounded-b-2xl border-x-[5px] border-b-[5px] border-[#7b4a1f] bg-[#7b4a1f] shadow-[0_22px_55px_rgba(43,29,18,0.18)]">
            {HOUSE_FLOORS.map((floor) => (
              <section
                key={floor.number}
                className="grid gap-3 border-b border-[#decbb4] bg-[#fbf7ef] p-3 last:border-b-0 md:grid-cols-[125px_minmax(0,1fr)] md:items-center"
              >
                {/* Nombre del piso */}
                <div className="flex items-center justify-between gap-3 md:block">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#a87545]">
                      Nivel {floor.number}
                    </span>

                    <h3 className="mt-0.5 text-base font-black text-[#2b1d12]">
                      {floor.label}
                    </h3>
                  </div>

                  <span className="w-fit rounded-full bg-[#efe1cf] px-2.5 py-1 text-[10px] font-black text-[#7b4a1f] md:mt-2 md:inline-flex">
                    {floor.rooms.length} hab.
                  </span>
                </div>

                {/* Habitaciones compactas */}
                <div
                  className={`grid gap-2 ${
                    floor.rooms.length === 1
                      ? "grid-cols-1 sm:max-w-[245px]"
                      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
                  }`}
                >
                  {floor.rooms.map((roomNumber) => {
                    const room = ROOM_DETAILS[roomNumber];

                    return (
                      <article
                        key={roomNumber}
                        className="relative min-w-0 overflow-hidden rounded-xl border border-[#decbb4] bg-white px-3 py-2.5 shadow-[0_6px_16px_rgba(43,29,18,0.06)]"
                      >
                        <div className="absolute right-0 top-0 h-8 w-8 rounded-bl-full bg-[#a87545]/15" />

                        <div className="relative flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="block text-[8px] font-black uppercase tracking-[0.14em] text-[#a87545]">
                              Habitación {roomNumber}
                            </span>

                            <h4 className="mt-0.5 truncate text-sm font-black text-[#2b1d12]">
                              {room.roomType}
                            </h4>
                          </div>
                        </div>

                        <p
                          className="mt-1 truncate text-[10px] text-[#6f6257]"
                          title={room.bedType}
                        >
                          {room.bedType}
                        </p>

                        <div className="mt-2 flex items-center justify-between gap-2 border-t border-[#eee2d4] pt-2 text-[9px] font-bold text-[#5f5147]">
                          <span>Hasta {room.capacity}</span>
                          <span>Baño privado</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}

            <div className="bg-[#7b4a1f] px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-[0.18em] text-white">
              Casa Huéspedes Pimentel
            </div>
          </div>
        </div>

        <div className="mt-7 text-center">
          <Link
            to="/habitaciones"
            className="inline-flex items-center justify-center rounded-full bg-[#2b1d12] px-6 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5 hover:bg-[#a87545]"
          >
            Conocer las habitaciones
            <span className="ml-2" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

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
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

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
    <div className="fixed left-1/2 bottom-4 -translate-x-1/2 z-40 flex flex-row items-center gap-2 bg-[#fbf7ef]/95 border border-[#eadfce] rounded-full px-3 py-2 shadow-xl backdrop-blur-md lg:left-5 lg:top-1/2 lg:bottom-auto lg:translate-x-0 lg:-translate-y-1/2 lg:flex-col lg:gap-3 lg:px-2 lg:py-4">
      <span className="hidden lg:block [writing-mode:vertical-rl] rotate-180 text-[10px] font-black text-[#2d261f] tracking-[0.25em] uppercase">
        Contáctanos
      </span>

      {/* Casa de Huéspedes - página principal */}
      <Link
        to="/"
        aria-label="Ir a Casa de Huéspedes Pimentel"
        title="Casa de Huéspedes Pimentel"
        className="w-11 h-11 rounded-full bg-[#2b1d12] text-white grid place-items-center text-xl hover:bg-[#a87545] transition"
      >
        <DockIcon type="home" />
      </Link>

      {/* Correo */}
      <a
        href={`mailto:casadehuespedespimentel2023@gmail.com?subject=${asuntoCorreo}&body=${cuerpoCorreo}`}
        aria-label="Enviar correo"
        title="Enviar correo"
        className="w-11 h-11 rounded-full bg-[#2b1d12] text-white grid place-items-center text-xl hover:bg-[#a87545] transition"
      >
        <DockIcon type="mail" />
      </a>

      {/* WhatsApp */}
      <a
        href={`https://wa.me/51901551287?text=${encodeURIComponent(
          mensajeWhatsApp,
        )}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Contactar por WhatsApp"
        title="Contactar por WhatsApp"
        className="w-11 h-11 rounded-full bg-[#25D366] text-white grid place-items-center font-black text-lg hover:bg-[#1faf54] transition"
      >
        <DockIcon type="whatsapp" />
      </a>

      {/* Facebook */}
      <a
        href="https://www.facebook.com/casadehuespedespimentel/?locale=es_LA"
        target="_blank"
        rel="noreferrer"
        aria-label="Facebook"
        title="Facebook"
        className="w-11 h-11 rounded-full bg-[#2b1d12] text-white grid place-items-center font-black text-lg hover:bg-[#a87545] transition"
      >
        <DockIcon type="facebook" />
      </a>

      {/* TikTok */}
      <a
        href="https://www.tiktok.com/@casahuespedespimentel"
        target="_blank"
        rel="noreferrer"
        aria-label="TikTok"
        title="TikTok"
        className="w-11 h-11 rounded-full bg-[#2b1d12] text-white grid place-items-center font-black text-lg hover:bg-[#a87545] transition"
      >
        <DockIcon type="tiktok" />
      </a>

      {/* Instagram */}
      <a
        href="https://www.instagram.com/casahuespedes.pimentel/"
        target="_blank"
        rel="noreferrer"
        aria-label="Instagram"
        title="Instagram"
        className="w-11 h-11 rounded-full bg-[#2b1d12] text-white grid place-items-center font-black text-lg hover:bg-[#a87545] transition"
      >
        <DockIcon type="instagram" />
      </a>
    </div>
  );
}

function FloatingSupportWidget({ isOpen, onOpen, onClose }) {
  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={onOpen}
          className="hotel-floating-btn"
          aria-label="Abrir atención al cliente"
        >
          💬
        </button>
      )}

      {isOpen && (
        <div className="hotel-support-card">
          <button
            type="button"
            onClick={onClose}
            className="hotel-support-close"
            aria-label="Cerrar atención al cliente"
          >
            ×
          </button>

          <div className="hotel-support-header">
            <h3>¿Necesitas ayuda?</h3>
            <p>Escríbenos por WhatsApp para recibir más información.</p>
          </div>

          <div className="hotel-support-body">
            <a
              href="https://wa.me/51901551287?text=Hola,%20quiero%20recibir%20información%20sobre%20Casa%20Huéspedes%20Pimentel"
              target="_blank"
              rel="noreferrer"
              className="hotel-whatsapp-button"
            >
              Escribir por WhatsApp
            </a>
          </div>
        </div>
      )}
    </>
  );
}
