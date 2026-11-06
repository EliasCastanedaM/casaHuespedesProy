// La descripción comercial también puede contener referencias a unidades
// físicas. El prompt no protege las respuestas programadas: filtrar antes
// de entregar el catálogo tanto al modelo como al formateador de detalles.
export function withoutPhysicalRoomReferences(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(
      /\b(?:la\s+|las\s+)?(unidades|unidad|habitaciones|habitaci[oó]n|rooms|room)\s*(?:(?:n[uú]mero|n[.º°o]*|nro\.?)\s*|#\s*)?\d{3,5}\b(?:\s*(?:,|y|e|and)\s*#?\s*\d{3,5}\b)*/gi,
      (match, noun) => {
        const plural = /^(?:unidades|habitaciones|rooms)$/i.test(noun);
        const replacement = /^rooms?$/i.test(noun)
          ? (plural ? "some rooms" : "a room")
          : (plural ? "algunas " : "una ") + noun.toLowerCase();
        return /^[A-ZÁÉÍÓÚ]/.test(match)
          ? replacement[0].toUpperCase() + replacement.slice(1)
          : replacement;
      }
    )
    .replace(/\s*#\s*\d{3,5}\b/g, "")
    .trim();
}

export function publicAiCategory(category) {
  return {
    slug: category.slug,
    name: withoutPhysicalRoomReferences(category.name),
    total_quantity: Number(category.total_quantity || 0),
    available_quantity: category.available_quantity === undefined
      ? undefined : Number(category.available_quantity || 0),
    capacity: Number(category.capacity || 1),
    bed_description: withoutPhysicalRoomReferences(category.bed_description) || null,
    description: withoutPhysicalRoomReferences(category.description) || null,
    price_per_night: Number(category.price_per_night || 0),
    image_url: category.image_url || null,
  };
}
