// Only a choice referring to the displayed options may select a category.
export function chosenQuotedOption(message, options = []) {
  if (!Array.isArray(options) || !options.length) return null;
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const text = normalize(message).replace(/[¿?¡!.,]/g, ' ').replace(/\s+/g, ' ').trim();
  const numbered = text.match(/^(?:opcion\s*)?([1-3])$/) ||
    text.match(/^(?:prefiero|elijo|escojo|quiero|me quedo con)\s+(?:la\s+)?(?:opcion\s+)?([1-3])$/);
  if (numbered) return options[Number(numbered[1]) - 1] || null;
  const ordinal = text.match(/^(?:(?:prefiero|elijo|escojo|quiero|me quedo con)\s+)?(?:la\s+)?(primera|segunda|tercera)(?:\s+opcion)?$/);
  if (ordinal) return options[['primera', 'segunda', 'tercera'].indexOf(ordinal[1])] || null;
  const affirmative = /^(?:prefiero|elijo|escojo|me quedo con|quiero(?: reservar)?|me interesa)\b/.test(text);
  const matches = options.filter(option => {
    const name = normalize(option.category_name).trim();
    return name && (text === name || text === 'la ' + name || affirmative && text.includes(name));
  });
  return matches.length === 1 ? matches[0] : null;
}
