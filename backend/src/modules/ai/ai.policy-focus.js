// Interpret the informational question before selecting commercial facts.
// Follow-ups may use only the latest guest topic, never a stale booking draft.
const clean = value => String(value || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const AGE_WORDS = { cero:0, un:1, uno:1, una:1, dos:2, tres:3, cuatro:4,
  cinco:5, seis:6, siete:7, ocho:8, nueve:9, diez:10, once:11, doce:12,
  trece:13, catorce:14, quince:15, dieciseis:16, diecisiete:17 };

export function policyQuestionFocus(message) {
  const text=clean(message);
  const numbered=text.replace(/\b(cero|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciseis|diecisiete)\b/g,
    word=>String(AGE_WORDS[word]));
  const ages=[];
  let ageRange=false;
  for(const match of numbered.matchAll(/((?:\d{1,2}\s*(?:,|y|o|a|hasta)\s*)*\d{1,2})\s*anos?\b/g)) {
    const values=match[1].match(/\d+/g).map(Number);
    if(/\b(?:a|hasta)\b/.test(match[1]) && values.length===2 && values[0]<=values[1]) {
      ageRange=true;
      for(let age=values[0];age<=values[1];age++)ages.push(age);
    } else ages.push(...values);
  }
  for(const match of numbered.matchAll(/\b(\d{1,2})\s*meses?\b/g)) ages.push(Math.floor(Number(match[1])/12));
  if(!ages.length) for(const match of numbered.matchAll(/\b(?:tiene|cumple)\s+(\d{1,2})(?=[?!. ]*$)/g)) ages.push(Number(match[1]));
  return {
    ages:[...new Set(ages)],
    ageRange,
    price:/\b(?:cuanto|costo|precio|tarifa|paga|pagan|pago|cobran|cobro|cargo|gratis|gratuito|cost|charge|pay)\b/.test(text),
    threshold:/\b(?:desde que edad|a partir de que edad|hasta que edad)\b/.test(text),
    adultThreshold:/\badult[oa]\b/.test(text),
    freeThreshold:/\b(?:gratis|gratuito|sin cargo|no paga|no pagan)\b/.test(text),
    sharing:/\b(?:compartir|comparten|dormir|duerme|cama|camas|cuna)\b/.test(text),
    sharingCount:/\b(?:cuantos|cuantas|limite|maximo)\b/.test(text),
    general:/\b(?:politicas?|reglas?|todas las edades|todos los ninos|condiciones generales|condiciones para (?:los )?ninos)\b/.test(text),
    admission:/\b(?:aceptan|permiten|admiten|puedo llevar|pueden alojarse)\b/.test(text),
  };
}

export function isPolicyFollowup(message) {
  const text=clean(message).replace(/[¿?!.]/g,'').trim();
  if (/^\d{1,2}$/.test(text))return true;
  return /^(?:(?:y|pero) )?(?:(?:si (?:tiene|tienen)|(?:uno|una|otro|otra|el|la|los|las) de) .{1,35}|cuanto (?:paga|pagan|cuesta)|tiene costo|es gratis|paga igual|puede compartir(?: cama)?|pueden compartir(?: cama)?)$/.test(text) ||
    /^(?:y )?(?:de )?(?:\d{1,2}|cero|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce) (?:anos?|meses?)$/.test(text);
}

export function resolvePolicyMessage(message, history=[], classify) {
  if(!isPolicyFollowup(message))return message;
  const bareAge=/^\d{1,2}$/.test(String(message).trim());
  if(bareAge && ![...history].reverse().find(item=>item.author==='assistant'||item.role==='assistant')?.content?.includes('¿Qué edad tiene el niño?'))return message;
  const prior=history.filter(item=>item.author==='client'||item.role==='user');
  if(prior.at(-1)?.content?.trim()===String(message).trim())prior.pop();
  while(prior.length && isPolicyFollowup(prior.at(-1).content))prior.pop();
  const type=classify(prior.at(-1)?.content || '');
  const topic={children:'niños',pets:'mascotas',groups:'grupos'}[type];
  return topic ? `¿Consulta sobre ${topic}? ${message}${bareAge ? ' años' : ''}` : message;
}
