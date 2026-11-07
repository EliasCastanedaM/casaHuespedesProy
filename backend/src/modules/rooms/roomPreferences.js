const clean = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const VIEWS = new Set(["sea", "exterior", "interior"]);

export function normalizeRoomPreferences(value = {}) {
  value = value && typeof value === "object" ? value : {};
  return {
    ...(VIEWS.has(value.view) ? { view: value.view } : {}),
    ...(value.near_window === true ? { near_window: true } : {}),
    ...(value.terrace === true ? { terrace: true } : {}),
    ...(value.balcony === true ? { balcony: true } : {}),
  };
}

export function collectRoomPreferences(message, previous = {}) {
  const text = clean(message);
  const next = normalizeRoomPreferences(previous);
  if (/\b(?:diferencias?|compara|comparar|comparacion|que vistas|cuales vistas)\b/.test(text) &&
      !/\b(?:prefiero|quiero|quisiera|necesito|busco)\b/.test(text)) return next;
  const patterns = [
    ["sea", /\b(?:vista (?:al|hacia el) mar|mirando al mar|frente al mar|sea view|ocean view|vue (?:sur la|mer)|vista para o mar)\b/g],
    ["exterior", /\b(?:vista (?:a|hacia) (?:la )?(?:calle|avenida|afuera|exterior)|vista exterior|hacia (?:la calle|afuera)|(?:que (?:de|mire)|mirando|frente) (?:a|hacia) (?:la )?(?:calle|avenida)|(?:prefiero|quiero|quisiera|que sea) (?:una )?exterior|^exterior|street view|outside view)\b/g],
    ["interior", /\b(?:vista (?:al )?interior|vista hacia (?:el )?interior|hacia adentro|(?:prefiero|quiero|quisiera|que sea) (?:una )?interior|^interior|interior view|courtyard view|vista interna)\b/g],
  ];
  const found = patterns.flatMap(([view, regex]) => [...text.matchAll(regex)].map(m=>({view,index:m.index})));
  found.sort((a,b)=>a.index-b.index);
  for (const item of found) {
    const before = text.slice(Math.max(0,item.index-25),item.index);
    if (/(?:no quiero|sin|ya no quiero)\s*(?:una habitacion con |con )?$/.test(before)) {
      if (next.view===item.view) delete next.view;
    } else next.view=item.view;
  }
  if (/\b(?:sin preferencia de vista|cualquier vista|la vista no importa|no importa la vista|any view)\b/.test(text)) delete next.view;
  const nearWindow=/\b(?:cerca (?:a|de) (?:la |una )?ventana|junto a (?:la |una )?ventana|al lado de (?:la |una )?ventana|con ventana|near (?:a |the )?window|by (?:the )?window)\b/.test(text);
  if (nearWindow) next.near_window=true;
  if (/\b(?:no importa (?:la |una )?ventana|sin preferencia de ventana|(?:no necesito|no quiero|ya no quiero) (?:estar )?cerca (?:a|de) (?:la )?ventana)\b/.test(text)) delete next.near_window;
  if (/\b(?:terraza|terrace|terrasse|terraco)\b/.test(text)) next.terrace=true;
  if (/\b(?:sin terraza|no necesito terraza|la terraza no importa)\b/.test(text)) delete next.terrace;
  if (/\b(?:balcon|balcony)\b/.test(text)) next.balcony=true;
  if (/\b(?:sin balcon|no necesito balcon|el balcon no importa)\b/.test(text)) delete next.balcony;
  return next;
}

export function hasRoomPreferences(value) {
  return Object.keys(normalizeRoomPreferences(value)).length>0;
}

export function roomPreferenceLabel(value = {}, language = "es") {
  const p=normalizeRoomPreferences(value);
  const words={
    es:{sea:"vista al mar",exterior:"vista exterior",interior:"vista interior",near_window:"cerca de una ventana",terrace:"acceso a terraza",balcony:"balcón"},
    en:{sea:"sea view",exterior:"outside view",interior:"interior view",near_window:"near a window",terrace:"terrace access",balcony:"balcony"},
    pt:{sea:"vista para o mar",exterior:"vista exterior",interior:"vista interna",near_window:"perto de uma janela",terrace:"acesso ao terraço",balcony:"varanda"},
    fr:{sea:"vue sur la mer",exterior:"vue extérieure",interior:"vue intérieure",near_window:"près d'une fenêtre",terrace:"accès à la terrasse",balcony:"balcon"},
  }[language] || null;
  if(!words)return roomPreferenceLabel(p,"es");
  return [p.view?words[p.view]:"",...['near_window','terrace','balcony'].filter(k=>p[k]).map(k=>words[k])].filter(Boolean).join("; ");
}

export function roomFeatures(room = {}) {
  // A view never establishes the presence/position of a window.
  const view=clean(room.view_type);
  const amenities=Array.isArray(room.amenities)?room.amenities:[];
  const tags=amenities.filter(a=>typeof a==="string").map(clean);
  const windowValue=room.near_window ?? (!Array.isArray(room.amenities)?room.amenities?.near_window:undefined);
  const nearWindow=windowValue===true || tags.some(t=>/^(?:cerca_ventana|near_window|cerca de (?:una |la )?ventana)$/.test(t)) ? true
    : windowValue===false || tags.includes("sin_ventana") ? false : null;
  return {
    view: /\bmar\b|sea|ocean/.test(view)?"sea":/interior|interna|courtyard/.test(view)?"interior":/calle|exterior|street|avenida/.test(view)?"exterior":null,
    near_window:nearWindow,
    terrace:/terraza|terrace|terrasse|terraco/.test(view) || tags.some(t=>/terraza|terrace/.test(t)),
    balcony:/balcon|balcony/.test(view) || tags.some(t=>/balcon|balcony/.test(t)),
  };
}

export function roomPreferenceMatch(room, preferences, { allowUnverifiedWindow = false, windowVerifiedRoomId = null } = {}) {
  const p=normalizeRoomPreferences(preferences), f=roomFeatures(room);
  if(p.view && !(f.view===p.view || p.view==="exterior" && f.view==="sea"))return false;
  if(p.terrace&&!f.terrace || p.balcony&&!f.balcony)return false;
  if(p.near_window && f.near_window!==true && !(f.near_window===null &&
    (allowUnverifiedWindow || Number(windowVerifiedRoomId)>0 && Number(windowVerifiedRoomId)===Number(room.id))))return false;
  return true;
}
