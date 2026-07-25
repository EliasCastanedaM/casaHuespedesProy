import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();

  // Evita problemas con rutas terminadas en "/"
  const currentPath =
    location.pathname.replace(/\/+$/, "") || "/";

  const navLink = (path) => {
    const isActive = currentPath === path;

    return `
      relative
      text-xs
      font-black
      uppercase
      tracking-[0.16em]
      pb-2
      transition-colors
      duration-300

      after:absolute
      after:left-0
      after:bottom-0
      after:h-[2px]
      after:bg-[#a87545]
      after:transition-all
      after:duration-300

      ${
        isActive
          ? "text-[#a87545] after:w-full"
          : "text-[#5f5147] after:w-0 hover:text-[#a87545] hover:after:w-full"
      }
    `;
  };

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
            className="w-[105px] sm:w-[120px] h-[62px] bg-[#2b1d12] group-hover:-translate-y-0.5 transition-transform"
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
          <Link
            to="/turismo#inicio-turismo"
            className={navLink("/turismo")}
          >
            Conoce Pimentel
          </Link>

          <Link
            to="/#inicio"
            className={navLink("/")}
          >
            Inicio
          </Link>

          <Link
            to="/habitaciones"
            className={navLink("/habitaciones")}
          >
            Habitaciones
          </Link>

          <Link
            to="/galeria"
            className={navLink("/galeria")}
          >
            Galería
          </Link>
        </div>

        {/* NAVEGACIÓN PARA CELULAR Y TABLET */}
        <div className="flex lg:hidden items-center gap-2">
          <Link
            to="/habitaciones"
            className="hidden sm:inline-flex bg-white border border-[#eadfce] text-[#4b250f] px-4 py-2.5 rounded-full font-black text-xs uppercase tracking-wide"
          >
            Habitaciones
          </Link>
        </div>
      </nav>
    </header>
  );
}