import { Link } from "react-router-dom";

// Este componente muestra el pie de página de la web pública
export default function Footer() {
  return (
    <footer className="bg-[#2b1d12] text-white">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-12">
        <div className="grid md:grid-cols-[1.2fr_0.8fr_0.8fr_1fr] gap-10">
          {/* Marca */}
          <div>
            <a href="/#inicio" className="inline-flex items-center gap-3">
              <div className="w-12 h-12 rounded-full border border-[#a87545] text-[#d9b48f] flex items-center justify-center font-black">
                CH
              </div>

              <div>
                <h3 className="font-black text-lg leading-tight">
                  Casa Huéspedes
                </h3>
                <p className="text-sm text-white/60">Pimentel</p>
              </div>
            </a>

            <p className="text-sm text-white/65 leading-relaxed mt-5 max-w-sm">
              Hospedaje cómodo para descansar cerca al mar, visitar Pimentel y
              disfrutar una estadía tranquila en Lambayeque.
            </p>
          </div>

          {/* Navegación */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-[#d9b48f] mb-5">
              Navegación
            </h3>

            <ul className="space-y-3 text-sm text-white/70">
              <li>
                <a href="/#inicio" className="hover:text-[#d9b48f] transition">
                  Inicio
                </a>
              </li>
              <li>
                <a
                  href="/#habitaciones"
                  className="hover:text-[#d9b48f] transition"
                >
                  Habitaciones
                </a>
              </li>
              <li>
                <a
                  href="/#disponibilidad"
                  className="hover:text-[#d9b48f] transition"
                >
                  Reservas
                </a>
              </li>
              <li>
                <a
                  href="/#servicios-extras"
                  className="hover:text-[#d9b48f] transition"
                >
                  Servicios
                </a>
              </li>
            </ul>
          </div>

          {/* Experiencias */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-[#d9b48f] mb-5">
              Experiencias
            </h3>

            <ul className="space-y-3 text-sm text-white/70">
              <li>
                <Link
                  to="/turismo#inicio-turismo"
                  className="hover:text-[#d9b48f] transition"
                >
                  Conoce Lambayeque
                </Link>
              </li>
              <li>
                <a
                  href="/#galeria"
                  className="hover:text-[#d9b48f] transition"
                >
                  Galería
                </a>
              </li>
              <li>
                <a
                  href="/#servicios-extras"
                  className="hover:text-[#d9b48f] transition"
                >
                  Servicios extras
                </a>
              </li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-[#d9b48f] mb-5">
              Contacto
            </h3>

            <div className="space-y-3 text-sm text-white/70">
              <p>📍 Calle José Quiñones 237 — Pimentel</p>
              <p>📞 +51 901 551 287</p>
              <p>🕘 Atención 24 horas</p>
              <p>🌊 Pimentel, Lambayeque, Perú</p>
            </div>

            <a
              href="https://wa.me/51901551287?text=Hola,%20quiero%20consultar%20disponibilidad%20en%20Casa%20Huéspedes%20Pimentel"
              target="_blank"
              rel="noreferrer"
              className="inline-flex mt-6 bg-[#a87545] text-white px-5 py-3 rounded-lg font-black text-sm hover:bg-[#8f623a] transition"
            >
              Consultar por WhatsApp
            </a>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-xs text-white/45">
            © {new Date().getFullYear()} Casa Huéspedes Pimentel. Todos los
            derechos reservados.
          </p>

          <Link
            to="/admin/login"
            className="text-xs text-white/35 hover:text-[#d9b48f] transition"
          >
            Acceso interno
          </Link>
        </div>
      </div>
    </footer>
  );
}