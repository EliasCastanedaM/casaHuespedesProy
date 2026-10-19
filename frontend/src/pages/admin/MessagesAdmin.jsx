
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3, Bot, CheckCheck, CircleAlert, Clock3, Facebook,
  Headphones, Instagram, MessageSquare, Phone, RefreshCw,
  RotateCcw, Search, Send, UserRound,
} from "lucide-react";
import api from "../../services/api";

const CHANNELS = [
  { id: "all", label: "Todas", icon: MessageSquare },
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "facebook", label: "Facebook", icon: Facebook },
  { id: "whatsapp", label: "WhatsApp", icon: Phone },
];
const STATUS_OPTIONS = [
  { id: "all", label: "Todos" },
  { id: "ai", label: "IA" },
  { id: "manual", label: "Manual" },
  { id: "unanswered", label: "Por responder" },
  { id: "resolved", label: "Resueltas" },
];
const PAGE_SIZE = 50;
const EMPTY_COUNTS = { total: 0, ai: 0, manual: 0, unanswered: 0, resolved: 0 };
const INITIAL_DASHBOARD = {
  ...EMPTY_COUNTS,
  channels: { instagram: { ...EMPTY_COUNTS }, facebook: { ...EMPTY_COUNTS }, whatsapp: { ...EMPTY_COUNTS } },
};

function conversationId(conversation) {
  return conversation.channel + ":" + conversation.external_user_id;
}

function conversationPath(conversation) {
  return "/meta/conversations/" +
    encodeURIComponent(conversation.channel) + "/" +
    encodeURIComponent(conversation.external_user_id);
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(date);
}

function displayName(conversation) {
  return conversation?.customer_name || conversation?.external_user_id || "Conversación";
}

function statusOf(conversation) {
  if (conversation.resolved_at) return "resolved";
  if (conversation.handoff_active) return "manual";
  return "ai";
}

function awaitingReply(conversation) {
  return !conversation.resolved_at && conversation.last_direction === "incoming" &&
    ["received", "failed"].includes(conversation.last_status);
}

function StatusLabel({ conversation }) {
  const status = statusOf(conversation);
  const style = status === "resolved"
    ? "bg-slate-100 text-slate-700"
    : status === "manual"
      ? "bg-[#fdf0d1] text-[#7f541a]"
      : "bg-[#e1f2e9] text-[#245c48]";
  return <span className={"inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-wide " + style}>
    {status === "resolved" ? "Resuelta" : status === "manual" ? "Manual" : "IA"}
  </span>;
}

function StatCard({ label, value, icon: Icon, detail }) {
  return (
    <div className="flex min-w-0 flex-col justify-between border border-[#ded4c4] bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-[#52636a]">{label}</p>
        <Icon size={18} className="shrink-0 text-[#a77735]" aria-hidden="true" />
      </div>
      <p className="mt-2 font-serif text-3xl font-bold leading-none text-[#003647]">{value}</p>
      <p className="mt-2 truncate text-[11px] text-[#7b8586]">{detail}</p>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="border-b border-[#eee7db] py-2.5 last:border-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#7b8586]">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-[#163f4c]">{value || "No registrado"}</dd>
    </div>
  );
}

export default function MessagesAdmin() {
  const [dashboard, setDashboard] = useState(INITIAL_DASHBOARD);
  const [channel, setChannel] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const listSequence = useRef(0);
  const messageSequence = useRef(0);
  const filterKeyRef = useRef("");

  const selected = useMemo(
    () => conversations.find((item) => conversationId(item) === selectedId),
    [conversations, selectedId]
  );

  const platformCounts = channel === "all" ? dashboard :
    (dashboard.channels[channel] || EMPTY_COUNTS);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadDashboard = useCallback(async () => {
    try {
      const response = await api.get("/meta/conversations/dashboard");
      if (response.data?.data) setDashboard(response.data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "No se pudieron actualizar las estadísticas.");
    }
  }, []);

  const loadConversations = useCallback(async ({ from = 0, append = false, quiet = false } = {}) => {
    const sequence = ++listSequence.current;
    try {
      if (append) setLoadingMore(true);
      else if (!quiet) setLoadingConversations(true);
      const response = await api.get("/meta/conversations", {
        params: {
          channel: channel === "all" ? undefined : channel,
          status: statusFilter,
          search: debouncedSearch || undefined,
          limit: PAGE_SIZE,
          offset: from,
        },
      });
      if (sequence !== listSequence.current) return;
      const next = Array.isArray(response.data?.data) ? response.data.data : [];
      setConversations((previous) => {
        if (!append) return next;
        const known = new Set(previous.map(conversationId));
        return [...previous, ...next.filter((item) => !known.has(conversationId(item)))];
      });
      setHasMore(next.length === PAGE_SIZE);
      setOffset(from + next.length);
      if (!append) {
        setSelectedId((current) =>
          current && next.some((item) => conversationId(item) === current)
            ? current : next[0] ? conversationId(next[0]) : ""
        );
      }
      setError("");
    } catch (requestError) {
      if (sequence === listSequence.current) {
        setError(requestError.response?.data?.message || "No se pudieron cargar las conversaciones.");
      }
    } finally {
      if (sequence === listSequence.current) {
        setLoadingConversations(false);
        setLoadingMore(false);
      }
    }
  }, [channel, statusFilter, debouncedSearch]);

  const loadMessages = useCallback(async (conversation, quiet = false) => {
    const sequence = ++messageSequence.current;
    if (!conversation) {
      setMessages([]);
      return;
    }
    try {
      if (!quiet) setLoadingMessages(true);
      const response = await api.get(conversationPath(conversation) + "/messages", {
        params: { limit: 100 },
      });
      if (sequence !== messageSequence.current) return;
      setMessages(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (requestError) {
      if (sequence === messageSequence.current) {
        setError(requestError.response?.data?.message || "No se pudo cargar el historial.");
      }
    } finally {
      if (sequence === messageSequence.current) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    const key = channel + ":" + statusFilter + ":" + debouncedSearch;
    if (filterKeyRef.current !== key) {
      filterKeyRef.current = key;
      listSequence.current += 1;
      setConversations([]);
      setSelectedId("");
      setMessages([]);
      setOffset(0);
    }
    void loadConversations();
    void loadDashboard();
    const timer = window.setInterval(() => {
      void loadDashboard();
      // Solo se refresca automáticamente la primera página.
      // Al cargar más resultados se evita borrar esa lista.
      if (offset === 0 || offset <= PAGE_SIZE) void loadConversations({ quiet: true });
    }, 10000);
    return () => window.clearInterval(timer);
  }, [loadConversations, loadDashboard, channel, statusFilter, debouncedSearch, offset]);

  useEffect(() => {
    if (!selectedId) {
      messageSequence.current += 1;
      setMessages([]);
      return undefined;
    }
    const [currentChannel, ...parts] = selectedId.split(":");
    const conversation = { channel: currentChannel, external_user_id: parts.join(":") };
    void loadMessages(conversation);
    const timer = window.setInterval(() => void loadMessages(conversation, true), 6000);
    return () => window.clearInterval(timer);
  }, [selectedId, loadMessages]);

  function selectChannel(next) {
    setChannel(next);
    setStatusFilter("all");
    setSearch("");
  }

  async function toggleMode() {
    if (!selected || saving || selected.resolved_at) return;
    try {
      setSaving(true);
      const response = await api.patch(conversationPath(selected) + "/handoff", {
        active: !selected.handoff_active,
      });
      const updated = response.data?.data;
      setConversations((items) => items.map((item) =>
        conversationId(item) === selectedId ? { ...item, ...updated } : item
      ));
      await Promise.all([loadDashboard(), loadMessages(selected, true)]);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "No se pudo cambiar el modo de atención.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleResolved() {
    if (!selected || saving) return;
    try {
      setSaving(true);
      const response = await api.patch(conversationPath(selected) + "/resolved", {
        resolved: !selected.resolved_at,
      });
      const updated = response.data?.data;
      setConversations((items) => items.map((item) =>
        conversationId(item) === selectedId ? { ...item, ...updated } : item
      ));
      await loadDashboard();
      await loadConversations({ quiet: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "No se pudo actualizar el estado de resolución.");
    } finally {
      setSaving(false);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!selected || !text || saving || !selected.handoff_active || selected.resolved_at) return;
    try {
      setSaving(true);
      const response = await api.post(conversationPath(selected) + "/messages", {
        message: text,
      });
      setDraft("");
      if (response.data?.data) setMessages((items) => [...items, response.data.data]);
      await Promise.all([loadConversations({ quiet: true }), loadMessages(selected, true)]);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "No se pudo enviar el mensaje.");
      await loadMessages(selected, true);
    } finally {
      setSaving(false);
    }
  }

  const reservation = selected?.reservation_context;
  const channelLabel = CHANNELS.find((item) => item.id === channel)?.label || "Todas";
  const maxBars = Math.max(1, ...CHANNELS.filter((item) => item.id !== "all")
    .map((item) => dashboard.channels[item.id]?.total || 0));

  return (
    <section className="min-h-screen bg-[#f4efe6] p-4 text-[#003647] md:p-6">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a77735]">Atención multicanal</p>
            <h1 className="mt-1 font-serif text-4xl font-bold">Mensajes</h1>
            <p className="mt-1 text-sm text-[#52636a]">
              Indicadores reales y conversaciones separadas por red social.
            </p>
          </div>
          <button type="button"
            onClick={() => { void loadDashboard(); void loadConversations(); if (selected) void loadMessages(selected); }}
            className="inline-flex items-center gap-2 border border-[#c8bca8] bg-white px-4 py-2 text-sm font-bold hover:bg-[#fbf6ec]">
            <RefreshCw size={15} /> Actualizar
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-4 flex items-start gap-2 border-l-4 border-red-600 bg-red-50 p-3 text-sm text-red-800">
            <CircleAlert size={18} className="shrink-0" /> {error}
          </div>
        )}

        <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Conversaciones totales" value={dashboard.total} icon={MessageSquare} detail="Todos los canales" />
          <StatCard label="Instagram" value={dashboard.channels.instagram?.total || 0} icon={Instagram} detail="Conversaciones guardadas" />
          <StatCard label="Facebook" value={dashboard.channels.facebook?.total || 0} icon={Facebook} detail="Conversaciones guardadas" />
          <StatCard label="WhatsApp" value={dashboard.channels.whatsapp?.total || 0} icon={Phone} detail="Conversaciones guardadas" />
          <StatCard label="Atención por IA" value={dashboard.ai} icon={Bot} detail="Chats bajo control automático" />
          <StatCard label="Atención manual" value={dashboard.manual} icon={Headphones} detail="Chats bajo control humano" />
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-[#ded4c4] bg-white p-2">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filtrar conversaciones por plataforma">
            {CHANNELS.map((item) => {
              const Icon = item.icon;
              const count = item.id === "all" ? dashboard.total : (dashboard.channels[item.id]?.total || 0);
              return (
                <button type="button" role="tab" aria-selected={channel === item.id} key={item.id}
                  onClick={() => selectChannel(item.id)}
                  className={"inline-flex items-center gap-2 px-3 py-2 text-sm font-bold transition " +
                    (channel === item.id ? "bg-[#003647] text-white" : "text-[#42535b] hover:bg-[#f4efe6]")}>
                  <Icon size={16} /> {item.label} <span className="text-xs opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
          <p className="px-2 text-xs text-[#7b8586]">Actualización automática cada 10 s</p>
        </div>

        <div className="grid min-h-[690px] border border-[#ded4c4] bg-white shadow-sm xl:grid-cols-[290px_minmax(380px,1fr)_295px]">
          <aside className="min-w-0 border-b border-[#ded4c4] xl:border-b-0 xl:border-r">
            <div className="border-b border-[#ded4c4] bg-[#fbf6ec] p-4">
              <h2 className="font-serif text-lg font-bold">{channel === "all" ? "Todas las conversaciones" : "Conversaciones de " + channelLabel}</h2>
              <p className="mt-1 text-xs text-[#63747a]">{platformCounts.total} conversaciones registradas</p>
              <div className="relative mt-4">
                <Search size={16} className="absolute left-3 top-2.5 text-[#73818a]" aria-hidden="true" />
                <input value={search} onChange={(event) => setSearch(event.target.value)}
                  aria-label="Buscar conversaciones"
                  placeholder="Buscar nombre o mensaje"
                  className="w-full border border-[#d2c8ba] bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#075a78]" />
              </div>
              <div className="mt-3 flex flex-wrap gap-1" aria-label="Filtrar por estado">
                {STATUS_OPTIONS.map((item) => {
                  return (
                    <button type="button" key={item.id} onClick={() => setStatusFilter(item.id)}
                      aria-pressed={statusFilter === item.id}
                      className={"border px-2 py-1.5 text-[11px] font-bold " +
                        (statusFilter === item.id ? "border-[#003647] bg-[#003647] text-white" : "border-[#d9d2c7] bg-white text-[#52636a] hover:bg-[#f4efe6]")}>
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-[#879195]">
                {platformCounts.unanswered} por responder · {platformCounts.resolved} resueltas
              </p>
            </div>

            <div className="max-h-[600px] overflow-y-auto">
              {loadingConversations && conversations.length === 0 ? (
                <p className="p-5 text-sm text-[#63747a]">Cargando conversaciones...</p>
              ) : conversations.length === 0 ? (
                <p className="p-5 text-sm text-[#63747a]">No hay conversaciones para estos filtros.</p>
              ) : (
                conversations.map((conversation) => {
                  const active = conversationId(conversation) === selectedId;
                  return (
                    <button type="button" key={conversationId(conversation)}
                      onClick={() => setSelectedId(conversationId(conversation))}
                      className={"w-full border-b border-[#eee7db] px-4 py-3 text-left transition " +
                        (active ? "border-l-4 border-l-[#f8ad24] bg-[#eef3f2]" : "border-l-4 border-l-transparent hover:bg-[#fbf6ec]")}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-bold">{displayName(conversation)}</p>
                        <StatusLabel conversation={conversation} />
                      </div>
                      <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-[#a77735]">
                        {CHANNELS.find((item) => item.id === conversation.channel)?.label || conversation.channel}
                        {awaitingReply(conversation) ? " · Por responder" : ""}
                      </p>
                      <p className="mt-2 truncate text-xs text-[#66747a]">{conversation.last_message || "Sin mensajes"}</p>
                      <p className="mt-2 text-[11px] text-[#8d9899]">{formatDate(conversation.last_message_at)}</p>
                    </button>
                  );
                })
              )}
              {hasMore && (
                <button type="button" disabled={loadingMore} onClick={() => void loadConversations({ from: offset, append: true })}
                  className="w-full border-t border-[#ded4c4] px-4 py-3 text-center text-sm font-bold text-[#075a78] hover:bg-[#fbf6ec] disabled:opacity-60">
                  {loadingMore ? "Cargando..." : "Cargar más conversaciones"}
                </button>
              )}
            </div>
          </aside>

          <div className="flex min-h-[610px] min-w-0 flex-col border-b border-[#ded4c4] xl:border-b-0 xl:border-r">
            {!selected ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-[#73818a]">
                Selecciona una conversación para consultar su historial.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ded4c4] bg-white px-4 py-3">
                  <div>
                    <h2 className="font-bold">{displayName(selected)}</h2>
                    <p className="text-xs text-[#6b797c]">
                      {CHANNELS.find((item) => item.id === selected.channel)?.label || selected.channel} · {selected.external_user_id}
                    </p>
                  </div>
                  <StatusLabel conversation={selected} />
                </div>

                <div className="h-[470px] flex-1 space-y-3 overflow-y-auto bg-[#f8f5f0] p-4">
                  {loadingMessages && messages.length === 0 ? (
                    <p className="text-center text-sm text-[#73818a]">Cargando historial...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-sm text-[#73818a]">Aún no hay mensajes guardados.</p>
                  ) : (
                    messages.map((message) => {
                      const incoming = message.direction === "incoming";
                      return (
                        <div key={message.id} className={"flex " + (incoming ? "justify-start" : "justify-end")}>
                          <div className={"max-w-[88%] border px-4 py-3 text-sm md:max-w-[78%] " +
                            (incoming ? "border-[#ded4c4] bg-white text-[#003647]" :
                              message.author === "admin" ? "border-[#075a78] bg-[#075a78] text-white" :
                              "border-[#b7874c] bg-[#a77735] text-white")}>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider opacity-75">
                              {incoming ? "Huésped" : message.author === "admin" ? "Equipo" : "Asistente IA"}
                              {message.status ? " · " + message.status : ""}
                            </p>
                            <p className="whitespace-pre-wrap break-words leading-relaxed">
                              {message.content || "[" + (message.message_type || "Archivo") + "]"}
                            </p>
                            <p className="mt-2 text-right text-[10px] opacity-75">{formatDate(message.meta_timestamp || message.created_at)}</p>
                            {message.error_detail && (
                              <p className="mt-2 border border-red-200 bg-red-50 p-1 text-xs text-red-800">{message.error_detail}</p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={sendMessage} className="border-t border-[#ded4c4] bg-white p-3">
                  {!selected.handoff_active || selected.resolved_at ? (
                    <p className="mb-2 text-xs font-semibold text-[#85612c]">
                      {selected.resolved_at
                        ? "Reabre la conversación para responder."
                        : "Toma la conversación para responder manualmente. La IA quedará pausada."}
                    </p>
                  ) : null}
                  <div className="flex gap-2">
                    <textarea value={draft} onChange={(event) => setDraft(event.target.value)}
                      disabled={!selected.handoff_active || Boolean(selected.resolved_at) || saving}
                      maxLength={4000} rows={2} placeholder="Escribe un mensaje..."
                      className="min-h-[56px] flex-1 resize-none border border-[#d2c8ba] p-3 text-sm outline-none focus:border-[#075a78] disabled:bg-[#f1f1f1]" />
                    <button type="submit" aria-label="Enviar mensaje"
                      disabled={!selected.handoff_active || Boolean(selected.resolved_at) || !draft.trim() || saving}
                      className="flex items-center justify-center gap-2 bg-[#003647] px-5 font-bold text-white hover:bg-[#075a78] disabled:cursor-not-allowed disabled:opacity-40">
                      <Send size={17} /><span className="hidden sm:inline">Enviar</span>
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>

          <aside className="min-w-0 bg-[#fffdf9]">
            <div className="border-b border-[#ded4c4] p-4">
              <h2 className="flex items-center gap-2 font-serif text-lg font-bold"><UserRound size={18} /> Detalle de la conversación</h2>
              {selected ? (
                <dl className="mt-3">
                  <DetailRow label="Huésped" value={displayName(selected)} />
                  <DetailRow label="Plataforma" value={CHANNELS.find((item) => item.id === selected.channel)?.label || selected.channel} />
                  <DetailRow label="Modo de atención" value={selected.handoff_active ? "Equipo humano" : "Asistente IA"} />
                  <DetailRow label="Estado" value={selected.resolved_at ? "Resuelta" : awaitingReply(selected) ? "Por responder" : "En seguimiento"} />
                  <DetailRow label="Inicio de conversación" value={formatDate(selected.created_at)} />
                  <DetailRow label="Última actividad" value={formatDate(selected.last_message_at || selected.updated_at)} />
                </dl>
              ) : <p className="mt-3 text-sm text-[#73818a]">Selecciona un chat para ver su información.</p>}
            </div>

            {selected?.channel === "whatsapp" && reservation && (
              <div className="border-b border-[#ded4c4] bg-[#fdf3dc] p-4">
                <h3 className="text-sm font-bold">Resumen interno de recepción</h3>
                <p className="mt-1 text-xs text-[#876b3b]">
                  Datos recopilados; no constituyen una reserva confirmada.
                </p>
                <dl className="mt-2">
                  <DetailRow label="Categoría consultada" value={reservation.category_slug} />
                  <DetailRow label="Ingreso" value={reservation.check_in} />
                  <DetailRow label="Salida" value={reservation.check_out} />
                  <DetailRow label="Adultos" value={reservation.adults === undefined ? "" : String(reservation.adults)} />
                  <DetailRow label="Niños" value={reservation.children === undefined ? "" : String(reservation.children)} />
                  <DetailRow label="Mascotas" value={reservation.pets === undefined ? "" : String(reservation.pets)} />
                  <DetailRow label="Preferencias" value={reservation.preferences} />
                </dl>
              </div>
            )}

            {selected && (
              <div className="border-b border-[#ded4c4] p-4">
                <h3 className="mb-3 text-sm font-bold">Acciones rápidas</h3>
                <div className="grid grid-cols-1 gap-2">
                  <button type="button" onClick={toggleMode} disabled={saving || Boolean(selected.resolved_at)}
                    className="flex items-center justify-center gap-2 border border-[#003647] bg-[#003647] px-3 py-2.5 text-sm font-bold text-white hover:bg-[#075a78] disabled:opacity-40">
                    {selected.handoff_active ? <Bot size={16} /> : <Headphones size={16} />}
                    {selected.handoff_active ? "Volver a IA" : "Pasar a manual"}
                  </button>
                  <button type="button" onClick={toggleResolved} disabled={saving}
                    className="flex items-center justify-center gap-2 border border-[#a77735] px-3 py-2.5 text-sm font-bold text-[#855b2a] hover:bg-[#fcf2e3] disabled:opacity-40">
                    {selected.resolved_at ? <RotateCcw size={16} /> : <CheckCheck size={16} />}
                    {selected.resolved_at ? "Reabrir conversación" : "Marcar como resuelta"}
                  </button>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#798486]">
                  Marcar como resuelta no cambia el modo de IA. Una respuesta nueva del huésped la reabre automáticamente.
                </p>
              </div>
            )}

            <div className="p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold"><BarChart3 size={16} /> Distribución por plataforma</h3>
              <p className="mt-1 text-xs text-[#869196]">Histórico de conversaciones registradas</p>
              <div className="mt-4 space-y-4">
                {CHANNELS.filter((item) => item.id !== "all").map((item) => {
                  const count = dashboard.channels[item.id]?.total || 0;
                  return (
                    <div key={item.id}>
                      <div className="mb-1 flex justify-between text-xs font-semibold">
                        <span>{item.label}</span><span>{count}</span>
                      </div>
                      <div className="h-2.5 bg-[#e9e4dc]">
                        <div className="h-full bg-[#075a78]" style={{ width: String(count / maxBars * 100) + "%" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 border-t border-[#eee7db] pt-3 text-xs text-[#536b74]">
                <div className="flex items-center justify-between"><span className="flex items-center gap-2"><Clock3 size={14} /> Por responder</span><strong>{dashboard.unanswered}</strong></div>
                <div className="mt-2 flex items-center justify-between"><span className="flex items-center gap-2"><CheckCheck size={14} /> Resueltas</span><strong>{dashboard.resolved}</strong></div>
              </div>
            </div>
          </aside>
        </div>

        <p className="mt-3 text-xs text-[#788588]">
          Los indicadores muestran las conversaciones almacenadas en la base de datos; no representan estadísticas globales de las redes sociales.
        </p>
      </div>
    </section>
  );
}
