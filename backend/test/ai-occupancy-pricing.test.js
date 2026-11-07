import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/config/db.js";
import { generateAiReply } from "../src/modules/ai/ai.service.js";
import { handleGlobalReservationTurn } from "../src/modules/ai/ai.reservation.js";
import { quoteForCategory, selectOccupancyQuote, formatOccupancyQuote, processingQuoteReply } from "../src/modules/ai/ai.occupancy-pricing.js";
import { getReservationRoomCategoriesService } from "../src/modules/rooms/roomOccupancyRates.service.js";
import OpenAI from "openai";
import { env } from "../src/config/env.js";
import { guestCategoryDescription } from "../src/modules/ai/ai.category-info.js";
import { processMetaMessage } from "../src/modules/meta/meta.service.js";

const categories = [
  ["matrimonial", "Matrimonial Estándar", 2, [100,120]],
  ["matrimonial-ejecutiva", "Matrimonial Ejecutiva", 2, [120,140]],
  ["doble", "Doble - 2 Camas", 2, [120,140]],
  ["triple", "Triple - 3 Camas", 3, [170,190,210]],
  ["familiar", "Familiar 1", 5, [170,190,210,230,250]],
  ["familiar-2", "Familiar 2", 5, [170,190,210,230,250]],
].map(([slug,name,capacity,rates]) => ({ slug,name,capacity,price_per_night: rates.at(-1),
  occupancy_rates: Object.fromEntries(rates.map((amount,i) => [i+1,amount])) }));
const stay = (extra = {}) => ({ check_in: "2026-11-20", check_out: "2026-11-22", adults: 2, children: 0, child_ages: [], pets: 0, ...extra });

test("la capacidad mínima evita ocupar una familiar con grupos pequeños y ofrece mayor valor primero", () => {
  for (const [adults,slug,amount] of [[1,"matrimonial-ejecutiva",120],[2,"matrimonial-ejecutiva",140],[3,"triple",210],[4,"familiar",230],[5,"familiar",250]]) {
    const {quote} = selectOccupancyQuote(categories, stay({adults}));
    assert.equal(quote.category_slug,slug);
    assert.equal(quote.nightly_amount,amount);
    assert.equal(quote.total_amount,amount*2);
  }
  const top = selectOccupancyQuote(categories,stay()).quote;
  const lower = selectOccupancyQuote(categories,stay({pricing_quote:top}),{cheaper:true}).quote;
  assert.equal(lower.category_slug,"matrimonial");
  assert.equal(lower.nightly_amount,120);
  assert.equal(selectOccupancyQuote(categories,stay({pricing_quote:lower}),{cheaper:true}).reason,"no_lower_price");
});

test("los niños cuentan para capacidad y el suplemento usa adultos menos tarifa individual", () => {
  const cases = [
    [{adults:2,children:1,child_ages:[6]},"triple",200],
    [{adults:2,children:2,child_ages:[6,3]},"familiar",200],
    [{adults:2,children:1,child_ages:[3]},"triple",190],
    [{adults:2,children:1,child_ages:[9]},"triple",210],
    [{adults:1,children:1,child_ages:[6]},"matrimonial-ejecutiva",120],
    [{adults:4,children:1,child_ages:[6]},"familiar",250],
    [{adults:2,children:2,child_ages:[6,8]},"familiar",210],
  ];
  for (const [state,slug,amount] of cases) {
    const quote = selectOccupancyQuote(categories,stay(state)).quote;
    assert.equal(quote.category_slug,slug);
    assert.equal(quote.nightly_amount,amount, JSON.stringify(state));
  }
  assert.equal(selectOccupancyQuote(categories,stay({adults:4,children:1,child_ages:[6]})).quote.child_cap_applied,true);
  assert.equal(selectOccupancyQuote(categories,stay({pets:2})).quote.total_amount,360);
});

test("respeta camas, presupuesto, preferencias y categoría explícita sin sobrepasar capacidad", () => {
  assert.equal(selectOccupancyQuote(categories,stay({bed_preference:"separate"})).quote.category_slug,"doble");
  assert.equal(selectOccupancyQuote(categories,stay({max_nightly_budget:125})).quote.category_slug,"matrimonial");
  assert.equal(selectOccupancyQuote(categories,stay({max_nightly_budget:90})).reason,"budget");
  assert.equal(selectOccupancyQuote(categories,stay({adults:3,category_slug:"matrimonial"}),{explicitCategory:true}).reason,"category_capacity");
  const views = categories.map(c => ({...c,description:c.slug === "familiar-2" ? "terraza y vista al mar" : "vista interior"}));
  assert.equal(selectOccupancyQuote(views,stay({adults:4,preferences:"vista al mar"})).quote.category_slug,"familiar-2");
  assert.equal(selectOccupancyQuote(categories,stay({adults:6})).reason,"multiple_rooms");
  assert.equal(selectOccupancyQuote(categories,stay({adults:8})).reason,"multiple_rooms");
});

test("rechaza datos incompletos, edades inválidas y tarifas ausentes; no expone cálculo interno", () => {
  for (const extra of [{children:1,child_ages:[]},{children:1,child_ages:[-1]},{children:1,child_ages:[18]},{adults:0},{pets:-1},{check_out:"2026-11-19"}]) {
    assert.equal(quoteForCategory(categories[3],stay(extra)),null);
  }
  assert.equal(quoteForCategory({...categories[3],occupancy_rates:{1:170}},stay()),null);
  const quote = selectOccupancyQuote(categories,stay({children:1,child_ages:[6]})).quote;
  for (const lang of ["es","en","pt","fr"]) {
    const reply = formatOccupancyQuote(quote,lang);
    assert.match(reply,/S\/ 200\.00/);
    assert.match(reply,/S\/ 400\.00/);
    assert.doesNotMatch(reply,/50|diferencial|tarifa [12345]|Full|5 a 8|9 años|priced_adults/);
  }
});

test("el lector de tarifas es interno y conserva la matriz aprobada", async () => {
  const db = { query: async (sql) => sql.includes("FROM room_categories rc") ? {rows:categories} : {rows:categories.flatMap(c=>Object.entries(c.occupancy_rates).map(([occupancy,amount])=>({category_slug:c.slug,occupancy,amount})))} };
  const actual = await getReservationRoomCategoriesService(db);
  for (const c of actual) assert.deepEqual(c.occupancy_rates,categories.find(x=>x.slug===c.slug).occupancy_rates);
});

function mockDatabase(t) {
  const contexts=new Map();
  t.mock.method(pool,"query",async (sql,params=[])=>{
    const key=params.slice(0,2).join(":");
    if(sql.includes("FROM room_categories rc")) return {rows:categories};
    if(sql.includes("FROM public.room_category_occupancy_rates")) return {rows:categories.flatMap(c=>Object.entries(c.occupancy_rates).map(([occupancy,amount])=>({category_slug:c.slug,occupancy,amount})))};
    if(sql.includes("SELECT booking_context")) return {rows:contexts.has(key)?[{booking_context:structuredClone(contexts.get(key)),booking_context_expires_at:new Date(Date.now()+86400000)}]:[]};
    if(sql.includes("INSERT INTO ai_conversations")&&sql.includes("booking_context")){contexts.set(key,JSON.parse(params[2]));return {rows:[]};}
    if(sql.includes("SELECT author, content")) return {rows:[]};
    throw new Error("Unexpected SQL: "+sql);
  });
  return contexts;
}

test("los tres canales cotizan, procesan, permiten precio menor y pasan al equipo solo al aceptar", async(t)=>{
  const contexts=mockDatabase(t);
  for(const channel of ["whatsapp","instagram","facebook"]){
    const externalUserId="quote-"+channel;
    const notices=[];
    const send=(message)=>generateAiReply({channel,externalUserId,message,now:new Date("2026-11-07T18:00:00Z")},{onProcessing:async(text)=>notices.push(text)});
    const initial=await send("Quiero reservar del 20/11/2026 al 22/11/2026 para 2 adultos sin niños y sin mascotas");
    assert.equal(initial.mode,"occupancy_quote");
    assert.match(initial.reply,/Matrimonial Ejecutiva.*S\/ 140\.00.*S\/ 280\.00/);
    assert.deepEqual(notices,[processingQuoteReply()]);
    let state=contexts.get(channel+":"+externalUserId).whatsapp_mvp;
    assert.equal(state.state,"quoted");
    assert.equal(state.customer_name,undefined);
    assert.equal(state.customer_email,undefined);
    const cheaper=await send("¿Hay algo más barato?");
    assert.equal(cheaper.mode,"occupancy_quote");
    assert.match(cheaper.reply,/Matrimonial Estándar.*S\/ 120\.00/);
    const accepted=await send("Sí");
    assert.equal(accepted.mode,"human_review_required");
    state=contexts.get(channel+":"+externalUserId).whatsapp_mvp;
    assert.equal(state.pricing_quote.total_amount,240);
    assert.equal(state.state,"handoff");
    assert.doesNotMatch(accepted.reply,/nombre|correo|documento/i);
  }
});

test("pregunta edades sin datos personales, recotiza niños y cambios de grupo",async(t)=>{
  const contexts=mockDatabase(t);
  const input={channel:"whatsapp",externalUserId:"family-quote"};
  const send=message=>generateAiReply({...input,message});
  const ages=await send("Quiero reservar del 20/11/2026 al 22/11/2026 para 2 adultos y 2 niños sin mascotas");
  assert.match(ages.reply,/edades/);
  assert.doesNotMatch(ages.reply,/nombre|correo|documento|nacimiento/);
  const quoted=await send("6 y 3 años");
  assert.match(quoted.reply,/Familiar 1.*S\/ 200\.00.*S\/ 400\.00/);
  const changed=await send("Ahora son 4 adultos y 1 niño de 6 años");
  assert.match(changed.reply,/Familiar 1.*S\/ 250\.00.*S\/ 500\.00/);
  assert.equal(contexts.get("whatsapp:family-quote").whatsapp_mvp.pricing_quote.child_cap_applied,true);
  const fewer=await send("Somos 3 personas sin niños");
  assert.match(fewer.reply,/Triple - 3 Camas.*S\/ 210\.00/);
});

test("tarifas modificadas entre cotizar y aceptar obligan a mostrar la nueva cotización",async(t)=>{
  const contexts=mockDatabase(t);
  const input={channel:"facebook",externalUserId:"changed-price"};
  await generateAiReply({...input,message:"Quiero reservar del 20/11/2026 al 22/11/2026 para 2 adultos sin niños y sin mascotas"});
  const state=contexts.get("facebook:changed-price").whatsapp_mvp;
  state.pricing_quote.total_amount=1;
  const result=await generateAiReply({...input,message:"Sí"});
  assert.equal(result.mode,"occupancy_quote");
  assert.match(result.reply,/280\.00/);
});

for(const channel of ["whatsapp","instagram","facebook"]){
  test(`${channel}: aviso separado y persistido, recuperación sin repetirlo`,async()=>{
    const outgoing=new Map();let nextId=100;let failFinal=true;const sent=[];
    const message={channel,externalUserId:"transport-quote",messageId:"incoming-quote",text:"No",messageType:"text"};
    const deps={claim:async()=>({id:42}),release:async()=>{},complete:async()=>{},getHandoff:async()=>false,setHandoff:async()=>{},loadHistory:async()=>[],
      findOutgoing:async()=>outgoing.get("assistant")||null,findProcessing:async()=>outgoing.get("system")||null,
      createOutgoing:async(_m,content,author)=>{const row={id:nextId++,content,author,status:"pending"};outgoing.set(author,row);return row;},
      generateReply:async(_input,{onProcessing})=>{await onProcessing(processingQuoteReply());return {mode:"occupancy_quote",reply:"Total S/ 400.00"};},
      sendReply:async(_message,content)=>{if(content.includes("Total")&&failFinal){const e=new Error("Invalid recipient");e.permanent=true;throw e;}sent.push(content);return {messages:[{id:"sent-"+sent.length}]};},
      recordOutgoing:async(_m,_c,_a,result,error,_db,row)=>{row.status=error?"failed":"sent";return row;},sleep:async()=>{},
    };
    await assert.rejects(processMetaMessage(message,deps));
    assert.deepEqual(sent,[processingQuoteReply()]);
    failFinal=false;
    assert.equal((await processMetaMessage(message,deps)).status,"replied_recovered");
    assert.deepEqual(sent,[processingQuoteReply(),"Total S/ 400.00"]);
    assert.equal(outgoing.size,2);
  });
}

test("un aviso previo no se confunde con la respuesta final cuando la generación se reintenta",async()=>{
  const sent=[];let fail=true;let processing;
  const deps={claim:async()=>({id:42}),release:async()=>{},complete:async()=>{},getHandoff:async()=>false,setHandoff:async()=>{},loadHistory:async()=>[],findOutgoing:async()=>null,
    findProcessing:async()=>processing,createOutgoing:async(_m,content,author)=>{const row={content,author,status:"pending"};if(author==="system")processing=row;return row;},
    generateReply:async(_i,{onProcessing})=>{await onProcessing(processingQuoteReply());if(fail)throw new Error("database unavailable");return {mode:"occupancy_quote",reply:"Total S/ 400.00"};},
    sendReply:async(_m,c)=>{sent.push(c);return {};},recordOutgoing:async(_m,_c,_a,_s,_e,_db,row)=>{row.status="sent";return row;},sleep:async()=>{},
  };
  const m={channel:"whatsapp",externalUserId:"retry-quote",messageId:"retry",text:"No",messageType:"text"};
  await assert.rejects(processMetaMessage(m,deps));fail=false;
  assert.equal((await processMetaMessage(m,deps)).status,"replied");
  assert.deepEqual(sent,[processingQuoteReply(),"Total S/ 400.00"]);
});


test("descripciones de categoría ocultan etiquetas Full y números físicos",()=>{
  const text=guestCategoryDescription("Habitación para 2 huéspedes. La unidad 505 tiene vista al mar; las demás tienen vista interior. Temporada normal, tarifa Full con IGV incluido. Desayuno no incluido.");
  assert.match(text,/Una de las habitaciones tiene vista al mar/);
  assert.match(text,/Desayuno no incluido/);
  assert.doesNotMatch(text,/505|Full|tarifa/);
});

test("consultas de precios mantienen el alcance y preguntan solo lo pendiente",async(t)=>{
  mockDatabase(t);
  const old=env.openai.apiKey;env.openai.apiKey="test-no-network";t.after(()=>{env.openai.apiKey=old;});
  t.mock.method(OpenAI.Responses.prototype,"create",async req=>({output_text:req.input.includes("bitcoin")?"FUERA":"HOTEL",output:[]}));
  const input={channel:"instagram",externalUserId:"price-info"};
  const foreign=await generateAiReply({...input,message:"Quiero saber los precios de bitcoin"});
  assert.equal(foreign.mode,"outside_hotel_scope");
  const hotel=await generateAiReply({...input,message:"¿Qué precios tienen?"});
  assert.equal(hotel.mode,"global_reservation_collecting");
  assert.match(hotel.reply,/fechas/);
  assert.doesNotMatch(hotel.reply,/S\/|nombre|correo/);
  const variation=await generateAiReply({...input,message:"¿Los precios cambian según las personas?"});
  assert.equal(variation.mode,"price_variation_information");
  assert.match(variation.reply,/categoría elegida y la cantidad de huéspedes/);
});

test("la bienvenida con menú precede al aviso de cálculo en un chat nuevo",async()=>{
  const sent=[];
  await processMetaMessage({channel:"whatsapp",externalUserId:"new-quote",messageId:"new-quote",text:"Quiero reservar",messageType:"text"},{
    claim:async()=>({id:43}),release:async()=>{},complete:async()=>{},getHandoff:async()=>false,setHandoff:async()=>{},loadHistory:async()=>[],
    isFirstMetaIncomingMessage:async()=>true,
    generateReply:async(_i,{onProcessing})=>{await onProcessing(processingQuoteReply());return {reply:"Cotización S/ 400.00",mode:"occupancy_quote"};},
    sendReply:async(_m,text)=>{sent.push(text);return {};},recordOutgoing:async()=>{},sleep:async()=>{},
  });
  assert.equal(sent.length,2);
  assert.ok(sent[0].startsWith("¡Hola!"));
  assert.match(sent[0],/Habitaciones y tarifas/);
  assert.match(sent[0],/En un momento te respondo/);
  assert.equal(sent[1],"Cotización S/ 400.00");
});
