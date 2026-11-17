import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPolicyInformationReply, policyInformationType } from '../src/modules/ai/ai.policy-info.js';
import { policyQuestionFocus, resolvePolicyMessage } from '../src/modules/ai/ai.policy-focus.js';
const rules={
 ninos_0_4:{review_status:'verified',config:{no_charge_when_using_existing_beds:true,max_children_sharing_parent_bed:2}},
 ninos_5_8:{review_status:'verified',config:{amount_pen:20,charge_frequency:'child_per_night'}},
 ninos_9_mas:{review_status:'verified',config:{adult_rate_confirmed:true}},
 mascotas:{review_status:'verified',config:{amount_pen:20,vat_included:true,charge_frequency:'pet_per_night'}},
 grupos_8:{review_status:'verified',config:{min_total_guests:8}},
};
const reply=message=>formatPolicyInformationReply(message,{rules});
test('captura: responde solo por el niño de 6 años, sin otras edades ni invitación a reservar',()=>{
 assert.equal(reply('¿Cuánto paga un niño de 6 años por noche?'),'Para un niño de 6 años, el cargo adicional es de S/ 20 por noche.');
 assert.doesNotMatch(reply('¿Cuánto paga un niño de 6 años por noche?'),/4 años|5 a 8|9 años|padres|plazas|adultos|edades|cotizar|mínimo|fórmula|S\/ 30/);
});
test('edades en cifras, palabras y meses seleccionan solo su condición aprobada',()=>{
 for(const message of ['¿Cuánto paga un niño de seis años?','¿Mi hija tiene 6 años, cuánto paga?','¿Qué condiciones aplican a los niños de 6 años?']) {
  assert.match(reply(message),/niño de 6 años.*S\/ 20/);
  assert.doesNotMatch(reply(message),/4 años|9 años|adultos y niños/);
 }
 assert.match(reply('¿Cuánto pagan los niños de 4 años?'),/no hay cargo adicional.*camas existentes/);
 assert.doesNotMatch(reply('¿Cuánto pagan los niños de 4 años?'),/S\/|tarifa de adulto/);
 assert.match(reply('¿Mi hijo de nueve años paga como adulto?'),/9 años.*tarifa de adulto/);
 assert.doesNotMatch(reply('¿Mi hijo de nueve años paga como adulto?'),/S\/|4 años|compartir/);
 assert.match(reply('¿Cuánto paga mi bebé de seis meses?'),/no hay cargo adicional/);
});
test('las consultas de camas no disparan importes ni todos los tramos de edad',()=>{
 assert.match(reply('¿Mi hijo de 6 años puede compartir cama?'),/distribución de camas/);
 assert.doesNotMatch(reply('¿Mi hijo de 6 años puede compartir cama?'),/S\/|gratis|hasta 4|9 años/);
 assert.match(reply('¿Cuántos niños pueden compartir la cama?'),/hasta 2 niños de hasta 4 años/);
});
test('pide solo la edad faltante y amplía la política únicamente cuando se solicita',()=>{
 assert.equal(reply('¿Cuánto pagan los niños?'),'¿Qué edad tiene el niño?');
 assert.equal(reply('¿Desde qué edad pagan los niños?'),'Desde los 5 años se aplica el cobro por alojamiento.');
 assert.equal(reply('¿Hasta qué edad los niños no pagan?'),'Hasta los 4 años no hay cargo adicional si utiliza las camas existentes.');
 assert.equal(reply('¿Desde qué edad los niños pagan como adulto?'),'Desde los 9 años se aplica la tarifa de adulto.');
 const broad=reply('¿Qué reglas hay para niños?');
 assert.match(broad,/Hasta 4 años/);assert.match(broad,/De 5 a 8/);assert.match(broad,/Desde 9/);
 assert.doesNotMatch(broad,/fórmula|mínimo|plaza|Para cotizar|adultos y niños/);
 assert.ok(broad.split(/\s+/).length<50);
 const two=reply('¿Cuánto pagan mis hijos de 4 y 6 años?');
 assert.match(two,/4 años.*no hay/);assert.match(two,/6 años.*S\/ 20/);assert.doesNotMatch(two,/9 años/);
 assert.deepEqual(policyQuestionFocus('¿Cuánto pagan niños de cinco a ocho años?').ages,[5,6,7,8]);
 const range=reply('¿Cuánto pagan niños de cinco a ocho años?');
 assert.equal((range.match(/S\/ 20/g)||[]).length,1);
 assert.match(range,/5 a 8 años/);
 assert.doesNotMatch(range,/4 años|9 años/);
});
test('cada dato necesita su propia aprobación; nunca publica una propuesta ni un precio de respaldo',()=>{
 for(const status of ['pending_review','retired',undefined]) {
  const out=formatPolicyInformationReply('¿Cuánto paga un niño de 6 años?',{rules:{ninos_5_8:{review_status:status,config:{amount_pen:999,charge_frequency:'child_per_night'}}}});
  assert.match(out,/No tengo confirmado/);assert.doesNotMatch(out,/999|S\/|fórmula|mínimo/);
 }
 for(const supplied of [undefined,null,{}, {ninos_5_8:{...rules.ninos_5_8,active:false}}])assert.doesNotMatch(formatPolicyInformationReply('¿Cuánto paga un niño de 6 años?',{rules:supplied}),/S\//);
 const onlySix={ninos_5_8:rules.ninos_5_8};
 assert.match(formatPolicyInformationReply('¿Cuánto paga un niño de 6 años?',{rules:onlySix}),/S\/ 20/);
 assert.doesNotMatch(formatPolicyInformationReply('¿Cuánto paga un niño de 4 años?',{rules:onlySix}),/gratis|no hay cargo/);
 assert.doesNotMatch(formatPolicyInformationReply('¿Mi hijo de 9 años paga adulto?',{rules:onlySix}),/se aplica la tarifa/);
});
test('mascotas: admisión sin precios no pedidos, precio solo con fuente aprobada',()=>{
 assert.equal(reply('¿Aceptan perros?'),'Sí, con autorización previa del hospedaje.');
 assert.doesNotMatch(reply('¿Aceptan perros?'),/S\/|IGV|por noche/);
 const pets=reply('¿Aceptan perros y cuánto cuesta?');assert.match(pets,/S\/ 20.*IGV incluido.*por mascota y por noche/);assert.match(pets,/autorización previa/);
 assert.ok(pets.split(/\s+/).length<35);
 assert.match(reply('¿Hay descuento para 8 huéspedes?'),/8 o más huéspedes.*confirmación del equipo/);
});
test('seguimientos reemplazan la edad y nunca atraviesan un cambio de tema',()=>{
 const history=[{author:'client',content:'¿Cuánto paga un niño de 6 años?'},{author:'assistant',content:reply('¿Cuánto paga un niño de 6 años?')}];
 const resolved=resolvePolicyMessage('¿Y uno de 9 años?',history,policyInformationType);
 assert.match(reply(resolved),/9 años.*tarifa de adulto/);assert.doesNotMatch(reply(resolved),/6 años|S\/ 20/);
 assert.equal(resolvePolicyMessage('¿Y uno de 9 años?',[...history,{author:'client',content:'¿Tienen WiFi?'}],policyInformationType),'¿Y uno de 9 años?');
 const askedAge=[{author:'client',content:'¿Cuánto pagan los niños?'},{author:'assistant',content:'¿Qué edad tiene el niño?'}];
 assert.match(reply(resolvePolicyMessage('6',askedAge,policyInformationType)),/6 años.*S\/ 20/);
 assert.equal(resolvePolicyMessage('6',history,policyInformationType),'6');
});
test('una excepción en una reserva no se convierte en consulta informativa',()=>{
 for(const text of ['Quiero reservar con mi hijo de 6 años','Somos 2 adultos y un niño','Voy con 2 perros','Llevo un perro','Quisiera reservar con una mascota','Ingreso 20/11/2026 y salida 22/11/2026','Sí, quiero la Triple.'])assert.equal(formatPolicyInformationReply(text,{rules}),null,text);
});
