import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/config/db.js';
import { generateAiReply } from '../src/modules/ai/ai.service.js';
import { isRoomDetailsInquiry, isHotelInformationInterruption, formatRoomDetailsReply,
  isRoomDetailsFollowup, followsRoomQuote, ROOMS_PAGE_URL } from '../src/modules/ai/ai.category-info.js';

test('las consultas de habitaciones reciben la página oficial sin catálogo ni tarifas inventadas',()=>{
  for(const message of ['Cuéntame más sobre esas categorías y esas habitaciones','Explícame cada una y cuál es',
    'Qué habitaciones tienen','Cuéntame sobre Familiar 2','Compara Familiar 1 y Familiar 2']) {
    assert.equal(isRoomDetailsInquiry(message),true,message);
    assert.equal(formatRoomDetailsReply([],message), 'Puedes ver fotos y detalles de las habitaciones aquí:\n'+ROOMS_PAGE_URL);
  }
});

test('no confunde recomendaciones, selección ni disponibilidad con detalles',()=>{
  for(const message of ['Somos tres adultos qué habitaciones nos recomienda','Ahora quiero hacer una reserva',
    'Matrimonial estándar','¿Tienen disponibilidad del 20/11/2026 al 22/11/2026?','What is the room price?']) {
    assert.equal(isRoomDetailsInquiry(message),false,message);
  }
});

test('las preguntas de hotel interrumpen la reserva sin reiniciarla',()=>{
  for(const message of ['¿Dónde están ubicados?','¿Qué servicios incluyen?','¿Aceptan perros?'])
    assert.equal(isHotelInformationInterruption(message),true);
  assert.equal(isHotelInformationInterruption('Ahora quiero reservar'),false);
});

test('las fotos explícitas de habitaciones usan el enlace en lugar de todas las redes',()=>{
  for(const message of ['¿Dónde veo fotos de las habitaciones?','Can you show me room photos?',
    'Fotos de los quartos','Photos des chambres']) assert.equal(isRoomDetailsInquiry(message),true,message);
  assert.doesNotMatch(formatRoomDetailsReply(),/instagram|facebook|tiktok|plazas|capacidad/i);
});

test('un seguimiento breve se resuelve solo desde la última respuesta del asesor',()=>{
  assert.equal(isRoomDetailsFollowup('Dame más detalles'),true);
  const quote={author:'assistant',content:'Doble - 2 Camas · S/ 160.00 por noche.'};
  assert.equal(followsRoomQuote([quote]),true);
  assert.equal(followsRoomQuote([quote,{author:'assistant',content:'El desayuno cuesta S/ 15.'}]),false);
  assert.equal(followsRoomQuote([]),false);
});

test('el enlace tiene una frase breve en el idioma del huésped',()=>{
  for(const language of ['es','en','pt','fr']) {
    const reply=formatRoomDetailsReply([], '', language);
    assert.equal(reply.split('\n').length,2);
    assert.equal(reply.split('\n')[1],ROOMS_PAGE_URL);
  }
  assert.match(formatRoomDetailsReply([], '', 'en'),/^You can see/);
});

test('más detalles después de cotizar carga solo el historial y conserva el borrador',async t=>{
  const queries=[];
  t.mock.method(pool,'query',async sql=>{
    queries.push(sql);
    if(sql.includes('SELECT author, content'))return {rows:[{author:'assistant',content:'Doble - 2 Camas · S/ 160.00 por noche.'}]};
    throw Error('No debe consultar ni modificar la reserva');
  });
  const result=await generateAiReply({channel:'instagram',externalUserId:'room-followup',message:'Más detalles'});
  assert.equal(result.mode,'category_details');
  assert.equal(result.reply,formatRoomDetailsReply());
  assert.equal(queries.length,1);
});
