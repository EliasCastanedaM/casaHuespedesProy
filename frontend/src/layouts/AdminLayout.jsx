import { Outlet, NavLink, useNavigate } from "react-router-dom";

const menuItems = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: "📊",
  },
  {
    label: "Reservas",
    path: "/admin/reservas",
    icon: "📅",
  },
  {
    label: "Consultas",
    path: "/admin/consultas",
    icon: "💬",
  },
  {
    label: "Habitaciones",
    path: "/admin/habitaciones",
    icon: "🛏️",
  },
  {
    label: "Clientes",
    path: "/admin/clientes",
    icon: "👥",
  },
  {
    label: "Horarios",
    path: "/admin/horarios",
    icon: "🕘",
  },

  {
    label: "Galería",
    path: "/admin/galeria",
    icon: "🖼️",
  },
  {
    label: "Estadísticas",
    path: "/admin/estadisticas",
    icon: "📈",
  },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    navigate("/admin/login");
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* MENÚ LATERAL */}
      <aside className="w-72 bg-brand-dark text-white hidden lg:flex flex-col">
        <div className="p-6 border-b border-white/10">
          <p className="text-xs uppercase tracking-[0.25em] text-brand-gold font-black">
            Casa Huéspedes
          </p>

          <h1 className="text-2xl font-black mt-2">
            Panel Admin
          </h1>

          <p className="text-white/60 text-sm mt-2">
            Gestión del hospedaje
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition ${
                  isActive
                    ? "bg-brand-gold text-brand-navy"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <a
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-white/80 hover:bg-white/10 hover:text-white font-bold text-sm transition"
          >
            <span className="text-lg">🌐</span>
            Ver página web
          </a>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/10 text-red-200 hover:bg-red-500/20 font-bold text-sm transition"
          >
            <span className="text-lg">🚪</span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO */}
      <div className="flex-1 min-w-0">
        {/* HEADER MÓVIL / TABLET */}
        <header className="lg:hidden bg-brand-dark text-white px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-gold font-black">
              Casa Huéspedes
            </p>
            <h1 className="font-black">Panel Admin</h1>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="bg-white/10 px-4 py-2 rounded-full text-sm font-black"
          >
            Salir
          </button>
        </header>

        {/* MENÚ MÓVIL */}
        <nav className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 overflow-x-auto flex gap-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `shrink-0 px-4 py-2 rounded-full text-sm font-black transition ${
                  isActive
                    ? "bg-brand-dark text-white"
                    : "bg-slate-100 text-slate-600"
                }`
              }
            >
              {item.icon} {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
}