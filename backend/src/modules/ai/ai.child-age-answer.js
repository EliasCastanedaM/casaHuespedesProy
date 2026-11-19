// Parse only a complete age answer, never an amenity or a price question.
// Other language and ambiguous free-form messages remain with the interpreter.
export function childAgeAnswer(message, expectedChildren) {
  let text=String(message||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  if(/[¿?]/.test(text) || text.length>160)return null;
  text=text.replace(/\b1\s+tiene\b/g,'uno tiene');
  const numbers={cero:0,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17};
  text=text.replace(/\b(cero|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciseis|diecisiete)\b/g,w=>String(numbers[w]));
  const collective = text.match(/^(?:(?:los|las)\s+(\d{1,2})(?:\s+(?:ninos|ninas|hijos|hijas|menores))?|todos(?:\s+los\s+(?:ninos|hijos|menores))?|todas(?:\s+las\s+(?:ninas|hijas|menores))?)\s+tienen\s+(\d{1,2})\s+anos[.! ]*$/);
  if (collective) {
    const count = collective[1] ? Number(collective[1]) : expectedChildren;
    const age = Number(collective[2]);
    if (Number.isInteger(count) && count>0 && count<=30 && age<=17 &&
        (expectedChildren == null || count===expectedChildren)) return {ages:Array(count).fill(age),uncertain:false};
    return null;
  }
  const ordinals={primero:1,primer:1,primera:1,segundo:2,segunda:2,tercero:3,tercera:3,cuarto:4,cuarta:4,quinto:5,quinta:5,sexto:6,sexta:6};
  const positions=[...text.matchAll(/\b(?:primero|primer|primera|segundo|segunda|tercero|tercera|cuarto|cuarta|quinto|quinta|sexto|sexta)\b/g)].map(m=>ordinals[m[0]]);
  const uncertain=/\b(?:creo|quizas|tal vez|parece|no estoy segur[oa]|no recuerdo|o)\b/.test(text) ||
    positions.some(position=>expectedChildren==null || position>expectedChildren);
  text=text.replace(/\b(?:primero|primer|primera|segundo|segunda|tercero|tercera|cuarto|cuarta|quinto|quinta|sexto|sexta)\b/g,' ');
  const remainder=text.replace(/\b(?:tienen|tiene|cumplidos|anos|ano|uno|una|el|la|otro|otra|los|las|de|y|o|son|edades|edad|creo|que|quizas|tal|vez|parece|no|estoy|seguro|segura|recuerdo)\b/g,' ')
    .replace(/\b\d{1,2}\b/g,' ').replace(/[\s,.;:!¡]/g,'');
  if(remainder)return null;
  const ages=(text.match(/\b\d{1,2}\b/g)||[]).map(Number);
  if(!ages.length||ages.some(age=>age>17))return null;
  return {ages,uncertain};
}
