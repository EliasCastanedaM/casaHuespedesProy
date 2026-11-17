import { useState } from 'react';

const soles = value => value == null ? '—' : `S/ ${Number(value).toFixed(0)}`;

export default function TariffProposalReview({ proposal, categories = [] }) {
  const [seasonKey,setSeasonKey] = useState('regular');
  if (!proposal) return <p className="mt-6 rounded-xl bg-white p-5">No se pudo recuperar la propuesta de tarifario.</p>;
  const season = proposal.seasons.find(item=>item.key===seasonKey) || proposal.seasons[0];
  const baseRows = proposal.seasons.find(item=>item.key==='regular')?.rows || [];
  return (
    <section className="mt-6 space-y-5 text-[#2d261f]">
      <div className="rounded-2xl border border-[#eadfce] bg-white p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Tarifario del cliente</h2>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            {proposal.active ? 'Base autorizada' : 'Pendiente de tu confirmación'}
          </span>
        </div>
        <p className="mt-3 text-[#6f6258]">{proposal.note}</p>
        <p className="mt-2 text-sm text-[#6f6258]">Fuente: {proposal.source}</p>
        <div className="mt-5 rounded-xl bg-[#f7f1e8] p-4">
          <p className="font-semibold">Por noche: el mayor entre el mínimo de habitación y la suma de huéspedes.</p>
          <p className="mt-2">S/ {proposal.adult_amount} por tarifa adulta + S/ {proposal.child_amount} por niño de 5 a 8 años.</p>
          <p className="mt-2 text-sm text-[#6f6258]">El importe infantil entra antes de aplicar el mínimo. De 0 a 4 años no añaden importe ni plaza tarifaria; se verifican camas y seguridad. Se requiere al menos un adulto acompañante.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#eadfce] bg-white p-5 md:p-7">
        <h3 className="text-xl font-bold">Comparación con las categorías actuales</h3>
        <p className="mt-2 text-sm text-[#6f6258]">Importes para la capacidad adulta completa de cada categoría. La propuesta no cambia las tarifas vigentes.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-[#d9c9b7]">
              {['Categoría','Adultos','Vigente / noche','Propuesta base / noche','Estado'].map(label=><th key={label} className="p-3 font-semibold">{label}</th>)}
            </tr></thead>
            <tbody>{categories.map(category=>{
              const mapping = proposal.category_mapping[category.slug];
              const row = baseRows.find(item=>item.tariff_key===mapping?.tariff_key);
              const amount = row && category.capacity<=row.capacity ? Math.max(row.minimum,proposal.adult_amount*category.capacity) : null;
              return <tr key={category.slug} className="border-b border-[#eadfce]">
                <td className="p-3 font-semibold">{category.name}</td>
                <td className="p-3">{category.capacity}</td>
                <td className="p-3 whitespace-nowrap">{soles(category.price_per_night)}</td>
                <td className="p-3 whitespace-nowrap">{amount == null ? 'Por definir' : soles(amount)}</td>
                <td className="p-3">{mapping?.status==='pending_definition' ? 'Confirmar categoría equivalente' : mapping?.status==='approved' ? 'Correspondencia autorizada' : 'Pendiente de confirmación'}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-[#6f6258]">El PDF no define un precio independiente para Ejecutiva ni distingue Familiar 1 y Familiar 2. La fila Familiar se simula abajo; sus equivalencias siguen pendientes.</p>
      </div>

      <div className="rounded-2xl border border-[#eadfce] bg-white p-5 md:p-7">
        <h3 className="text-xl font-bold">Simulación de la propuesta</h3>
        <p className="mt-2 text-sm text-[#6f6258]">Precios por habitación y noche. A = tarifa adulta; N = niño de 5 a 8 años. El guion indica que se excede la capacidad tarifaria. La simulación no comprueba disponibilidad.</p>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Temporada de simulación">
          {proposal.seasons.map(item=><button key={item.key} type="button" aria-pressed={season.key===item.key}
            onClick={()=>setSeasonKey(item.key)}
            className={`min-h-12 rounded-xl border px-4 py-3 font-semibold ${season.key===item.key ? 'border-[#2b1d12] bg-[#2b1d12] text-white' : 'border-[#d9c9b7] bg-white'}`}>
            {item.name} {item.percent===100 ? '(base)' : `(${item.percent-100>0?'+':''}${item.percent-100} %)`}
          </button>)}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#d9c9b7]">
              <th className="p-3 text-left">Categoría / mínimo base</th>
              {proposal.columns.map(label=><th key={label} className="p-3 text-right whitespace-nowrap">{label}</th>)}
            </tr></thead>
            <tbody>{season.rows.map(row=><tr key={row.tariff_key} className="border-b border-[#eadfce]">
              <th scope="row" className="p-3 text-left whitespace-nowrap">{row.name}<span className="block font-normal text-[#6f6258]">Base mínima {soles(row.minimum)}</span></th>
              {row.amounts.map((amount,index)=><td key={proposal.columns[index]} className="p-3 text-right whitespace-nowrap">{soles(amount)}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Alta y baja pendientes de confirmación. Las fechas indicadas son propuestas; no activan aumentos ni descuentos.</p>
        <p className="mt-3 text-sm text-[#6f6258]">Fechas propuestas para {season.name.toLowerCase()}: {season.proposed_dates}</p>
        <p className="mt-3 text-sm text-[#6f6258]">Los ejemplos excluyen mascotas y otros cargos. Las reservas registradas conservan sus importes. La aprobación de otras propuestas del panel no activa este tarifario.</p>
      </div>
    </section>
  );
}
