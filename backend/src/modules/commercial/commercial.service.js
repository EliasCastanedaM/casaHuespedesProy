import { pool } from "../../config/db.js";

// Solo campos comerciales explícitamente admitidos. Las reglas de
// automatización/seguridad quedan inmutables desde esta interfaz.
export const EDITABLE_RULES = Object.freeze({
  mascotas: {
    amount_pen: { type: "number", min: 0, max: 1000 },
    charge_frequency: { type: "choice", values: [null, "pet_per_night", "per_stay"] },
  },
  ninos_9_mas: { adult_rate_confirmed: { type: "boolean" } },
  ninos_5_8: { percent_of_min_max_differential: { type: "number", min: 0, max: 100 } },
  grupos_8: { min_total_guests: { type: "integer", min: 8, max: 100 } },
  rango_anual: {
    lower_percent: { type: "number", min: -30, max: 0 },
    upper_percent: { type: "number", min: 0, max: 50 },
  },
  reduccion_ocupacion: { subtract_pen_per_missing_guest: { type: "number", min: 0, max: 200 } },
  estadia_min_feriado_finsemana: { nights: { type: "integer", min: 1, max: 30 } },
  estadia_min_feriado_suelto: { nights: { type: "integer", min: 1, max: 30 } },
  adelanto_temporada_alta: { deposit_percent: { type: "number", min: 0, max: 100 } },
});

export function badRequest(message, code = 400) {
  const err = new Error(message);
  err.statusCode = code;
  return err;
}
const validText = (value, max) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
const cleanNote = (note) => typeof note === "string" ? note.trim().slice(0,500) : null;

export function validateRuleChanges(code, changes) {
  const spec = EDITABLE_RULES[code];
  if (!spec) throw badRequest("Esta regla es de solo lectura; consulta al administrador para modificarla.");
  if (!changes || Array.isArray(changes) || typeof changes !== "object") {
    throw badRequest("Selecciona al menos un cambio válido.");
  }
  const entries = Object.entries(changes);
  if (!entries.length) throw badRequest("No has cambiado ningún valor.");
  const output = {};
  for (const [key, val] of entries) {
    const field = spec[key];
    if (!field) throw badRequest("Campo no editable: " + key);
    if (field.type === "choice") {
      if (!field.values.includes(val)) throw badRequest("Selecciona una opción permitida para " + key);
    } else if (field.type === "boolean") {
      if (typeof val !== "boolean") throw badRequest("El valor debe ser sí o no.");
    } else {
      if (typeof val !== "number" || !Number.isFinite(val) ||
          val < field.min || val > field.max ||
          (field.type === "integer" && !Number.isInteger(val))) {
        throw badRequest("Revisa el importe o porcentaje de " + key);
      }
    }
    output[key] = val;
  }
  return output;
}

export function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T12:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === value;
}
export function dateRange(from,to) {
  if (!validDate(from) || !validDate(to) || from > to) throw badRequest("Selecciona fechas de inicio y fin válidas.");
}
const validNumberOrNull = (n,min,max) => n === null || n === undefined || (
  typeof n === "number" && Number.isFinite(n) && n >= min && n <= max
);

export function validateSeason(input) {
  if (!validText(input?.title,120)) throw badRequest("Introduce un nombre de temporada (máximo 120 caracteres).");
  if (!["high","holiday","event"].includes(input?.season_type)) throw badRequest("Selecciona un tipo de temporada.");
  dateRange(input.start_date,input.end_date);
  if (!validNumberOrNull(input.min_nights,1,30) ||
      (input.min_nights != null && !Number.isInteger(input.min_nights))) throw badRequest("Las noches mínimas deben ser un número entero entre 1 y 30.");
  if (!validNumberOrNull(input.proposed_adjustment_percent,-30,50)) throw badRequest("El ajuste debe estar entre -30 % y +50 %.");
  if (!validNumberOrNull(input.deposit_percent,0,100)) throw badRequest("El adelanto debe estar entre 0 % y 100 %.");
  return {
    title: input.title.trim(), season_type: input.season_type,
    start_date: input.start_date, end_date: input.end_date,
    min_nights: input.min_nights ?? null,
    proposed_adjustment_percent: input.proposed_adjustment_percent ?? null,
    deposit_percent: input.deposit_percent ?? null,
    note: cleanNote(input.note),
  };
}

export function validateRate(input) {
  if (!/^[a-z0-9-]{1,100}$/.test(String(input?.category_slug || ""))) throw badRequest("Selecciona una categoría.");
  dateRange(input.start_date,input.end_date);
  if (typeof input.suggested_price !== "number" || !Number.isFinite(input.suggested_price) ||
      input.suggested_price <= 0 || input.suggested_price > 10000) throw badRequest("Introduce una tarifa positiva válida.");
  if (!validText(input.reason,500)) throw badRequest("Indica el motivo de la propuesta.");
  return {
    category_slug: input.category_slug,
    start_date: input.start_date, end_date: input.end_date,
    suggested_price: Math.round(input.suggested_price * 100) / 100,
    reason: input.reason.trim(),
  };
}

async function transaction(fn, database = pool) {
  const db = await database.connect();
  try {
    await db.query("BEGIN");
    const result = await fn(db);
    await db.query("COMMIT");
    return result;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}

export async function getCommercialOverview(db = pool) {
  const [rules,seasons,rates,changes,categories] = await Promise.all([
    db.query("SELECT code,title,rule_category,config,review_status,active,updated_at FROM public.hotel_policy_rules ORDER BY rule_category,title"),
    db.query("SELECT * FROM public.hotel_seasons ORDER BY start_date DESC,id DESC LIMIT 150"),
    db.query("SELECT * FROM public.hotel_rate_proposals ORDER BY created_at DESC,id DESC LIMIT 150"),
    db.query("SELECT * FROM public.hotel_rule_proposals ORDER BY created_at DESC,id DESC LIMIT 150"),
    db.query("SELECT slug,name,capacity,price_per_night FROM public.room_categories WHERE is_active=TRUE ORDER BY display_order"),
  ]);
  return {
    rules: rules.rows, seasons: seasons.rows,
    rates: rates.rows, rule_proposals: changes.rows,
    categories: categories.rows,
    editable_rule_fields: EDITABLE_RULES,
    note: "La aprobación de temporadas y tarifas NO modifica aún los precios de reservas, Booking ni Airbnb.",
  };
}

export async function proposeRule(code, data, user, db = pool) {
  const changes = validateRuleChanges(code,data?.changes);
  const original = await db.query(
    "SELECT code,config,updated_at FROM public.hotel_policy_rules WHERE code=$1 AND active=TRUE",
    [code]
  );
  const rule = original.rows[0];
  if (!rule) throw badRequest("Regla no encontrada.",404);
  const merged = { ...rule.config, ...changes };
  if (code === "rango_anual" && Number(merged.lower_percent) >= Number(merged.upper_percent)) {
    throw badRequest("El mínimo debe ser inferior al máximo.");
  }
  const q = await db.query(
    `INSERT INTO public.hotel_rule_proposals
      (rule_code,proposed_config,previous_updated_at,note,proposed_by)
     VALUES($1,$2::jsonb,$3,$4,$5) RETURNING *`,
    [code,JSON.stringify(merged),rule.updated_at,cleanNote(data.note),String(user.email||user.id)]
  );
  return q.rows[0];
}

export async function proposeSeason(data,user,db=pool) {
  const value=validateSeason(data);
  const q=await db.query(
    `INSERT INTO public.hotel_seasons
       (title,season_type,start_date,end_date,min_nights,proposed_adjustment_percent,deposit_percent,note,proposed_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [value.title,value.season_type,value.start_date,value.end_date,value.min_nights,
      value.proposed_adjustment_percent,value.deposit_percent,value.note,String(user.email||user.id)]
  );
  return q.rows[0];
}

export async function proposeRate(data,user,db=pool) {
  const value=validateRate(data);
  const cat = await db.query(
    "SELECT slug,price_per_night FROM public.room_categories WHERE slug=$1 AND is_active=TRUE",
    [value.category_slug]
  );
  const base=Number(cat.rows[0]?.price_per_night);
  if (!Number.isFinite(base)||base<=0) throw badRequest("Categoría no disponible.",404);
  const percent=(value.suggested_price/base-1)*100;
  if (percent < -30.00001 || percent > 50.00001) {
    throw badRequest("La propuesta debe estar entre -30 % y +50 % de la tarifa Full.");
  }
  const q=await db.query(
    `INSERT INTO public.hotel_rate_proposals
       (category_slug,base_price_snapshot,suggested_price,start_date,end_date,reason,proposed_by)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [value.category_slug,base,value.suggested_price,value.start_date,
      value.end_date,value.reason,String(user.email||user.id)]
  );
  return q.rows[0];
}

export async function decideRule(id,decision,user,db=pool) {
  if (!["approved","rejected"].includes(decision)) throw badRequest("Decisión no válida.");
  return transaction(async client=>{
    const res=await client.query("SELECT * FROM public.hotel_rule_proposals WHERE id=$1 FOR UPDATE",[id]);
    const item=res.rows[0];
    if (!item) throw badRequest("Propuesta no encontrada.",404);
    if (item.status!=="pending") throw badRequest("La propuesta ya fue revisada.",409);
    if (decision==="approved") {
      const current=await client.query(
        "SELECT config,updated_at FROM public.hotel_policy_rules WHERE code=$1 AND active=TRUE FOR UPDATE",
        [item.rule_code]
      );
      if (!current.rows.length || new Date(current.rows[0].updated_at).getTime() !==
          new Date(item.previous_updated_at).getTime()) {
        throw badRequest("La regla cambió desde que se creó la propuesta. Revisa los datos antes de aprobar.",409);
      }
      const newConfig=item.proposed_config;
      const currentConfig=current.rows[0].config;
      const delta=Object.fromEntries(Object.entries(newConfig).filter(([k,v])=>
        JSON.stringify(v)!==JSON.stringify(currentConfig[k])));
      validateRuleChanges(item.rule_code,delta);
      // Una regla todavía ambigua no queda marcada como confirmada.
      if (item.rule_code==="mascotas" && !newConfig.charge_frequency)
        throw badRequest("Confirma primero si la mascota se cobra por noche o por estadía.");
      if (item.rule_code==="ninos_9_mas" && newConfig.adult_rate_confirmed!==true)
        throw badRequest("Confirma la tarifa desde 9 años antes de aprobar esta regla.");
      await client.query(
        `UPDATE public.hotel_policy_rules SET config=$1::jsonb,review_status='verified',
          updated_at=now() WHERE code=$2`,
        [JSON.stringify(newConfig),item.rule_code]
      );
    }
    const out=await client.query(
      `UPDATE public.hotel_rule_proposals
       SET status=$1,decided_by=$2,decided_at=now() WHERE id=$3 RETURNING *`,
      [decision,String(user.email||user.id),id]
    );
    return out.rows[0];
  },db);
}

export async function decideSeason(id,decision,user,db=pool) {
  if (!["approved","rejected"].includes(decision)) throw badRequest("Decisión no válida.");
  return transaction(async client=>{
    const r=await client.query("SELECT * FROM public.hotel_seasons WHERE id=$1 FOR UPDATE",[id]);
    const item=r.rows[0];
    if (!item) throw badRequest("Temporada no encontrada.",404);
    if (item.status!=="pending") throw badRequest("La temporada ya fue revisada.",409);
    if(decision==="approved") {
      const conflicts=await client.query(
        `SELECT id FROM public.hotel_seasons WHERE id<>$1 AND status='approved'
          AND season_type=$2 AND start_date <= $4 AND end_date >= $3 LIMIT 1`,
        [id,item.season_type,item.start_date,item.end_date]
      );
      if(conflicts.rows.length) throw badRequest("Ya existe una temporada aprobada del mismo tipo para esas fechas.",409);
    }
    const out=await client.query(
      `UPDATE public.hotel_seasons SET status=$1,decided_by=$2,decided_at=now()
       WHERE id=$3 RETURNING *`,[decision,String(user.email||user.id),id]
    );
    return out.rows[0];
  },db);
}

export async function decideRate(id,decision,user,db=pool) {
  if (!["approved","rejected"].includes(decision)) throw badRequest("Decisión no válida.");
  return transaction(async client=>{
    const r=await client.query("SELECT * FROM public.hotel_rate_proposals WHERE id=$1 FOR UPDATE",[id]);
    const item=r.rows[0];
    if(!item) throw badRequest("Propuesta no encontrada.",404);
    if(item.status!=="pending") throw badRequest("La tarifa ya fue revisada.",409);
    // Una aprobación documenta autorización humana. Este módulo NO altera
    // room_categories ni cobros. La conexión al motor de precios es otra fase.
    const out=await client.query(
      `UPDATE public.hotel_rate_proposals SET status=$1,decided_by=$2,decided_at=now()
       WHERE id=$3 RETURNING *`,[decision,String(user.email||user.id),id]
    );
    return out.rows[0];
  },db);
}
