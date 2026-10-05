import { Link } from "react-router-dom";

const categories = [
  {
    slug: "matrimonial",
    name: "Matrimonial Estándar",
    short: "Matrimonial",
    rooms: ["205", "305"],
    capacity: "2 habitaciones",
    tone: "from-[#a87545] to-[#7a4b29]",
    description:
      "Grupo estándar de habitaciones matrimoniales. Estas unidades físicas quedan asignadas internamente.",
  },
  {
    slug: "matrimonial-ejecutiva",
    name: "Matrimonial Ejecutiva",
    short: "Ejecutiva",
    rooms: ["101", "304", "505"],
    capacity: "3 habitaciones",
    tone: "from-[#76543a] to-[#3f2a1c]",
    description:
      "Grupo ejecutivo matrimonial, separado del estándar para precio, inventario y presentación comercial.",
  },
  {
    slug: "doble",
    name: "Doble",
    short: "Doble",
    rooms: ["201", "301"],
    capacity: "2 habitaciones",
    tone: "from-[#b48a62] to-[#8f6540]",
    description:
      "Habitaciones de categoría doble. El huésped elige la categoría; el número físico se asigna internamente.",
  },
  {
    slug: "triple",
    name: "Triple",
    short: "Triple",
    rooms: ["202", "302", "303", "406", "407"],
    capacity: "5 habitaciones",
    tone: "from-[#8b5b3a] to-[#4e3020]",
    description:
      "La categoría con mayor inventario físico. Actualmente la habitación 406 también pertenece a este grupo.",
  },
  {
    slug: "familiar",
    name: "Familiar",
    short: "Familiar",
    rooms: ["203", "405"],
    capacity: "2 habitaciones",
    tone: "from-[#9c7250] to-[#5c3e2a]",
    description:
      "Habitaciones familiares del inventario físico actual de Casa Huéspedes Pimentel.",
  },
];

const totalRooms = categories.reduce(
  (total, category) => total + category.rooms.length,
  0,
);

function RoomChip({ room }) {
  return (
    <div className="group relative overflow-hidden rounded-[18px] border border-[#e8d9c7] bg-white px-5 py-4 shadow-[0_12px_30px_rgba(43,29,18,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[#c79a6a] hover:shadow-[0_18px_40px_rgba(43,29,18,0.12)]">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#aa7a4c]">
        Habitación
      </span>
      <div className="mt-1 flex items-end justify-between gap-4">
        <strong className="font-serif text-4xl leading-none text-[#2b1d12]">
          {room}
        </strong>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f3e7d8] text-[#8b5c34] transition group-hover:bg-[#a87545] group-hover:text-white">
          →
        </span>
      </div>
    </div>
  );
}

export default function RoomInventoryPreview() {
  return (
    <main className="min-h-screen bg-[#fbf7ef] text-[#2b1d12]">
      <section className="relative overflow-hidden border-b border-[#eadfce] bg-[#2b1d12] text-white">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#a87545]/25 blur-[100px]" />
        <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-[#d8ad7d]/10 blur-[110px]" />

        <div className="relative mx-auto max-w-7xl px-5 py-16 md:px-8 sm:py-20">
          <div className="grid items-end gap-10 lg:grid-cols-[1fr_.72fr]">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.24em] text-[#d9b48f]">
                Inventario interno
              </span>
              <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[.98] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
                Habitaciones físicas por categoría
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
                Vista de control para revisar cómo están agrupadas actualmente
                las 14 habitaciones físicas de Casa Huéspedes Pimentel.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-md">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d9b48f]">
                  Habitaciones
                </span>
                <strong className="mt-2 block font-serif text-5xl">
                  {totalRooms}
                </strong>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-md">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d9b48f]">
                  Categorías
                </span>
                <strong className="mt-2 block font-serif text-5xl">
                  {categories.length}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 sm:py-18">
        <div className="mb-10 flex flex-col gap-4 border-b border-[#eadfce] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.22em] text-[#a87545]">
              Distribución actual
            </span>
            <h2 className="mt-3 font-serif text-4xl sm:text-5xl">
              5 categorías · 14 habitaciones
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-[#6f6157] sm:text-right">
            Los números son de uso operativo. En el flujo comercial, el
            huésped selecciona una categoría y el backend asigna una habitación
            física disponible.
          </p>
        </div>

        <div className="space-y-7">
          {categories.map((category, index) => (
            <article
              key={category.slug}
              className="overflow-hidden rounded-[30px] border border-[#e6d6c3] bg-white shadow-[0_20px_50px_rgba(43,29,18,0.07)]"
            >
              <div className="grid lg:grid-cols-[.42fr_1fr]">
                <div
                  className={`relative overflow-hidden bg-gradient-to-br ${category.tone} p-7 text-white sm:p-8`}
                >
                  <span className="absolute right-5 top-2 font-serif text-[110px] leading-none text-white/[0.06]">
                    0{index + 1}
                  </span>
                  <span className="relative text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                    Categoría
                  </span>
                  <h3 className="relative mt-3 max-w-sm font-serif text-4xl leading-[1.02]">
                    {category.name}
                  </h3>
                  <p className="relative mt-5 max-w-sm text-sm leading-7 text-white/70">
                    {category.description}
                  </p>
                  <span className="relative mt-7 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] backdrop-blur-sm">
                    {category.capacity}
                  </span>
                </div>

                <div className="p-6 sm:p-8">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#a87545]">
                        Habitaciones físicas
                      </span>
                      <p className="mt-1 text-sm text-[#7a6b61]">
                        {category.rooms.join(" · ")}
                      </p>
                    </div>
                    <Link
                      to={`/habitaciones/${category.slug}`}
                      className="inline-flex items-center gap-2 rounded-full border border-[#dfc9af] bg-[#fbf7ef] px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#7a4b29] transition hover:border-[#a87545] hover:bg-[#a87545] hover:text-white"
                    >
                      Ver categoría pública
                      <span>→</span>
                    </Link>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {category.rooms.map((room) => (
                      <RoomChip key={room} room={room} />
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 grid gap-4 rounded-[28px] border border-[#decbb3] bg-[#f3e8da] p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#a87545]">
              Resumen rápido
            </span>
            <p className="mt-2 font-serif text-2xl text-[#2b1d12] sm:text-3xl">
              205–305 · 101–304–505 · 201–301 ·
              202–302–303–406–407 · 203–405
            </p>
          </div>
          <div className="text-sm leading-6 text-[#6f6157] sm:text-right">
            <strong className="block text-[#2b1d12]">Total: 14</strong>
            habitaciones físicas
          </div>
        </div>
      </section>
    </main>
  );
}
