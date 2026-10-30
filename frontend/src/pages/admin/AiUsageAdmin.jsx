import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const nf = new Intl.NumberFormat("es-PE");
const mf = new Intl.NumberFormat("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 });
const channels = { whatsapp: "WhatsApp", instagram: "Instagram", facebook: "Facebook", web: "Web", other: "Otro" };
const operations = { scope_classifier: "Clasificación", assistant_response: "Respuesta IA", tool_followup: "Continuación con herramienta" };

function TokensCard({ label, value, note }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

export default function AiUsageAdmin() {
  const [days, setDays] = useState(7);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/admin/ai-usage", { params: { days } });
        if (active) setReport(response.data.data);
      } catch (err) {
        if (active) {
          setReport(null);
          setError(err.response?.data?.message || "No se pudo cargar el consumo de OpenAI.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [days]);

  const totals = useMemo(() => (report?.breakdown || []).reduce((total, row) => ({
    requests: total.requests + row.requests,
    input: total.input + row.input_tokens,
    cached: total.cached + row.cached_input_tokens,
    output: total.output + row.output_tokens,
    reasoning: total.reasoning + row.reasoning_output_tokens,
    cost: total.cost + row.estimated_cost_usd,
  }), { requests: 0, input: 0, cached: 0, output: 0, reasoning: 0, cost: 0 }), [report]);

  const daily = useMemo(() => {
    const aggregate = new Map();
    for (const row of report?.daily || []) {
      const previous = aggregate.get(row.day) || { day: row.day, input: 0, output: 0 };
      previous.input += row.input_tokens;
      previous.output += row.output_tokens;
      aggregate.set(row.day, previous);
    }
    return [...aggregate.values()].sort((a, b) => a.day.localeCompare(b.day));
  }, [report]);
  const maxDaily = Math.max(1, ...daily.map((row) => row.input + row.output));

  return (
    <div className="min-h-screen p-5 md:p-8 max-w-7xl mx-auto space-y-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest font-bold text-slate-500">Administración / Inteligencia artificial</p>
          <h1 className="text-3xl font-bold text-slate-900 mt-1">Consumo de OpenAI</h1>
          <p className="text-slate-600 mt-2 text-sm">Métricas registradas desde la activación de la instrumentación. No incluye consumo histórico.</p>
        </div>
        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          Período
          <select aria-label="Período de consumo" value={days} onChange={(event) => setDays(Number(event.target.value))}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2">
            <option value={1}>Últimas 24 horas</option>
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
          </select>
        </label>
      </header>

      {error && <div role="alert" className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-4">{error}</div>}
      {loading && <p className="text-slate-500">Consultando métricas…</p>}
      {!loading && report && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TokensCard label="Solicitudes a OpenAI" value={nf.format(totals.requests)} />
            <TokensCard label="Tokens de entrada" value={nf.format(totals.input)} note={nf.format(totals.cached) + " recuperados de caché"} />
            <TokensCard label="Tokens de salida" value={nf.format(totals.output)} note={nf.format(totals.reasoning) + " de razonamiento (incluidos)"} />
            <TokensCard label="Costo estimado" value={"US$ " + mf.format(totals.cost)} note="No es la factura oficial" />
          </section>

          <section className="grid gap-5 lg:grid-cols-5">
            <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-bold text-lg text-slate-900 mb-4">Tokens por día</h2>
              {daily.length ? (
                <div className="flex items-end gap-3 h-48 border-b border-slate-200 pb-2">
                  {daily.map((row) => (
                    <div key={row.day} className="flex flex-1 min-w-0 flex-col items-center justify-end gap-1 h-full">
                      <span className="text-xs text-slate-500">{nf.format(row.input + row.output)}</span>
                      <div title={row.day + ": " + nf.format(row.input + row.output) + " tokens"}
                        className="rounded-t bg-sky-700 w-full max-w-16 min-h-1"
                        style={{ height: Math.max(2, ((row.input + row.output) / maxDaily) * 145) + "px" }} />
                      <span className="text-xs text-slate-500 truncate w-full text-center">{row.day.slice(5)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-500">Sin llamadas registradas en este período.</p>}
            </div>
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
              <h2 className="font-bold text-lg text-slate-900">Interpretación</h2>
              <p className="text-sm text-slate-600">El total de salida ya incluye tokens de razonamiento: no se suman dos veces.</p>
              <p className="text-sm text-slate-600">Una conversación puede generar varias peticiones: clasificación, respuesta y llamadas a herramientas.</p>
              <p className="text-sm text-slate-600">{report.priceNote}</p>
              <p className="text-xs text-slate-500">Solo se guardan métricas técnicas y una referencia de conversación protegida, nunca mensajes ni datos personales directos.</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 overflow-x-auto">
            <h2 className="font-bold text-lg text-slate-900 mb-4">Consumo por canal, modelo y operación</h2>
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead><tr className="border-b text-slate-500">
                <th className="py-3 pr-3">Canal</th><th className="pr-3">Modelo</th><th className="pr-3">Operación</th>
                <th className="text-right pr-3">Peticiones</th><th className="text-right pr-3">Entrada</th>
                <th className="text-right pr-3">Caché</th><th className="text-right pr-3">Salida</th>
                <th className="text-right">USD estimados</th>
              </tr></thead>
              <tbody>{report.breakdown.map((row) => (
                <tr key={row.channel + row.model + row.operation} className="border-b border-slate-100">
                  <td className="py-3 pr-3">{channels[row.channel] || row.channel}</td>
                  <td className="pr-3 font-mono text-xs">{row.model}</td>
                  <td className="pr-3">{operations[row.operation] || row.operation}</td>
                  <td className="text-right pr-3">{nf.format(row.requests)}</td>
                  <td className="text-right pr-3">{nf.format(row.input_tokens)}</td>
                  <td className="text-right pr-3">{nf.format(row.cached_input_tokens)}</td>
                  <td className="text-right pr-3">{nf.format(row.output_tokens)}</td>
                  <td className="text-right">{mf.format(row.estimated_cost_usd)}</td>
                </tr>
              ))}</tbody>
            </table>
            {!report.breakdown.length && <p className="mt-3 text-slate-500 text-sm">Todavía no hay consumo almacenado.</p>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 overflow-x-auto">
            <h2 className="font-bold text-lg text-slate-900 mb-1">Conversaciones de mayor consumo</h2>
            <p className="text-xs text-slate-500 mb-4">Referencias anónimas para diagnosticar costos, no números de WhatsApp.</p>
            <table className="w-full text-sm text-left">
              <thead><tr className="border-b text-slate-500">
                <th className="py-3">Referencia</th><th>Canal</th><th className="text-right">Peticiones</th>
                <th className="text-right">Tokens</th><th className="text-right">USD estimados</th>
              </tr></thead><tbody>
                {report.conversations.map((row) => (
                  <tr key={row.channel + row.conversation_tag} className="border-b border-slate-100">
                    <td className="py-3 font-mono text-xs">{row.conversation_tag.slice(0, 12)}…</td>
                    <td>{channels[row.channel] || row.channel}</td>
                    <td className="text-right">{nf.format(row.requests)}</td>
                    <td className="text-right">{nf.format(row.input_tokens + row.output_tokens)}</td>
                    <td className="text-right">{mf.format(row.estimated_cost_usd)}</td>
                  </tr>
                ))}
              </tbody></table>
            {!report.conversations.length && <p className="text-slate-500 text-sm mt-3">Sin datos por conversación todavía.</p>}
          </section>
        </>
      )}
    </div>
  );
}
