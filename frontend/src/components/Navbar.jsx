import { Link } from "react-router-dom";

export default function Navbar() {
  const navLink =
    "relative text-xs font-black uppercase tracking-[0.16em] text-[#5f5147] hover:text-[#a87545] transition pb-2 after:absolute after:left-0 after:-bottom-0 after:h-[2px] after:w-0 after:bg-[#a87545] after:transition-all after:duration-300 hover:after:w-full";

  return (
    <header className="w-full sticky top-0 z-50 bg-[#fbf7ef]/90 backdrop-blur-xl border-b border-[#eadfce]/80 shadow-[0_10px_30px_rgba(43,29,18,0.05)]">
      <nav className="max-w-7xl mx-auto px-5 md:px-8 h-[78px] flex items-center justify-between gap-6">
        {/* LOGO */}
        <Link
          to="/#inicio"
          aria-label="Ir al inicio de Casa Huéspedes Pimentel"
          className="flex items-center shrink-0 group"
        >
          <div
            role="img"
            aria-label="Casa Huéspedes Pimentel"
            className="w-[105px] sm:w-[120px] h-[62px] bg-[#2b1d12] group-hover:-translate-y-0.5 transition"
            style={{
              WebkitMaskImage:
                'url("/img/brand/logo-casa-huespedes.png")',
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              WebkitMaskSize: "contain",
              maskImage:
                'url("/img/brand/logo-casa-huespedes.png")',
              maskRepeat: "no-repeat",
              maskPosition: "center",
              maskSize: "contain",
            }}
          />
        </Link>

        {/* NAVEGACIÓN PARA COMPUTADORAS */}
        <div className="hidden lg:flex items-center justify-center gap-7 flex-1">
          <Link to="/turismo#inicio-turismo" className={navLink}>
            Conoce Pimentel
          </Link>

          <Link
            to="/#inicio"
            className="relative text-xs font-black uppercase tracking-[0.16em] text-[#a87545] pb-2 after:absolute after:left-0 after:-bottom-0 after:h-[2px] after:w-full after:bg-[#a87545]"
          >
            Inicio
          </Link>

          {/* Abre Rooms.jsx */}
          <Link to="/habitaciones" className={navLink}>
            Habitaciones
          </Link>

          <Link to="/#servicios-extras" className={navLink}>
            Servicios
          </Link>
<Link to="/galeria" className={navLink}>
  Galería
</Link>

          <Link to="/#disponibilidad" className={navLink}>
            Reservas
          </Link>
        </div>

        {/* BOTÓN DE RESERVA PARA PANTALLAS GRANDES */}
        <div className="hidden xl:flex items-center gap-3">
          <Link
            to="/#disponibilidad"
            className="ml-2 bg-gradient-to-r from-[#a87545] to-[#7b4a1f] text-white px-6 py-3 rounded-full font-black text-xs uppercase tracking-[0.14em] hover:shadow-lg hover:-translate-y-0.5 transition whitespace-nowrap"
          >
            Reservar ahora
          </Link>
        </div>

        {/* NAVEGACIÓN PARA CELULAR Y TABLET */}
        <div className="flex xl:hidden items-center gap-2">
          {/* Abre Rooms.jsx */}
          <Link
            to="/habitaciones"
            className="hidden sm:inline-flex bg-white border border-[#eadfce] text-[#4b250f] px-4 py-2.5 rounded-full font-black text-xs uppercase tracking-wide"
          >
            Habitaciones
          </Link>

          <Link
            to="/#disponibilidad"
            className="bg-gradient-to-r from-[#a87545] to-[#7b4a1f] text-white px-4 py-2.5 rounded-full font-black text-xs uppercase tracking-wide"
          >
            Reservar
          </Link>
        </div>
      </nav>
    </header>
  );
}