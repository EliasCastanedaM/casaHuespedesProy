import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import OpenAI from "openai";
import { pool } from "../src/config/db.js";
import { env } from "../src/config/env.js";
import { getHotelPaymentInfoService } from "../src/modules/services/hotelPaymentInfo.service.js";
import { paymentInformationType, formatHotelPaymentInfoReply } from "../src/modules/ai/ai.payment-info.js";
import { isHotelServicesInquiry, formatHotelServicesReply } from "../src/modules/ai/ai.services-info.js";
import { policyInformationType } from "../src/modules/ai/ai.policy-info.js";
import { formatHotelLocationReply, isHotelLocationInquiry } from "../src/modules/ai/ai.location-info.js";
import { collectRoomPreferences } from "../src/modules/rooms/roomPreferences.js";
import { generateAiReply } from "../src/modules/ai/ai.service.js";
import { HOTEL_SCOPE_CLASSIFIER_PROMPT } from "../src/modules/ai/ai.scope.js";
const data=JSON.parse(readFileSync(new URL("./fixtures/hotel-reference-20261107.json",import.meta.url),"utf8"));

test("dirección, referencia y servicios externos conservan las indicaciones oficiales",()=>{
  for(const query of ["¿Cuál es la dirección?","¿El hotel está frente a la playa?","¿Están cerca del muelle?","¿Tienen cochera?"]){
    assert.equal(isHotelLocationInquiry(query),true);
    const answer=formatHotelLocationReply();
    assert.match(answer,/Calle Quiñonez 233, Pimentel, Chiclayo, Perú/);
    assert.match(answer,/una cuadra del Muelle/);
    assert.match(answer,/paralela al primer malecón/);
    assert.ok(answer.includes(data.location.maps_url));
    assert.match(answer,/No contamos con estacionamiento propio/);
    assert.match(answer,/949 489 526/);
    assert.match(answer,/979 123 264/);
    assert.doesNotMatch(answer,/237|frente a la playa|Víctor|Obar/);
  }
});

test("destinos de pago respetan los números y ceros iniciales sin inventar titular",async()=>{
  const db={query:async(sql)=>{
    assert.match(sql,/code='formas_pago'/);
    assert.match(sql,/active=TRUE AND review_status='verified'/);
    return {rows:[{config:data.payments}]};
  }};
  const info=await getHotelPaymentInfoService(db);
  assert.equal(info.bank.account_number,"30506479111043");
  assert.equal(info.bank.cci,"00230510647911104315");
  const bank=formatHotelPaymentInfoReply(info,"¿Cuál es el CCI para transferir al BCP?");
  assert.ok(bank.includes("30506479111043"));
  assert.ok(bank.includes("00230510647911104315"));
  assert.doesNotMatch(bank,/Yape:|Plin:|Señor Pepe|dólares|USD/);
  assert.match(formatHotelPaymentInfoReply(info,"¿Cuál es el Yape?"),/997 369 352/);
  assert.match(formatHotelPaymentInfoReply(info,"¿Cuál es el Plin?"),/943 030 098/);
  const general=formatHotelPaymentInfoReply(info,"¿Qué formas de pago aceptan?");
  for(const word of ["Efectivo","Transferencia","Yape","Plin","Visa","Mastercard"])assert.ok(general.includes(word),word);
  assert.match(general,/Antes de realizar un pago.*confirmará/);
  assert.doesNotMatch(formatHotelPaymentInfoReply(info,"¿Quién es el titular de la cuenta bancaria?"),/Señor Pepe|30506479111043/);
});

test("sin un registro vigente o con números inválidos no entrega datos de pago supuestos",async()=>{
  assert.equal(await getHotelPaymentInfoService({query:async()=>({rows:[]})}),null);
  for(const info of [null,{}, {...data.payments,bank:{...data.payments.bank,cci:"230510647911104315"}}]){
    const answer=formatHotelPaymentInfoReply(info,"¿Cuál es el BCP?");
    assert.match(answer,/No puedo confirmar/);
    assert.doesNotMatch(answer,/305064|002305|997 369|943 030/);
  }
});

test("servicios de las imágenes responden con condiciones e inclusión correctas",()=>{
  const cases=[
    ["¿El desayuno está incluido?",/continental incluido en la tarifa/],
    ["¿Cada habitación tiene baño con agua caliente?",/Cada habitación cuenta con baño privado con agua caliente/],
    ["¿Tienen Netflix?",/Cada habitación cuenta con TV y Netflix/],
    ["¿Tienen ventilador?",/Cada habitación cuenta con ventilador/],
    ["¿Tienen terraza?",/cuarto piso con vista al mar/],
    ["¿Hay cocina para huéspedes?",/Cocina abierta y compartida/],
    ["¿El wifi es gratis?",/WiFi gratuita.*todo el establecimiento/],
    ["¿Puedo pedir menú para niños?",/menú para niños/],
    ["¿Hay menús dietéticos?",/Menús dietéticos bajo petición/],
    ["¿Hay pediluvio?",/pediluvio/],
    ["¿Proporcionan factura?",/Se proporciona factura/],
    ["¿Tienen cámaras de seguridad?",/fuera del alojamiento y en zonas comunitarias/],
    ["¿Puedo fumar?",/prohibido fumar en todo el alojamiento/],
    ["¿Qué idiomas habla el personal?",/personal atiende en español/],
  ];
  for(const [query,expected] of cases){
    assert.equal(isHotelServicesInquiry(query),true,query);
    assert.match(formatHotelServicesReply(data.services,query),expected,query);
  }
  assert.equal(policyInformationType("¿Tienen menú para niños?"),null);
  assert.equal(policyInformationType("¿Cuánto pagan los niños de 6 años?"),"children");
  assert.equal(isHotelServicesInquiry("¿Puede ser con terraza?"),false);
  assert.equal(isHotelServicesInquiry("Quiero usar la terraza común"),true);
  assert.deepEqual(collectRoomPreferences("Quiero usar la terraza común",{view:"sea"}),{view:"sea"});
  const hotWater=formatHotelServicesReply(data.services,"¿Hay agua caliente?");
  assert.doesNotMatch(hotWater,/cafetería|restaurante/);
});

test("servicios de pago y consumos no se presentan como gratuitos",()=>{
  for(const [query,term] of [["¿Tienen barbacoa?","Barbacoa de pago"],["¿Ofrecen traslado al aeropuerto?","Traslado al aeropuerto de pago"],["¿Hay lavandería?","Lavandería de pago"]]){
    const answer=formatHotelServicesReply(data.services,query);
    assert.ok(answer.includes(term),query);
    assert.match(answer,/confirmará la tarifa y disponibilidad/);
    assert.doesNotMatch(answer,/Incluido en la estadía|gratuito|S\/\s*\d/);
  }
  assert.match(formatHotelServicesReply(data.services,"¿Tienen restaurante y botella de agua?"),/precio de cada consumo/);
  assert.doesNotMatch(formatHotelServicesReply(data.services,"¿Tienen terraza?"),/todas las habitaciones tienen esa vista/);
});

test("distingue información, avisos manuales y elecciones del flujo de pago ya existente",()=>{
  for(const message of ["¿Qué formas de pago aceptan?","¿Cómo puedo pagar?","¿Aceptan tarjetas?","¿Cuál es el número de cuenta?"])
    assert.equal(paymentInformationType(message),"payment_information",message);
  assert.equal(paymentInformationType("Quiero pagar por Yape"),"manual_payment_request");
  assert.equal(paymentInformationType("Ya pagué por Yape"),"manual_payment_report");
  assert.equal(paymentInformationType("Ya hice la transferencia BCP"),"manual_payment_report");
  for(const message of ["Pagar en el establecimiento","Pagar en efectivo","Pagar ahora con Visa","Ya pagué","2"])
    assert.equal(paymentInformationType(message),null,message);
});

function fakeSources(t,{payments=data.payments,active=true}={}) {
  const queries=[];
  const context={state:"whatsapp_mvp",whatsapp_mvp:{state:"quoted",intent_id:"existing",check_in:"2026-11-20",check_out:"2026-11-22",adults:2,children:0,pets:0,total_guests:2,room_preferences:{view:"sea"},pricing_quote:{total_amount:280}}};
  t.mock.method(pool,"connect",async()=>{throw new Error("No se permite registrar reservas en una consulta informativa");});
  t.mock.method(pool,"query",async(sql,params=[])=>{
    queries.push({sql,params});
    if(sql.includes("FROM public.services"))return {rows:data.services};
    if(sql.includes("code='formas_pago'"))return {rows:payments?[{config:payments}]:[]};
    if(sql.includes("SELECT booking_context"))return {rows:active?[{booking_context:structuredClone(context),booking_context_expires_at:new Date(Date.now()+86400000)}]:[]};
    if(sql.includes("SELECT author, content"))return {rows:[]};
    if(sql.includes("ai_usage_events") || sql.includes("last_response_id"))return {rows:[]};
    throw new Error("Consulta inesperada: "+sql);
  });
  const old=env.openai.apiKey;env.openai.apiKey="test-no-network";t.after(()=>{env.openai.apiKey=old;});
  t.mock.method(OpenAI.Responses.prototype,"create",async()=>({output_text:"HOTEL",output:[]}));
  return {queries,context};
}

test("todos los canales consultan servicios y pagos sin modificar una reserva ni pedir identidad",async(t)=>{
  const {queries}=fakeSources(t);
  for(const channel of ["whatsapp","instagram","facebook"]){
    for(const [message,expected,mode] of [
      ["¿Mi reserva incluye desayuno?",/continental incluido/,"hotel_services_information"],
      ["Qué servicios incluye mi reserva",/Desayuno continental/,"hotel_services_information"],
      ["¿Hay menú para niños?",/menú para niños/,"hotel_services_information"],
      ["¿Me compartes el Yape?",/997 369 352/,"hotel_payment_information"],
      ["¿Qué formas de pago aceptan?",/Visa y Mastercard/,"hotel_payment_information"],
      ["¿Cuál es la dirección del hotel?",/Quiñonez 233/,"hotel_location_information"],
    ]){
      const result=await generateAiReply({channel,externalUserId:"reference-"+channel,message});
      assert.equal(result.mode,mode,message);
      assert.match(result.reply,expected,message);
      assert.doesNotMatch(result.reply,/nombre completo|correo electrónico|número de documento|¿Qué fechas/);
    }
  }
  assert.equal(queries.some(({sql})=>/INSERT INTO bookings|UPDATE payments|booking_context =|INSERT INTO ai_conversations/.test(sql)),false);
});

test("un aviso de Yape requiere revisión humana y no se procesa ni verifica como Culqi",async(t)=>{
  const {queries}=fakeSources(t);
  for(const channel of ["whatsapp","instagram","facebook"]){
    const result=await generateAiReply({channel,externalUserId:"manual-"+channel,message:"Ya pagué por Yape"});
    assert.equal(result.mode,"human_review_required");
    assert.match(result.reply,/revisará el movimiento/);
    assert.doesNotMatch(result.reply,/pago (?:está |ya )?confirmado|verificó el pago|Culqi|reserva confirmada/);
  }
  assert.equal(queries.some(({sql})=>/UPDATE|INSERT|FROM bookings/.test(sql)),false);
});

test("el asesor puede consultar el catálogo desde su herramienta sin revelar metadatos internos",async(t)=>{
  fakeSources(t,{active:false});
  const requests=[];let generation=0;
  t.mock.method(OpenAI.Responses.prototype,"create",async req=>{
    requests.push(req);
    if(req.instructions===HOTEL_SCOPE_CLASSIFIER_PROMPT)return {output_text:"HOTEL",output:[]};
    if(generation++===0)return {id:"service-call",output:[{type:"function_call",name:"listar_servicios",arguments:"{}",call_id:"hotel-services"}]};
    return {id:"service-answer",output_text:"El hospedaje cuenta con servicios para tu estadía.",output:[]};
  });
  // No active draft for this informational question: only source consultation.
  const result=await generateAiReply({channel:"facebook",externalUserId:"tool-services",message:"Cuéntame acerca de las instalaciones de descanso."});
  assert.match(result.reply,/servicios/);
  const output=requests.flatMap(req=>Array.isArray(req.input)?req.input:[]).find(item=>item.type==="function_call_output");
  assert.ok(output);
  assert.match(output.output,/Desayuno continental incluido/);
  assert.doesNotMatch(output.output,/verification_status|source_kind|source_document|bank|account_number/);
});
