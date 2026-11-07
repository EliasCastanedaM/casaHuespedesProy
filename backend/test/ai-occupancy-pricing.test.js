import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/config/db.js";
import { generateAiReply, confirmGlobalReservation, updateGlobalReservationContextForHandoff } from "../src/modules/ai/ai.service.js";
import { handleGlobalReservationTurn } from "../src/modules/ai/ai.reservation.js";
import { quoteForCategory, selectOccupancyQuote, formatOccupancyQuote, processingQuoteReply } from "../src/modules/ai/ai.occupancy-pricing.js";
import { getReservationRoomCategoriesService } from "../src/modules/rooms/roomOccupancyRates.service.js";
import OpenAI from "openai";
import { env } from "../src/config/env.js";
import { collectRoomPreferences, roomFeatures, roomPreferenceMatch } from "../src/modules/rooms/roomPreferences.js";
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

function mockDatabase(t, options = {}) {
  const contexts=new Map();
  t.mock.method(pool,"query",async (sql,params=[])=>{
    const key=params.slice(0,2).join(":");
    if(sql.includes("FROM room_categories rc")) return {rows:categories};
    if(sql.includes("FROM public.room_category_occupancy_rates")) return {rows:categories.flatMap(c=>Object.entries(c.occupancy_rates).map(([occupancy,amount])=>({category_slug:c.slug,occupancy,amount})))};
    if(sql.includes("WITH requested_range") && options.failInventory)throw new Error("Inventario temporalmente inaccesible");
    if(sql.includes("WITH requested_range")) return {rows:(options.rooms || categories.map((c,i)=>({id:i+1,category_slug:c.slug,room_number:String(200+i),view_type:c.slug==="familiar-2"||c.slug==="matrimonial-ejecutiva"?"Vista al mar":"Vista interior",amenities:[],availability_status:"available"}))).filter(r=>r.availability_status==="available")};
    if(sql.includes("SELECT handoff_active")) return {rows:[{handoff_active:true}]};
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


const viewRooms=[
  {id:101,room_number:"101",category_slug:"matrimonial-ejecutiva",view_type:"Vista interior",availability_status:"available"},
  {id:505,room_number:"505",category_slug:"matrimonial-ejecutiva",view_type:"Vista al mar desde segunda fila",availability_status:"available"},
  {id:205,room_number:"205",category_slug:"matrimonial",view_type:"Vista interior",availability_status:"available"},
  {id:405,room_number:"405",category_slug:"familiar-2",view_type:"Acceso directo a terraza y vista al mar",availability_status:"available"},
  {id:203,room_number:"203",category_slug:"familiar",view_type:"Vista interior",availability_status:"available"},
  {id:202,room_number:"202",category_slug:"triple",view_type:"Vista interior",availability_status:"available"},
];

test("reconoce calle/exterior, mar, interior y ventana como preferencias distintas",()=>{
  for(const text of ["con vista a la calle","con vista hacia la calle","hacia afuera","street view","que dé a la calle","prefiero exterior","exterior"])assert.equal(collectRoomPreferences(text).view,"exterior",text);
  for(const text of ["interior","prefiero interior","quiero una interior"])assert.equal(collectRoomPreferences(text).view,"interior",text);
  assert.deepEqual(collectRoomPreferences("Prefiero vista interior y cerca a la ventana"),{view:"interior",near_window:true});
  assert.equal(collectRoomPreferences("vista al mar",{near_window:true}).near_window,true);
  assert.equal(collectRoomPreferences("ya no quiero vista al mar",{view:"sea"}).view,undefined);
  assert.equal(collectRoomPreferences("la vista no importa",{view:"interior",near_window:true}).view,undefined);
  assert.equal(roomFeatures(viewRooms[1]).near_window,null);
  assert.equal(roomPreferenceMatch(viewRooms[1],{near_window:true}),false);
  assert.equal(roomPreferenceMatch({...viewRooms[1],amenities:["cerca_ventana"]},{view:"sea",near_window:true}),true);
});

test("mar y calle reservan una unidad exterior; las alternativas mantienen categoría y capacidad",()=>{
  const decorated=categories.map(c=>({...c,available_rooms:viewRooms.filter(r=>r.category_slug===c.slug)}));
  for(const view of ["sea","exterior"]) {
    const selected=selectOccupancyQuote(decorated,stay({room_preferences:{view}})).quote;
    assert.equal(selected.category_slug,"matrimonial-ejecutiva");
    assert.equal(selected.internal_assignment.room_id,505);
  }
  const family=selectOccupancyQuote(decorated,stay({adults:4,room_preferences:{view:"sea"}})).quote;
  assert.equal(family.category_slug,"familiar-2");
  assert.equal(family.internal_assignment.room_id,405);
  const triple=selectOccupancyQuote(decorated,stay({adults:3,room_preferences:{view:"sea"}})).quote;
  assert.equal(triple.category_slug,"triple");
  assert.equal(triple.preference_fallback,true);
  assert.equal(triple.actual_view,"interior");
  assert.doesNotMatch(formatOccupancyQuote(family),/405|505|room_id|room_number/);
});

test("falta de vista propone una alternativa explícita, espera aceptación y conserva el pedido original",async(t)=>{
  const rooms=viewRooms.filter(r=>r.id!==505);
  const contexts=mockDatabase(t,{rooms});
  for(const channel of ["whatsapp","instagram","facebook"]) {
    const input={channel,externalUserId:"sea-unavailable-"+channel};
    const result=await generateAiReply({...input,message:"Quiero reservar del 20/11/2026 al 22/11/2026 para dos adultos sin niños ni mascotas, con vista al mar"});
    assert.equal(result.mode,"occupancy_quote");
    assert.match(result.reply,/no figura disponible.*alternativa.*vista interior/);
    assert.doesNotMatch(result.reply,/101|205|505|unidad|room_id/);
    let state=contexts.get(channel+":"+input.externalUserId).whatsapp_mvp;
    assert.equal(state.state,"quoted");
    assert.equal(state.room_preferences.view,"sea");
    const accepted=await generateAiReply({...input,message:"Sí"});
    assert.equal(accepted.mode,"human_review_required");
    state=contexts.get(channel+":"+input.externalUserId).whatsapp_mvp;
    assert.equal(state.room_preferences.view,"interior");
    assert.equal(state.requested_room_preferences.view,"sea");
  }
});

test("calle, interior y ventana se conservan al cambiar el grupo y al repetir datos con palabras",async(t)=>{
  const contexts=mockDatabase(t,{rooms:viewRooms});
  const input={channel:"facebook",externalUserId:"window-view"};
  const send=message=>generateAiReply({...input,message});
  const first=await send("Quiero reservar del 20/11/2026 al 22/11/2026 para 2 adultos sin niños ni mascotas con vista a la calle y cerca a la ventana");
  assert.match(first.reply,/vista al mar/);
  assert.match(first.reply,/cerca de una ventana.*verificar/);
  assert.doesNotMatch(first.reply,/505|room_id/);
  let state=contexts.get("facebook:window-view").whatsapp_mvp;
  assert.equal(state.pricing_quote.internal_assignment.room_id,505);
  assert.equal(state.room_preferences.near_window,true);
  const repeated=await send("Quiero reservar del 20/11/2026 al 22/11/2026 para dos adultos sin niños ni mascotas con vista a la calle y cerca a la ventana");
  assert.equal(repeated.mode,"occupancy_quote");
  assert.match(repeated.reply,/S\/ 140.00/);
  const changed=await send("Ahora somos cuatro adultos, sin niños ni mascotas");
  assert.match(changed.reply,/Familiar 2/);
  state=contexts.get("facebook:window-view").whatsapp_mvp;
  assert.equal(state.pricing_quote.internal_assignment.room_id,405);
  assert.equal(state.room_preferences.near_window,true);
});

test("si se ocupa la vista entre cotizar y aceptar, se ofrece la alternativa sin confirmar la anterior",async(t)=>{
  const rooms=structuredClone(viewRooms);
  const contexts=mockDatabase(t,{rooms});
  const input={channel:"instagram",externalUserId:"view-race"};
  await generateAiReply({...input,message:"Quiero reservar del 20/11/2026 al 22/11/2026 para 2 adultos sin niños ni mascotas con vista al mar"});
  rooms.find(r=>r.id===505).availability_status="blocked";
  const changed=await generateAiReply({...input,message:"Sí"});
  assert.equal(changed.mode,"occupancy_quote");
  assert.match(changed.reply,/no figura disponible.*vista interior/);
  assert.equal(contexts.get("instagram:view-race").whatsapp_mvp.state,"quoted");
});

test("inventario bloqueado no genera una cotización ni asegura disponibilidad",async(t)=>{
  mockDatabase(t,{rooms:[]});
  const result=await generateAiReply({channel:"facebook",externalUserId:"no-rooms",message:"Quiero reservar del 20/11/2026 al 22/11/2026 para 2 adultos sin niños ni mascotas con vista al mar"});
  assert.equal(result.mode,"human_review_required");
  assert.match(result.reply,/no figura una categoría compatible/);
  assert.doesNotMatch(result.reply,/S\/|505/);
});


test("validación humana comprueba vista, disponibilidad y ventana en la unidad interna exacta",async(t)=>{
  const rooms=structuredClone(viewRooms);
  const contexts=mockDatabase(t,{rooms});
  const input={channel:"facebook",externalUserId:"window-staff"};
  await generateAiReply({...input,message:"Quiero reservar del 20/11/2026 al 22/11/2026 para dos adultos sin niños ni mascotas con vista al mar y cerca de la ventana"});
  await generateAiReply({...input,message:"Sí"});
  const approval={...input,categorySlug:"matrimonial-ejecutiva",totalAmount:280};
  await assert.rejects(confirmGlobalReservation(approval),e=>e.statusCode===409);
  await assert.rejects(confirmGlobalReservation({...approval,windowPositionConfirmed:true}),e=>e.statusCode===400);
  await assert.rejects(confirmGlobalReservation({...approval,roomId:101,windowPositionConfirmed:true}),e=>e.statusCode===409);
  const confirmed=await confirmGlobalReservation({...approval,roomId:505,windowPositionConfirmed:true});
  assert.doesNotMatch(confirmed.reply,/505|101|room_id/);
  let state=contexts.get("facebook:window-staff").whatsapp_mvp;
  assert.equal(state.staff_confirmation.room_assignment.room_id,505);
  assert.equal(state.staff_confirmation.window_position_confirmed,true);
  const changed=await generateAiReply({...input,message:"Prefiero vista interior"});
  assert.equal(changed.mode,"human_review_required");
  state=contexts.get("facebook:window-staff").whatsapp_mvp;
  assert.equal(state.staff_confirmation,undefined);
  assert.equal(state.room_preferences.view,"interior");
  assert.equal(state.room_preferences.near_window,true);
});

test("si la unidad aprobada se ocupa antes de registrar, propone alternativa sin perder huéspedes ni vista original",async(t)=>{
  const rooms=structuredClone(viewRooms);
  const contexts=mockDatabase(t,{rooms});
  const input={channel:"instagram",externalUserId:"registration-race"};
  await generateAiReply({...input,message:"Quiero reservar del 20/11/2026 al 22/11/2026 para 2 adultos sin niños ni mascotas con vista al mar"});
  await generateAiReply({...input,message:"Sí"});
  const state=contexts.get("instagram:registration-race").whatsapp_mvp;
  Object.assign(state,{state:"awaiting_payment_choice",customer_name:"Ana Prueba",customer_email:"test@example.com",customer_phone:"51999999999",staff_confirmation:{confirmed:true,category_slug:"matrimonial-ejecutiva",total_amount:280,room_assignment:{room_id:505}}});
  rooms.find(r=>r.id===505).availability_status="blocked";
  t.mock.method(pool,"connect",async()=>{const e=new Error("La unidad dejó de estar disponible");e.statusCode=409;throw e;});
  const result=await generateAiReply({...input,message:"Pagar en el establecimiento"});
  assert.equal(result.mode,"occupancy_quote");
  assert.match(result.reply,/alternativa.*vista interior/);
  const saved=contexts.get("instagram:registration-race").whatsapp_mvp;
  assert.equal(saved.state,"quoted");
  assert.equal(saved.staff_confirmation,undefined);
  assert.equal(saved.adults,2);
  assert.equal(saved.room_preferences.view,"sea");
});

test("comparar vistas no cambia una preferencia ya elegida",()=>{
  const p={view:"interior",near_window:true};
  assert.deepEqual(collectRoomPreferences("¿Cuál es la diferencia entre vista interior y vista al mar?",p),p);
});


test("una caída del inventario no se confunde con falta de disponibilidad",async(t)=>{
  mockDatabase(t,{failInventory:true});
  const result=await generateAiReply({channel:"facebook",externalUserId:"inventory-error",message:"Quiero reservar del 20/11/2026 al 22/11/2026 para dos adultos sin niños ni mascotas con vista al mar"});
  assert.equal(result.mode,"human_review_required");
  assert.doesNotMatch(result.reply,/no figura|no hay|agotad|S\//);
});

test("una nueva preferencia en atención humana actualiza el resumen y la asignación interna",async(t)=>{
  const contexts=mockDatabase(t,{rooms:viewRooms});
  const input={channel:"facebook",externalUserId:"paused-view"};
  await generateAiReply({...input,message:"Quiero reservar del 20/11/2026 al 22/11/2026 para dos adultos sin niños ni mascotas con vista al mar y cerca de la ventana"});
  await generateAiReply({...input,message:"Sí"});
  assert.equal(await updateGlobalReservationContextForHandoff({...input,message:"Prefiero vista interior"}),true);
  const state=contexts.get("facebook:paused-view").whatsapp_mvp;
  assert.equal(state.state,"handoff");
  assert.equal(state.room_preferences.view,"interior");
  assert.equal(state.room_preferences.near_window,true);
  assert.equal(state.pricing_quote.internal_assignment.room_id,101);
  assert.equal(state.pricing_quote.window_verification_required,true);
});


test("una nueva reserva no reutiliza la cotización anterior ni envía aviso de cálculo antes de reunir datos",async(t)=>{
  const contexts=mockDatabase(t,{rooms:viewRooms});
  for(const channel of ["whatsapp","instagram","facebook"]){
    const input={channel,externalUserId:"fresh-reservation-"+channel};
    const notices=[];
    const send=message=>generateAiReply({...input,message},{onProcessing:async text=>notices.push(text)});
    await send("Quiero reservar del 20/11/2026 al 22/11/2026 para dos adultos, sin niños ni mascotas, con vista al mar");
    const oldId=contexts.get(channel+":"+input.externalUserId).whatsapp_mvp.intent_id;
    notices.length=0;
    const fresh=await send("Quiero hacer una nueva reserva");
    assert.equal(fresh.mode,"global_reservation_collecting");
    assert.match(fresh.reply,/fechas de entrada y salida/);
    assert.deepEqual(notices,[]);
    const state=contexts.get(channel+":"+input.externalUserId).whatsapp_mvp;
    assert.notEqual(state.intent_id,oldId);
    assert.equal(state.check_in,undefined);
    assert.equal(state.adults,undefined);
    assert.equal(state.room_preferences,undefined);
    const complete=await send("Del 25/11/2026 al 27/11/2026 para cuatro adultos, sin niños ni mascotas, con vista interior");
    assert.equal(complete.mode,"occupancy_quote");
    assert.match(complete.reply,/Familiar 1.*S\/ 230.00.*S\/ 460.00/);
    assert.equal(contexts.get(channel+":"+input.externalUserId).whatsapp_mvp.check_in,"2026-11-25");
  }
});
