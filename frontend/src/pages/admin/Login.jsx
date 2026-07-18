import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginAdmin } from "../../services/api";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "admin@casahuespedespimentel.com",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setIsLoading(true);
      setError("");

      const result = await loginAdmin(form);

      localStorage.setItem("adminToken", result.token);
      localStorage.setItem("adminUser", JSON.stringify(result.user));

      navigate("/admin/dashboard");
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo iniciar sesión.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="fixed inset-0 z-50 bg-[#f7f1e8] overflow-hidden">
      {/* Fondo */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1800&auto=format&fit=crop"
          alt="Casa Huéspedes Pimentel"
          className="w-full h-full object-cover"
        />

<div className="absolute inset-0 bg-gradient-to-r from-[#2b1d12]/82 via-[#2b1d12]/48 to-[#2b1d12]/18" />

<div className="absolute inset-y-0 left-0 w-[58%] bg-gradient-to-r from-[#2b1d12]/78 via-[#2b1d12]/50 to-transparent" />      </div>

      {/* Contenido */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-5xl grid lg:grid-cols-[1fr_440px] gap-10 items-center">
          {/* Texto izquierdo */}
{/* Texto izquierdo */}
<div className="hidden lg:block text-white">
  <Link to="/" className="inline-flex items-center gap-4 mb-10">
    <div className="w-14 h-14 rounded-full border border-[#d9b48f] bg-[#2b1d12]/55 backdrop-blur-md flex items-center justify-center overflow-hidden">
      <img
        src="/img/brand/logo-casa-huespedes.png"
        alt="Casa Huéspedes Pimentel"
        className="w-full h-full object-contain p-2"
        onError={(event) => {
          event.currentTarget.style.display = "none";
          event.currentTarget.parentElement.textContent = "CH";
        }}
      />
    </div>

    <div className="bg-[#2b1d12]/45 backdrop-blur-md rounded-xl px-4 py-2">
      <p className="font-black text-xl leading-tight text-white">
        Casa Huéspedes
      </p>
      <p className="text-sm text-white/80">Pimentel</p>
    </div>
  </Link>

  <div className="max-w-2xl rounded-[1.6rem] bg-[#2b1d12]/52 backdrop-blur-md border border-white/15 px-8 py-8 shadow-2xl">
    <p className="uppercase tracking-[0.28em] text-xs font-black text-[#d9b48f]">
      Panel privado
    </p>

    <h1 className="font-serif text-6xl xl:text-7xl leading-[0.95] tracking-[-0.045em] mt-5 text-white">
      Gestión simple del hospedaje.
    </h1>

    <p className="text-white/88 text-lg leading-relaxed max-w-xl mt-6">
      Accede al panel interno para revisar reservas, habitaciones y consultas de
      Casa Huéspedes Pimentel.
    </p>
  </div>
</div>

          {/* Formulario */}
          <div className="w-full">
            <div className="bg-[#fbf7ef] border border-[#eadfce] rounded-[1.6rem] shadow-2xl p-8 md:p-10">
              <div className="text-center lg:text-left">
                <div className="lg:hidden w-16 h-16 mx-auto rounded-full bg-white border border-[#eadfce] flex items-center justify-center overflow-hidden mb-5">
                  <img
                    src="/img/brand/logo-casa-huespedes.png"
                    alt="Casa Huéspedes Pimentel"
                    className="w-full h-full object-contain p-2"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                      event.currentTarget.parentElement.textContent = "CH";
                    }}
                  />
                </div>

                <p className="uppercase tracking-[0.24em] text-xs font-black text-[#a87545]">
                  Acceso interno
                </p>

                <h2 className="font-serif text-4xl md:text-5xl leading-none tracking-[-0.04em] text-[#2d261f] mt-3">
                  Iniciar sesión
                </h2>

                <p className="text-[#6f6258] leading-relaxed mt-4">
                  Ingresa tus credenciales para continuar.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label className="block text-[11px] font-black tracking-[0.18em] uppercase text-[#2d261f] mb-2">
                    Correo
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="email"
                    className="w-full bg-white border border-[#eadfce] rounded-xl px-4 py-4 outline-none text-[#2d261f] font-semibold focus:ring-2 focus:ring-[#a87545]/35 focus:border-[#a87545]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black tracking-[0.18em] uppercase text-[#2d261f] mb-2">
                    Contraseña
                  </label>

                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                    className="w-full bg-white border border-[#eadfce] rounded-xl px-4 py-4 outline-none text-[#2d261f] font-semibold focus:ring-2 focus:ring-[#a87545]/35 focus:border-[#a87545]"
                  />
                </div>

                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 font-bold text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#a87545] text-white rounded-xl py-4 font-black hover:bg-[#8f623a] transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Ingresando..." : "Ingresar al panel"}
                </button>
              </form>

              <div className="mt-7 pt-6 border-t border-[#eadfce] flex items-center justify-between gap-4">
                <Link
                  to="/"
                  className="text-sm font-black text-[#6f6258] hover:text-[#a87545] transition"
                >
                  ← Volver a la web
                </Link>

                <p className="text-xs text-[#9d9187]">
                  Acceso autorizado
                </p>
              </div>
            </div>

            <p className="text-center text-xs text-white/75 mt-5">
              Casa Huéspedes Pimentel · Panel administrativo
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}