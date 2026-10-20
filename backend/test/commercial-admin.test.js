import test from "node:test";
import assert from "node:assert/strict";
import {
  validateRuleChanges,validateSeason,validateRate,validDate,
  proposeRule,proposeSeason,proposeRate,
  decideRule,decideRate,decideSeason,
} from "../src/modules/commercial/commercial.service.js";

const admin={id:1,email:"admin@hotel.test",role:"admin"};
const ruleDate=new Date("2026-10-19T20:00:00.000Z");
const mockRule={
  code:"mascotas",updated_at:ruleDate,
  config:{amount_pen:20,vat_included:true,charge_frequency:null,
    automatic_final_quote:false,approval_required:true},
};

test("los cambios no pueden alterar banderas de automatización ni seguridad",()=>{
  assert.deepEqual(validateRuleChanges("mascotas",{amount_pen:30,charge_frequency:"per_stay"}),
    {amount_pen:30,charge_frequency:"per_stay"});
  for(const changes of [
    {automatic_final_quote:true},
    {approval_required:false},
    {amount_pen:-10},
    {amount_pen:"30"},
    {charge_frequency:"por_dia"},
    {},
  ]) assert.throws(()=>validateRuleChanges("mascotas",changes));
  assert.throws(()=>validateRuleChanges("tarifa_full",{vat_included:false}));
});

test("calendario valida días reales, rango y límites comerciales",()=>{
  assert.equal(validDate("2026-11-31"),false);
  assert.equal(validDate("2026-11-30"),true);
  const base={
    title:"Feriado",season_type:"holiday",
    start_date:"2026-12-23",end_date:"2026-12-26",
    min_nights:3,proposed_adjustment_percent:15,deposit_percent:50,
  };
  assert.equal(validateSeason(base).min_nights,3);
  for(const bad of [
    {...base,start_date:"2026-12-29"},
    {...base,start_date:"2026-11-31"},
    {...base,proposed_adjustment_percent:55},
    {...base,deposit_percent:101},
    {...base,min_nights:0},
    {...base,season_type:"blocked"},
  ]) assert.throws(()=>validateSeason(bad));
});

test("propuesta tarifaria obliga a indicar fechas y motivo",()=>{
  const valid={category_slug:"triple",suggested_price:230,start_date:"2026-12-23",
    end_date:"2026-12-27",reason:"Demanda alta"};
  assert.equal(validateRate(valid).suggested_price,230);
  assert.throws(()=>validateRate({...valid,reason:""}));
  assert.throws(()=>validateRate({...valid,suggested_price:0}));
});

test("proponer cambio de mascotas solo crea propuesta, no cambia política",async()=>{
  const sqls=[];
  const db={async query(sql,params) {
    sqls.push(sql);
    if(sql.startsWith("SELECT code"))return {rows:[mockRule]};
    if(sql.includes("INSERT INTO public.hotel_rule_proposals")) {
      assert.equal(params[0],"mascotas");
      assert.equal(JSON.parse(params[1]).amount_pen,20);
      assert.equal(JSON.parse(params[1]).charge_frequency,"per_stay");
      return {rows:[{id:1,status:"pending"}]};
    }
    throw Error("unexpected SQL");
  }};
  const result=await proposeRule("mascotas",{changes:{charge_frequency:"per_stay"},note:"gerencia"},admin,db);
  assert.equal(result.status,"pending");
  assert.equal(sqls.some(s=>s.includes("UPDATE public.hotel_policy_rules")),false);
});

test("tarifa sugerida se limita al rango y no cambia el precio base",async()=>{
  const queries=[];
  const db={async query(sql,params){
    queries.push(sql);
    if(sql.startsWith("SELECT slug"))return {rows:[{slug:"triple",price_per_night:210}]};
    if(sql.includes("INSERT INTO public.hotel_rate_proposals"))return {rows:[{id:8,status:"pending"}]};
    throw Error("unexpected SQL");
  }};
  const params={category_slug:"triple",suggested_price:250,
    start_date:"2026-12-23",end_date:"2026-12-27",reason:"Feriado"};
  assert.equal((await proposeRate(params,admin,db)).status,"pending");
  await assert.rejects(proposeRate({...params,suggested_price:320},admin,db),
    /-30 % y \+50 %/);
  assert.equal(queries.some(s=>/UPDATE.*room_categories/i.test(s)),false);
});

function txPool(query) {
  const queries=[];
  return {
    queries,
    async connect(){
      return {
        async query(sql,params) {
          queries.push(sql);
          if(["BEGIN","COMMIT","ROLLBACK"].includes(sql))return {rows:[]};
          return query(sql,params);
        },
        release(){queries.push("release");},
      };
    },
  };
}

test("aprobación de mascotas bloquea regla aún ambigua y revierte transacción",async()=>{
  const db=txPool(async sql=>{
    if(sql.includes("FROM public.hotel_rule_proposals"))return {rows:[{
      id:3,rule_code:"mascotas",status:"pending",previous_updated_at:ruleDate,
      proposed_config:{...mockRule.config,amount_pen:25,charge_frequency:null},
    }]};
    if(sql.includes("FROM public.hotel_policy_rules"))return {rows:[mockRule]};
    throw Error("unexpected SQL");
  });
  await assert.rejects(decideRule(3,"approved",admin,db),/Confirma primero/);
  assert.ok(db.queries.includes("ROLLBACK"));
  assert.equal(db.queries.some(s=>s.includes("UPDATE public.hotel_policy_rules")),false);
});

test("aprobación válida actualiza regla dentro de transacción y registra revisor",async()=>{
  const db=txPool(async(sql,params)=>{
    if(sql.includes("FROM public.hotel_rule_proposals"))return {rows:[{
      id:3,rule_code:"mascotas",status:"pending",previous_updated_at:ruleDate,
      proposed_config:{...mockRule.config,charge_frequency:"per_stay"},
    }]};
    if(sql.includes("FROM public.hotel_policy_rules"))return {rows:[mockRule]};
    if(sql.includes("UPDATE public.hotel_policy_rules")){
      assert.equal(JSON.parse(params[0]).charge_frequency,"per_stay");
      return {rows:[]};
    }
    if(sql.includes("UPDATE public.hotel_rule_proposals"))return {rows:[{id:3,status:"approved"}]};
    throw Error("unexpected SQL");
  });
  assert.equal((await decideRule(3,"approved",admin,db)).status,"approved");
  assert.ok(db.queries.includes("COMMIT"));
});

test("temporada aprobada del mismo tipo y fechas no permite solapamiento",async()=>{
  const db=txPool(async sql=>{
    if(sql.includes("FROM public.hotel_seasons WHERE id=$1"))return {rows:[{
      id:4,status:"pending",season_type:"high",
      start_date:"2026-12-23",end_date:"2026-12-30",
    }]};
    if(sql.includes("SELECT id FROM public.hotel_seasons"))return {rows:[{id:7}]};
    throw Error("unexpected SQL");
  });
  await assert.rejects(decideSeason(4,"approved",admin,db),/Ya existe una temporada/);
  assert.ok(db.queries.includes("ROLLBACK"));
});

test("aprobar sugerencia comercial no modifica room_categories ni genera reserva",async()=>{
  const db=txPool(async sql=>{
    if(sql.includes("FROM public.hotel_rate_proposals"))return {rows:[{id:5,status:"pending",category_slug:"triple",base_price_snapshot:210}]};
    if(sql.includes("SELECT price_per_night FROM public.room_categories"))return {rows:[{price_per_night:210}]};
    if(sql.includes("UPDATE public.hotel_rate_proposals"))return {rows:[{id:5,status:"approved"}]};
    throw Error("unexpected SQL");
  });
  assert.equal((await decideRate(5,"approved",admin,db)).status,"approved");
  assert.equal(db.queries.some(q=>/room_categories|bookings|blocked_slots/.test(q)),false);
});

test("impide aprobar propuestas tarifarias si la tarifa Full ya cambió",async()=>{
  const db=txPool(async sql=>{
    if(sql.includes("FROM public.hotel_rate_proposals"))return {rows:[{id:5,status:"pending",category_slug:"triple",base_price_snapshot:210}]};
    if(sql.includes("SELECT price_per_night FROM public.room_categories"))return {rows:[{price_per_night:240}]};
    throw Error("unexpected SQL");
  });
  await assert.rejects(decideRate(5,"approved",admin,db),/tarifa base cambió/);
  assert.ok(db.queries.includes("ROLLBACK"));
  assert.equal(db.queries.some(s=>s.includes("UPDATE public.hotel_rate_proposals")),false);
});
