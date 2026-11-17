// Presentation only: preserve prices, links, conditions and existing emojis.
export function withAssistantEmoji(value) {
  const text=String(value ?? '');
  if(!text.trim() || /\p{Extended_Pictographic}|\p{Regional_Indicator}|[0-9#*]\uFE0F?\u20E3/u.test(text))return text;
  return text+' 😊';
}
