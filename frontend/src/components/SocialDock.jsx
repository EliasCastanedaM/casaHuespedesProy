import { Link } from "react-router-dom";

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

export default function SocialDock() {
  const mensajeWhatsApp =
    "Hola, quisiera solicitar información sobre Casa de Huéspedes Pimentel.";

  const asuntoCorreo = encodeURIComponent(
    "Consulta sobre Casa de Huéspedes Pimentel"
  );

  const cuerpoCorreo = encodeURIComponent(
    "Hola, quisiera solicitar información sobre Casa de Huéspedes Pimentel."
  );

  return (
    <div className="fixed left-1/2 bottom-4 -translate-x-1/2 z-40 flex flex-row items-center gap-2 bg-[#fbf7ef]/95 border border-[#eadfce] rounded-full px-3 py-2 shadow-xl backdrop-blur-md lg:left-5 lg:top-1/2 lg:bottom-auto lg:translate-x-0 lg:-translate-y-1/2 lg:flex-col lg:gap-3 lg:px-2 lg:py-4">
      <span className="hidden lg:block [writing-mode:vertical-rl] rotate-180 text-[10px] font-black text-[#2d261f] tracking-[0.25em] uppercase">
        Contáctanos
      </span>

      {/* Inicio */}
      <Link
        to="/#inicio"
        aria-label="Ir al inicio"
        title="Inicio"
        className="w-11 h-11 rounded-full bg-[#2b1d12] text-white grid place-items-center hover:bg-[#a87545] transition"
      >
        <DockIcon type="home" />
      </Link>

      {/* Correo */}
      <a
        href={`mailto:casadehuespedespimentel2023@gmail.com?subject=${asuntoCorreo}&body=${cuerpoCorreo}`}
        aria-label="Enviar correo"
        title="Enviar correo"
        className="w-11 h-11 rounded-full bg-[#2b1d12] text-white grid place-items-center hover:bg-[#a87545] transition"
      >
        <DockIcon type="mail" />
      </a>

      {/* WhatsApp */}
      <a
        href={`https://wa.me/51901551287?text=${encodeURIComponent(
          mensajeWhatsApp
        )}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Contactar por WhatsApp"
        title="WhatsApp"
        className="w-11 h-11 rounded-full bg-[#25D366] text-white grid place-items-center hover:bg-[#1faf54] transition"
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
        className="w-11 h-11 rounded-full bg-[#2b1d12] text-white grid place-items-center hover:bg-[#a87545] transition"
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
        className="w-11 h-11 rounded-full bg-[#2b1d12] text-white grid place-items-center hover:bg-[#a87545] transition"
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
        className="w-11 h-11 rounded-full bg-[#2b1d12] text-white grid place-items-center hover:bg-[#a87545] transition"
      >
        <DockIcon type="instagram" />
      </a>
    </div>
  );
}