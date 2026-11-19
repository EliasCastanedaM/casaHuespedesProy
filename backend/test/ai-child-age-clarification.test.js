import test from 'node:test';
import assert from 'node:assert/strict';
import { childAgeAnswer } from '../src/modules/ai/ai.child-age-answer.js';
import { classifyServiceInquiry } from '../src/modules/ai/ai.services-info.js';
import { handleGlobalReservationTurn } from '../src/modules/ai/ai.reservation.js';
const context=()=>({state:'whatsapp_mvp',whatsapp_mvp:{
  state:'collecting',awaiting:'ages',intent_id:'current-family',language:'es',
  check_in:'2026-11-18',check_out:'2026-11-19',adults:5,children:2,total_guests:7
}});
const turn=(message,ctx=context())=>handleGlobalReservationTurn({message,context:ctx,now:new Date('2026-11-17T12:00:00Z')});
for(const message of ['Los 6 tienen 12 años','Los seis tienen doce años','Los 6 niños tienen 12 años','Todos tienen 12 años'])test('edad compartida sin confundir cantidad con edad: '+message,()=>{
  const ctx=context();Object.assign(ctx.whatsapp_mvp,{adults:4,children:6,total_guests:10});
  const result=turn(message,ctx);
  assert.deepEqual(result.context.whatsapp_mvp.child_ages,Array(6).fill(12));
  assert.equal(result.context.whatsapp_mvp.adults,4);
  assert.equal(result.context.whatsapp_mvp.children,6);
  assert.match(result.reply,/mascotas/);
});
test('una cantidad de niños contradictoria no se completa por suposición',()=>{
  assert.equal(childAgeAnswer('Los 5 tienen 12 años',6),null);
  assert.equal(childAgeAnswer('Todos tienen 12 años'),null);
});
for(const answer of ['Sí','Sí te confirmo'])test('identificadores contradictorios piden confirmar las edades y aceptan '+answer,()=>{
  const first=turn('El primero 2 años y el tercero 4');
  assert.equal(first.context.whatsapp_mvp.child_ages,undefined);
  assert.deepEqual(first.context.whatsapp_mvp.pending_child_ages,[2,4]);
  assert.match(first.reply,/confirmas/);
  const confirmed=turn(answer,first.context);
  assert.deepEqual(confirmed.context.whatsapp_mvp.child_ages,[2,4]);
  assert.match(confirmed.reply,/mascotas/);
  assert.equal(confirmed.context.whatsapp_mvp.guest_reservation_consent,undefined);
});
for(const [message,ages] of [
  ['tienen 9 años uno y 15 el otro',[9,15]],
  ['uno tiene 4 y el otro 15',[4,15]],
  ['tienen nueve años uno y quince el otro',[9,15]],
])test('respuesta de edades se entiende en el paso actual: '+message,()=>{
  assert.deepEqual(childAgeAnswer(message).ages,ages);
  assert.equal(classifyServiceInquiry(message).kind,'none');
  const r=turn(message);
  assert.deepEqual(r.context.whatsapp_mvp.child_ages,ages);
  assert.equal(r.context.whatsapp_mvp.adults,5);
  assert.match(r.reply,/mascotas/);
  assert.doesNotMatch(r.reply,/No tengo un servicio|reserva confirmada/);
});
test('edades inciertas se confirman antes de guardarlas',()=>{
  const first=turn('creo que uno tiene 4 y el otro 15');
  assert.match(first.reply,/¿Me confirmas.*4 y 15 años/);
  assert.equal(first.context.whatsapp_mvp.child_ages,undefined);
  assert.deepEqual(first.context.whatsapp_mvp.pending_child_ages,[4,15]);
  const confirmed=turn('SÍ, CORRECTO',first.context);
  assert.deepEqual(confirmed.context.whatsapp_mvp.child_ages,[4,15]);
  assert.equal(confirmed.context.whatsapp_mvp.pending_child_ages,undefined);
  assert.match(confirmed.reply,/mascotas/);
});
test('puede negar o corregir lo entendido sin conservar valores inciertos',()=>{
  const first=turn('creo que uno tiene 4 y el otro 15');
  const denied=turn('no',first.context);
  assert.equal(denied.context.whatsapp_mvp.pending_child_ages,undefined);
  assert.equal(denied.context.whatsapp_mvp.child_ages,undefined);
  assert.match(denied.reply,/edad tiene cada niño/);
  const corrected=turn('uno tiene 9 y el otro 15',first.context);
  assert.deepEqual(corrected.context.whatsapp_mvp.child_ages,[9,15]);
  assert.equal(corrected.context.whatsapp_mvp.pending_child_ages,undefined);
});
test('conserva edades parciales confirmadas en esta solicitud',()=>{
  const ctx=context();ctx.whatsapp_mvp.child_ages=[9];
  assert.deepEqual(turn('el otro tiene 15',ctx).context.whatsapp_mvp.child_ages,[9,15]);
});
test('una amenidad o pregunta de tarifa no se trata como respuesta de edad',()=>{
  for(const message of ['¿Tienen piscina?','¿Cuánto paga un niño de 4 años?','tienen internet','tienen 9 perros'])assert.equal(childAgeAnswer(message),null,message);
  assert.equal(classifyServiceInquiry('¿Tienen piscina?').kind,'specific');
});

test('una afirmación interpretada confirma solo las edades tentativas',()=>{
  const first=turn('creo que uno tiene 4 y el otro 15');
  const r=handleGlobalReservationTurn({message:'eso mismo',context:first.context,
    understanding:{intent:'continue',fields:{},clarification:null}});
  assert.deepEqual(r.context.whatsapp_mvp.child_ages,[4,15]);
  assert.equal(r.context.whatsapp_mvp.pending_child_ages,undefined);
  assert.match(r.reply,/mascotas/);
  assert.equal(r.context.whatsapp_mvp.guest_reservation_consent,undefined);
});
