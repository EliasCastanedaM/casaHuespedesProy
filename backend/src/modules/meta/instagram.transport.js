export const INSTAGRAM_MESSAGE_LIMIT = 1000;

function preferredBreak(window, minimumPreferredIndex) {
  const newline = window.lastIndexOf("\n");
  if (newline >= minimumPreferredIndex) return newline + 1;

  let sentence = -1;
  for (const match of window.matchAll(/[.!?…](?:[\t ]+|\n)/g)) {
    sentence = match.index + match[0].length;
  }
  if (sentence >= minimumPreferredIndex) return sentence;

  const space = Math.max(
    window.lastIndexOf(" "),
    window.lastIndexOf("\t")
  );
  return space >= minimumPreferredIndex ? space + 1 : window.length;
}

export function splitInstagramMessage(
  text,
  limit = INSTAGRAM_MESSAGE_LIMIT
) {
  const message = String(text ?? "");
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("El límite de Instagram debe ser un entero positivo.");
  }
  if (message.length <= limit) return [message];

  const parts = [];
  let offset = 0;
  const minimumPreferredIndex = Math.floor(limit * 0.5);

  while (message.length - offset > limit) {
    const window = message.slice(offset, offset + limit);
    let breakAt = preferredBreak(window, minimumPreferredIndex);
    if (
      breakAt > 1 &&
      /[\uD800-\uDBFF]/.test(window[breakAt - 1]) &&
      /[\uDC00-\uDFFF]/.test(message[offset + breakAt])
    ) {
      breakAt -= 1;
    }
    parts.push(message.slice(offset, offset + breakAt));
    offset += breakAt;
  }

  if (offset < message.length) parts.push(message.slice(offset));
  return parts;
}

export async function sendInstagramMessageParts(text, sendPart) {
  const parts = splitInstagramMessage(text);
  let lastResult = {};

  for (const part of parts) {
    lastResult = await sendPart(part);
  }

  return lastResult;
}
