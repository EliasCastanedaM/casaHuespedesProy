import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const CATEGORIES = {
  rates:"Tarifas", guests:"Huéspedes", pets:"Mascotas", stays:"Estadías",
  inventory:"Habitaciones", house:"Reglas de casa", payments:"Pagos",
  marketing:"Marketing",
};
const FIELD_LABELS = {
  amount_pen:"Cargo por mascota (S/)",
  charge_frequency:"Forma de cobro",
  adult_rate_confirmed:"¿Desde los 9 años se cobra como adulto?",
  percent_of_min_max_differential:"Porcentaje del diferencial (%)",
  min_total_guests:"Huéspedes mínimos para grupo",
  lower_percent:"Variación mínima (%)",
  upper_percent:"Variación máxima (%)",
  subtract_pen_per_missing_guest:"Descuento por plaza no ocupada (S/)",
  nights:"Cantidad mínima de noches",
  deposit_percent:"Porcentaje de adelanto (%)",
};
const CHOICES = [
  {value:"",label:"Pendiente de confirmar"},
  {value:"pet_per_night",label:"Por mascota y noche"},
  {value:"per_stay",label:"Por estadía"},
];
const STATUS = {pending:"Esperando aprobación",approved:"Aprobada",rejected:"Rechazada"};
const POLICY_STATUS = {verified:"Confirmada",pending_review:"Pendiente de validar",retired:"Retirada"};
const TYPE = {high:"Temporada alta",holiday:"Feriado",event:"Evento especial"};
const formatSoles = (v)=>`S/ ${Number(v||0).toFixed(2)}`;
const formatDay = (v)=>v?String(v).slice(0,10).split("-").reverse().join("/"):"-";
const textError = (err)=>err?.response?.data?.message || err?.message || "No se pudo completar la operación.";
const emptySeason = {title:"",season_type:"high",start_date:"",end_date:"",
  min_nights:"",proposed_adjustment_percent:"",deposit_percent:"",note:""};
const emptyRate = {category_slug:"",suggested_price:"",start_date:"",end_date:"",reason:""};

function Badge({status,policy=false}) {
  const label=policy?(POLICY_STATUS[status]||status):(STATUS[status]||status);
  const className=status==="approved"||status==="verified"
    ? "bg-green-50 text-green-800 border-green-200"
    : status==="rejected"?"bg-red-50 text-red-700 border-red-200"
      : "bg-amber-50 text-amber-800 border-amber-200";
  return <span className={`inline-flex rounded-full border px-3 py-1.5 text-sm font-semibold ${className}`}>{label}</span>;
}
function Label({children}) {return <label className="block text-base font-semibold text-[#2d261f] mb-2">{children}</label>;}
const inputStyle="block w-full min-h-12 rounded-xl border border-[#d9c9b7] bg-white px-4 py-3 text-base text-[#2d261f] focus:outline-none focus:ring-2 focus:ring-[#a87545]";
const actionStyle="min-h-12 rounded-xl bg-[#a87545] px-5 py-3 text-base font-bold text-white hover:bg-[#8f623a] disabled:opacity-60";
const softStyle="min-h-12 rounded-xl border border-[#d9c9b7] bg-white px-5 py-3 text-base font-semibold text-[#2d261f] hover:bg-[#fff6e9] disabled:opacity-60";

function Field({field,value,onChange,spec}) {
  const isBool=spec.type==="boolean";
  if(isBool) return (
    <div>
      <Label>{FIELD_LABELS[field]||field}</Label>
      <select className={inputStyle} value={value===true?"true":"false"}
        onChange={e=>onChange(e.target.value==="true")}>
        <option value="false">No</option><option value="true">Sí</option>
      </select>
    </div>
  );
  if(spec.type==="choice") return (
    <div>
      <Label>{FIELD_LABELS[field]||field}</Label>
      <select className={inputStyle} value={value??""}
        onChange={e=>onChange(e.target.value||null)}>
        {CHOICES.map(x=><option value={x.value} key={x.value}>{x.label}</option>)}
      </select>
    </div>
  );
  return (
    <div>
      <Label>{FIELD_LABELS[field]||field}</Label>
      <input className={inputStyle} type="number" min={spec.min} max={spec.max}
        step={spec.type==="integer"?"1":"0.01"}
        value={value??""}
        onChange={e=>onChange(e.target.value===""?"":Number(e.target.value))}/>
      <p className="mt-1 text-xs text-[#6f6258]">Permitido: {spec.min} a {spec.max}</p>
    </div>
  );
}
function ReviewList({items,canApprove,decision,type}) {
  const pending=items.filter(x=>x.status==="pending");
  return (
    <section className="rounded-2xl border border-[#eadfce] bg-white p-5 md:p-6 shadow-sm mt-6">
      <h2 className="text-2xl font-bold text-[#2d261f]">Por aprobar ({pending.length})</h2>
      <p className="mt-1 text-sm text-[#6f6258]">Solo una cuenta administradora puede autorizar estos cambios.</p>
      {pending.length===0?<p className="mt-4 text-[#6f6258]">No hay propuestas pendientes.</p>:(
        <div className="mt-5 space-y-3">
          {pending.map(item=>(
            <div key={item.id} className="rounded-xl border border-[#eadfce] p-4">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <strong className="text-base text-[#2d261f]">
                  {type==="rules"?item.rule_code:type==="seasons"?item.title:item.category_slug}
                </strong>
                <Badge status={item.status}/>
              </div>
              {type==="rates" ? (
                <p className="text-sm text-[#6f6258] mt-2">
                  {formatSoles(item.base_price_snapshot)} → <b>{formatSoles(item.suggested_price)}</b>
                  {" · "}{formatDay(item.start_date)} al {formatDay(item.end_date)}
                </p>
              ):type==="seasons" ? (
                <p className="text-sm text-[#6f6258] mt-2">
                  {TYPE[item.season_type]} · {formatDay(item.start_date)} al {formatDay(item.end_date)}
                  {item.proposed_adjustment_percent!=null?` · ${item.proposed_adjustment_percent}% sugerido`:""}
                </p>
              ):(
                <div className="mt-2 text-sm text-[#6f6258]">
                  <p className="font-semibold">Valores propuestos:</p>
                  {Object.entries(item.proposed_config||{}).filter(([key])=>FIELD_LABELS[key])
                    .map(([key,value])=>(
                    <p key={key} className="mt-1">{FIELD_LABELS[key]}: <b>{String(value??"Pendiente")}</b></p>
                  ))}
                </div>
              )}
              {item.reason||item.note?<p className="mt-3 text-sm text-[#6f6258]">{item.reason||item.note}</p>:null}
              <p className="mt-2 text-xs text-[#6f6258]">Propuso: {item.proposed_by||"Administración"}</p>
              {canApprove&&(
                <div className="flex flex-wrap gap-2 mt-4">
                  <button className={actionStyle} type="button"
                    onClick={()=>decision(type,item.id,"approved")}>Aprobar</button>
                  <button className={softStyle} type="button"
                    onClick={()=>decision(type,item.id,"rejected")}>Rechazar</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function CommercialAdmin() {
  const [tab,setTab]=useState("rules");
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [selectedCode,setSelectedCode]=useState("");
  const [changes,setChanges]=useState({});
  const [ruleNote,setRuleNote]=useState("");
  const [season,setSeason]=useState(emptySeason);
  const [rate,setRate]=useState(emptyRate);
  const [currentUser]=useState(()=>{
    try {return JSON.parse(localStorage.getItem("adminUser")||"{}");}
    catch{return {};}
  });
  const canApprove=currentUser.role==="admin";

  async function refresh() {
    setLoading(true);
    try {
      const r=await api.get("/admin/commercial/overview");
      setData(r.data.data);
      setError("");
    } catch(err){setError(textError(err));}
    finally{setLoading(false);}
  }
  useEffect(()=>{refresh();},[]);

  const editableRules=useMemo(()=>(data?.rules||[])
    .filter(x=>data?.editable_rule_fields?.[x.code]),[data]);
  const selected=editableRules.find(x=>x.code===selectedCode);
  const spec=data?.editable_rule_fields?.[selectedCode]||{};
  useEffect(()=>{
    if(!selectedCode && editableRules.length) setSelectedCode(editableRules[0].code);
  },[editableRules,selectedCode]);
  useEffect(()=>{
    if(selected) setChanges(Object.fromEntries(Object.keys(spec)
      .map(key=>[key,selected.config[key]??null])));
  },[selectedCode,data]);

  async function send(path,payload,message) {
    setSaving(true);setError("");setNotice("");
    try{
      await api.post(path,payload);
      await refresh();
      setNotice(message);
      return true;
    }catch(err){setError(textError(err));return false;}
    finally{setSaving(false);}
  }
  async function proposeRule(e){
    e.preventDefault();
    const delta=Object.fromEntries(Object.entries(changes)
      .filter(([k,v])=>JSON.stringify(v)!==JSON.stringify(selected?.config?.[k])));
    if(!Object.keys(delta).length){setError("Primero modifica un dato de la regla.");return;}
    if(Object.values(delta).some(v=>v==="")){setError("Completa los valores numéricos.");return;}
    const ok=await send(`/admin/commercial/rules/${selectedCode}/proposals`,
      {changes:delta,note:ruleNote},"La propuesta quedó pendiente de aprobación.");
    if(ok)setRuleNote("");
  }
  async function proposeSeason(e){
    e.preventDefault();
    const transform = key=>season[key]===""?null:Number(season[key]);
    const payload={...season,min_nights:transform("min_nights"),
      proposed_adjustment_percent:transform("proposed_adjustment_percent"),
      deposit_percent:transform("deposit_percent")};
    const ok=await send("/admin/commercial/seasons",payload,"Temporada enviada para aprobación.");
    if(ok)setSeason(emptySeason);
  }
  async function proposeRate(e){
    e.preventDefault();
    const payload={...rate,suggested_price:Number(rate.suggested_price)};
    const ok=await send("/admin/commercial/rates",payload,"Tarifa enviada para aprobación.");
    if(ok)setRate(emptyRate);
  }
  async function decide(type,id,decision) {
    if(!window.confirm(decision==="approved"
      ?"¿Confirmas esta aprobación? Quedará auditada. No actualizará automáticamente las reservas ni las plataformas externas."
      :"¿Quieres rechazar esta propuesta?")) return;
    const kind=type==="rules"?"rules/proposals":type;
    await send(`/admin/commercial/${kind}/${id}/decision`,
      {decision},decision==="approved"?"Aprobación registrada.":"Propuesta rechazada.");
  }
  const pendingCount=(data?.rule_proposals||[]).filter(x=>x.status==="pending").length+
    (data?.seasons||[]).filter(x=>x.status==="pending").length+
    (data?.rates||[]).filter(x=>x.status==="pending").length;
  const chosenCategory=data?.categories?.find(c=>c.slug===rate.category_slug);
  const base=Number(chosenCategory?.price_per_night||0);
  const suggested=Number(rate.suggested_price||0);
  const difference=base>0 && suggested>0 ? ((suggested/base-1)*100).toFixed(1) : null;

  return (
    <main className="min-h-screen bg-[#f7f1e8] px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-7xl mx-auto">
        <header className="rounded-3xl bg-[#2b1d12] p-6 md:p-9 text-white">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#d9b48f]">Gestión interna</p>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold">Reglas y tarifas</h1>
          <p className="mt-3 max-w-3xl text-base text-white/80">
            Configura condiciones, registra temporadas y solicita cambios de precio.
            Cada modificación importante pasa por la aprobación de una persona administradora.
          </p>
          <p className="mt-4 inline-flex rounded-lg border border-white/25 bg-white/10 px-4 py-3 text-sm">
            Las tarifas de reservas, Booking y Airbnb no cambian al aprobar propuestas en este panel.
          </p>
        </header>

        {error&&<div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-red-800" role="alert">{error}</div>}
        {notice&&<div className="mt-4 rounded-xl border border-green-300 bg-green-50 p-4 text-green-800" role="status">{notice}</div>}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-[#eadfce] bg-white px-5 py-3 text-[#2d261f]">
            <b className="text-2xl">{pendingCount}</b> solicitudes pendientes
          </div>
          <div className="rounded-xl border border-[#eadfce] bg-white px-5 py-3 text-[#2d261f]">
            <b className="text-2xl">{data?.rules?.length||0}</b> reglas
          </div>
          <button onClick={refresh} disabled={loading||saving} className={softStyle}>
            {loading?"Cargando…":"Actualizar datos"}
          </button>
        </div>

        <nav aria-label="Secciones comerciales" className="mt-6 grid gap-2 sm:grid-cols-3">
          {[
            ["rules","📋 Reglas de la casa"],
            ["seasons","🗓️ Temporadas"],
            ["rates","💰 Tarifas propuestas"],
          ].map(([key,label])=>(
            <button key={key} type="button" onClick={()=>{setTab(key);setError("");setNotice("");}}
              aria-current={tab===key?"page":undefined}
              className={`min-h-14 rounded-xl px-4 py-3 font-bold text-base text-left border ${tab===key
                ?"bg-[#2b1d12] text-white border-[#2b1d12]":"bg-white text-[#2d261f] border-[#eadfce]"}`}>
              {label}
            </button>
          ))}
        </nav>

        {loading&&!data?<div className="mt-8 p-8 bg-white rounded-2xl" role="status">Cargando reglas comerciales…</div>:null}

        {data&&tab==="rules"&&(
          <>
            <section className="mt-6 grid xl:grid-cols-[0.8fr_1.2fr] gap-5">
              <div className="bg-white border border-[#eadfce] rounded-2xl p-5">
                <h2 className="text-xl font-bold text-[#2d261f]">Reglas registradas</h2>
                <p className="mt-1 text-sm text-[#6f6258]">Selecciona una para revisarla.</p>
                <div className="mt-4 space-y-2 max-h-[650px] overflow-y-auto">
                  {(data.rules||[]).map(rule=>(
                    <button type="button" key={rule.code}
                      onClick={()=>setSelectedCode(rule.code)}
                      className={`w-full text-left rounded-xl border px-4 py-3 min-h-16 ${selectedCode===rule.code
                        ?"border-[#a87545] bg-[#fff6e9]":"border-[#eadfce] bg-white"}`}>
                      <span className="block font-bold text-[#2d261f]">{rule.title}</span>
                      <span className="mt-1 block text-sm text-[#6f6258]">
                        {CATEGORIES[rule.rule_category]||rule.rule_category} · {POLICY_STATUS[rule.review_status]||rule.review_status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-[#eadfce] rounded-2xl p-5 md:p-6">
                <h2 className="text-2xl font-bold text-[#2d261f]">{selected?.title||"Selecciona una regla"}</h2>
                {selected&&<>
                  <div className="mt-3"><Badge status={selected.review_status} policy/></div>
                  <p className="mt-3 text-sm text-[#6f6258]">
                    Los cambios quedarán como propuesta hasta que un administrador los apruebe.
                  </p>
                  <form onSubmit={proposeRule} className="mt-6 space-y-5">
                    {Object.keys(spec).length===0?<p>Esta regla solo puede revisarse; no tiene edición habilitada.</p>
                      :Object.entries(spec).map(([key,field])=>(
                        <Field key={key} field={key} spec={field} value={changes[key]}
                          onChange={v=>setChanges(old=>({...old,[key]:v}))}/>
                      ))}
                    {Object.keys(spec).length>0&&<>
                      <div>
                        <Label>Motivo o comentario (opcional)</Label>
                        <textarea className={inputStyle} rows={2} maxLength={500}
                          placeholder="Ejemplo: aprobado por la gerencia para la temporada alta"
                          value={ruleNote} onChange={e=>setRuleNote(e.target.value)}/>
                      </div>
                      <button className={actionStyle} disabled={saving} type="submit">
                        Enviar para aprobación
                      </button>
                    </>}
                  </form>
                </>}
              </div>
            </section>
            <ReviewList items={data.rule_proposals||[]} type="rules" canApprove={canApprove}
              decision={decide}/>
          </>
        )}

        {data&&tab==="seasons"&&(
          <>
            <form onSubmit={proposeSeason} className="mt-6 bg-white border border-[#eadfce] rounded-2xl p-5 md:p-7">
              <h2 className="text-2xl font-bold text-[#2d261f]">Agregar temporada o feriado</h2>
              <p className="mt-2 text-[#6f6258]">Estos períodos son propuestas: no bloquean habitaciones ni aplican cobros automáticamente.</p>
              <div className="mt-6 grid sm:grid-cols-2 gap-5">
                <div><Label>Nombre</Label><input required maxLength={120} className={inputStyle}
                  placeholder="Ejemplo: Feriado de noviembre" value={season.title}
                  onChange={e=>setSeason(s=>({...s,title:e.target.value}))}/></div>
                <div><Label>Tipo</Label><select className={inputStyle} value={season.season_type}
                  onChange={e=>setSeason(s=>({...s,season_type:e.target.value}))}>
                  {Object.entries(TYPE).map(([k,label])=><option value={k} key={k}>{label}</option>)}
                </select></div>
                <div><Label>Fecha de inicio</Label><input className={inputStyle} required type="date"
                  value={season.start_date} onChange={e=>setSeason(s=>({...s,start_date:e.target.value}))}/></div>
                <div><Label>Fecha final (incluida)</Label><input className={inputStyle} required
                  type="date" min={season.start_date||undefined} value={season.end_date}
                  onChange={e=>setSeason(s=>({...s,end_date:e.target.value}))}/></div>
                <div><Label>Estadía mínima (noches, opcional)</Label><input className={inputStyle}
                  type="number" min="1" max="30" step="1" value={season.min_nights}
                  onChange={e=>setSeason(s=>({...s,min_nights:e.target.value}))}/></div>
                <div><Label>Variación sugerida (%)</Label><input className={inputStyle}
                  type="number" min="-30" max="50" step="0.01"
                  value={season.proposed_adjustment_percent}
                  onChange={e=>setSeason(s=>({...s,proposed_adjustment_percent:e.target.value}))}/></div>
                <div><Label>Adelanto sugerido (%)</Label><input className={inputStyle}
                  type="number" min="0" max="100" step="0.01" value={season.deposit_percent}
                  onChange={e=>setSeason(s=>({...s,deposit_percent:e.target.value}))}/></div>
                <div><Label>Observaciones</Label><textarea className={inputStyle} rows={2}
                  maxLength={500} value={season.note}
                  onChange={e=>setSeason(s=>({...s,note:e.target.value}))}/></div>
              </div>
              <button className={actionStyle+" mt-6"} type="submit" disabled={saving}>
                Proponer temporada
              </button>
            </form>
            <ReviewList items={data.seasons||[]} type="seasons" canApprove={canApprove}
              decision={decide}/>
            <section className="mt-6 bg-white p-5 rounded-2xl border border-[#eadfce]">
              <h2 className="text-xl font-bold">Temporadas registradas</h2>
              <div className="mt-4 space-y-2">{data.seasons.length===0?
                <p className="text-[#6f6258]">Aún no hay temporadas registradas.</p>:
                data.seasons.map(s=>(
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#eadfce] p-4">
                    <div><p className="font-semibold">{s.title}</p><p className="text-sm text-[#6f6258]">
                      {formatDay(s.start_date)} — {formatDay(s.end_date)} · {TYPE[s.season_type]}
                    </p></div><Badge status={s.status}/>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {data&&tab==="rates"&&(
          <>
            <form onSubmit={proposeRate} className="mt-6 bg-white border border-[#eadfce] rounded-2xl p-5 md:p-7">
              <h2 className="text-2xl font-bold text-[#2d261f]">Proponer tarifa por fechas</h2>
              <p className="mt-2 text-[#6f6258]">La tarifa sugerida solo se registra. El precio publicado no cambiará por esta operación.</p>
              <div className="mt-6 grid sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <Label>Categoría de habitación</Label>
                  <select required className={inputStyle} value={rate.category_slug}
                    onChange={e=>setRate(s=>({...s,category_slug:e.target.value}))}>
                    <option value="">Selecciona una categoría</option>
                    {(data.categories||[]).map(cat=><option key={cat.slug} value={cat.slug}>
                      {cat.name} — Base {formatSoles(cat.price_per_night)}
                    </option>)}
                  </select>
                </div>
                <div><Label>Desde</Label><input required type="date" className={inputStyle}
                  value={rate.start_date} onChange={e=>setRate(s=>({...s,start_date:e.target.value}))}/></div>
                <div><Label>Hasta (incluido)</Label><input required type="date" className={inputStyle}
                  min={rate.start_date||undefined} value={rate.end_date}
                  onChange={e=>setRate(s=>({...s,end_date:e.target.value}))}/></div>
                <div><Label>Precio propuesto por noche (S/)</Label><input required type="number"
                  min="1" max="10000" step="0.01" className={inputStyle} value={rate.suggested_price}
                  onChange={e=>setRate(s=>({...s,suggested_price:e.target.value}))}/></div>
                <div className="rounded-xl bg-[#f7f1e8] p-4" aria-live="polite">
                  <p className="text-sm text-[#6f6258]">Comparación referencial</p>
                  <p className="mt-1 text-lg font-bold">{base?formatSoles(base):"Selecciona categoría"}</p>
                  <p className="text-sm text-[#6f6258]">Variación: {difference===null?"-":difference+" %"}</p>
                  <p className="text-xs text-[#6f6258] mt-2">Límite de propuesta: -30 % a +50 %</p>
                </div>
                <div className="sm:col-span-2">
                  <Label>Motivo de la propuesta</Label>
                  <textarea required maxLength={500} rows={3} className={inputStyle}
                    placeholder="Ejemplo: alta demanda prevista por festividad local"
                    value={rate.reason} onChange={e=>setRate(s=>({...s,reason:e.target.value}))}/>
                </div>
              </div>
              <button className={actionStyle+" mt-6"} type="submit" disabled={saving}>
                Enviar tarifa para aprobación
              </button>
            </form>
            <ReviewList items={data.rates||[]} type="rates" canApprove={canApprove}
              decision={decide}/>
            <section className="mt-6 bg-white p-5 rounded-2xl border border-[#eadfce]">
              <h2 className="text-xl font-bold">Historial de tarifas propuestas</h2>
              <div className="mt-4 space-y-2">{data.rates.length===0?
                <p className="text-[#6f6258]">Aún no se han sugerido tarifas.</p>:
                data.rates.map(x=>(
                  <div key={x.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#eadfce] p-4">
                    <div><p className="font-semibold">{x.category_slug} · {formatSoles(x.suggested_price)}</p>
                      <p className="text-sm text-[#6f6258]">{formatDay(x.start_date)} — {formatDay(x.end_date)}</p></div>
                    <Badge status={x.status}/>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
        <p className="mt-8 mb-12 text-sm text-[#6f6258]">
          El registro de propuestas es independiente de los bloqueos del calendario operativo.
          Las reservas y precios publicados siguen usando los valores vigentes del sistema.
        </p>
      </div>
    </main>
  );
}
