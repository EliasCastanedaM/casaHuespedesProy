// Parse only a complete age answer, never an amenity or a price question.
// Other language and ambiguous free-form messages remain with the interpreter.
export function childAgeAnswer(message) {
  let text=String(message||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  if(/[¿?]/.test(text) || text.length>160)return null;
  text=text.replace(/\b1\s+tiene\b/g,'uno tiene');
  const numbers={cero:0,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17};
  text=text.replace(/\b(cero|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciseis|diecisiete)\b/g,w=>String(numbers[w]));
  const uncertain=/\b(?:creo|quizas|tal vez|parece|no estoy segur[oa]|no recuerdo|o)\b/.test(text);
  const remainder=text.replace(/\b(?:tienen|tiene|cumplidos|anos|ano|uno|una|el|la|otro|otra|los|las|de|y|o|son|edades|edad|creo|que|quizas|tal|vez|parece|no|estoy|seguro|segura|recuerdo)\b/g,' ')
    .replace(/\b\d{1,2}\b/g,' ').replace(/[\s,.;:!¡]/g,'');
  if(remainder)return null;
  const ages=(text.match(/\b\d{1,2}\b/g)||[]).map(Number);
  if(!ages.length||ages.some(age=>age>17))return null;
  return {ages,uncertain};
}
