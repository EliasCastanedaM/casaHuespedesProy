import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Evita problemas con rutas terminadas en "/"
  const currentPath = location.pathname.replace(/\/+$/, "") || "/";

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen]);

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

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <header className="w-full sticky top-0 z-50 bg-[#fbf7ef]/90 backdrop-blur-xl border-b border-[#eadfce]/80 shadow-[0_10px_30px_rgba(43,29,18,0.05)]">
      <nav className="relative max-w-7xl mx-auto px-5 md:px-8 h-[78px] flex items-center justify-between gap-6">
        {/* LOGO */}
        <Link
          to="/#inicio"
          aria-label="Ir al inicio de Casa Huéspedes Pimentel"
          className="flex items-center shrink-0 group"
          onClick={closeMobileMenu}
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

          <Link to="/#inicio" className={navLink("/")}>
            Inicio
          </Link>

          <Link to="/habitaciones" className={navLink("/habitaciones")}>
            Habitaciones
          </Link>

          <Link to="/galeria" className={navLink("/galeria")}>
            Galería
          </Link>
        </div>

        {/* NAVEGACIÓN PARA CELULAR Y TABLET */}
        <div className="flex lg:hidden items-center gap-2">
          <Link
            to="/habitaciones"
            onClick={closeMobileMenu}
            className="hidden sm:inline-flex bg-white border border-[#eadfce] text-[#4b250f] px-4 py-2.5 rounded-full font-black text-xs uppercase tracking-wide"
          >
            Habitaciones
          </Link>

          <button
            type="button"
            aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#eadfce] bg-white text-[#4b250f] shadow-sm transition hover:border-[#d9b48f] hover:text-[#a87545] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a87545] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbf7ef]"
          >
            <span className="sr-only">
              {isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            </span>
            <span className="flex w-5 flex-col gap-1.5" aria-hidden="true">
              <span
                className={`block h-0.5 w-5 bg-current transition-transform ${
                  isMobileMenuOpen ? "translate-y-2 rotate-45" : ""
                }`}
              />
              <span
                className={`block h-0.5 w-5 bg-current transition-opacity ${
                  isMobileMenuOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`block h-0.5 w-5 bg-current transition-transform ${
                  isMobileMenuOpen ? "-translate-y-2 -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>

        <div
          id="mobile-navigation"
          className={`absolute left-0 right-0 top-full lg:hidden border-t border-[#eadfce] bg-[#fbf7ef] shadow-[0_18px_35px_rgba(43,29,18,0.12)] transition-[opacity,transform,visibility] duration-200 ${
            isMobileMenuOpen
              ? "visible translate-y-0 opacity-100"
              : "invisible -translate-y-2 opacity-0 pointer-events-none"
          }`}
        >
          <div className="mx-auto flex max-h-[calc(100vh-78px)] max-w-7xl flex-col overflow-y-auto px-5 py-4 md:px-8">
            <Link
              to="/turismo#inicio-turismo"
              onClick={closeMobileMenu}
              className="border-b border-[#eadfce] py-3 text-sm font-black uppercase tracking-[0.14em] text-[#5f5147] transition hover:text-[#a87545]"
            >
              Conoce Pimentel
            </Link>
            <Link
              to="/#inicio"
              onClick={closeMobileMenu}
              className="border-b border-[#eadfce] py-3 text-sm font-black uppercase tracking-[0.14em] text-[#5f5147] transition hover:text-[#a87545]"
            >
              Inicio
            </Link>
            <Link
              to="/habitaciones"
              onClick={closeMobileMenu}
              className="border-b border-[#eadfce] py-3 text-sm font-black uppercase tracking-[0.14em] text-[#5f5147] transition hover:text-[#a87545]"
            >
              Habitaciones
            </Link>
            <Link
              to="/galeria"
              onClick={closeMobileMenu}
              className="py-3 text-sm font-black uppercase tracking-[0.14em] text-[#5f5147] transition hover:text-[#a87545]"
            >
              Galería
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
