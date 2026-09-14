import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const CHANNEL_LABELS = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
};

function conversationId(conversation) {
  return conversation.channel + ":" + conversation.external_user_id;
}

function conversationPath(conversation) {
  return (
    "/meta/conversations/" +
    encodeURIComponent(conversation.channel) +
    "/" +
    encodeURIComponent(conversation.external_user_id)
  );
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function messageLabel(message) {
  if (message.author === "client") return "Huésped";
  if (message.author === "admin") return "Equipo";
  return "Asistente IA";
}

export default function MessagesAdmin() {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selected = useMemo(
    () => conversations.find((item) => conversationId(item) === selectedId),
    [conversations, selectedId]
  );

  const loadConversations = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoadingConversations(true);
      const response = await api.get("/meta/conversations");
      const next = Array.isArray(response.data?.data) ? response.data.data : [];
      setConversations(next);
      setSelectedId((current) => {
        if (current && next.some((item) => conversationId(item) === current)) {
          return current;
        }
        return next[0] ? conversationId(next[0]) : "";
      });
      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "No se pudieron cargar las conversaciones."
      );
    } finally {
      if (!quiet) setLoadingConversations(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversation, quiet = false) => {
    if (!conversation) {
      setMessages([]);
      return;
    }

    try {
      if (!quiet) setLoadingMessages(true);
      const response = await api.get(conversationPath(conversation) + "/messages");
      setMessages(Array.isArray(response.data?.data) ? response.data.data : []);
      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "No se pudo cargar el historial del chat."
      );
    } finally {
      if (!quiet) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
    const interval = window.setInterval(() => {
      void loadConversations(true);
    }, 5000);
    const handleFocus = () => void loadConversations(true);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadConversations]);

  useEffect(() => {
    void loadMessages(selected);
    if (!selected) return undefined;

    const interval = window.setInterval(() => {
      void loadMessages(selected, true);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [selected?.channel, selected?.external_user_id, loadMessages]);

  async function toggleMode() {
    if (!selected || saving) return;

    try {
      setSaving(true);
      const response = await api.patch(conversationPath(selected) + "/handoff", {
        active: !selected.handoff_active,
      });
      const updated = response.data?.data;
      setConversations((current) =>
        current.map((item) =>
          conversationId(item) === selectedId ? { ...item, ...updated } : item
        )
      );
      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "No se pudo cambiar el modo de atención."
      );
    } finally {
      setSaving(false);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!selected || !text || saving) return;

    try {
      setSaving(true);
      const response = await api.post(
        conversationPath(selected) + "/messages",
        { message: text }
      );
      setDraft("");
      if (response.data?.data) {
        setMessages((current) => [...current, response.data.data]);
      }
      await loadConversations(true);
      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "No se pudo enviar el mensaje por Meta."
      );
      await loadMessages(selected, true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="min-h-screen bg-[#f5f1ea] p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#a87545]">
              Atención multicanal
            </p>
            <h1 className="mt-1 font-serif text-4xl font-bold text-[#2d261f]">
              Mensajes
            </h1>
            <p className="mt-1 text-sm text-[#75685e]">
              Historial persistente y control entre el equipo y el asistente IA.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void loadConversations();
              void loadMessages(selected);
            }}
            className="self-start rounded-full border border-[#d8c8b7] bg-white px-4 py-2 text-sm font-black text-[#604a37] hover:bg-[#fffaf4]"
          >
            Actualizar
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <div className="grid min-h-[72vh] overflow-hidden rounded-[1.75rem] border border-[#ded3c7] bg-white shadow-xl lg:grid-cols-[340px_1fr]">
          <aside className="border-b border-[#e7ddd3] bg-[#fffdf9] lg:border-b-0 lg:border-r">
            <div className="border-b border-[#e7ddd3] px-5 py-4">
              <p className="font-black text-[#2d261f]">Conversaciones</p>
              <p className="text-xs text-[#8a7d72]">
                Se actualizan automáticamente cada 5 segundos.
              </p>
            </div>

            <div className="max-h-[38vh] overflow-y-auto lg:max-h-[calc(72vh-73px)]">
              {loadingConversations && conversations.length === 0 ? (
                <p className="p-5 text-sm text-[#8a7d72]">Cargando chats...</p>
              ) : conversations.length === 0 ? (
                <p className="p-5 text-sm text-[#8a7d72]">
                  Todavía no hay conversaciones guardadas.
                </p>
              ) : (
                conversations.map((conversation) => {
                  const active = conversationId(conversation) === selectedId;
                  return (
                    <button
                      type="button"
                      key={conversationId(conversation)}
                      onClick={() => setSelectedId(conversationId(conversation))}
                      className={
                        "w-full border-b border-[#eee6de] px-5 py-4 text-left transition " +
                        (active ? "bg-[#f1e4d5]" : "hover:bg-[#faf6f0]")
                      }
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate font-black text-[#2d261f]">
                          {conversation.external_user_id}
                        </p>
                        <span
                          className={
                            "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase " +
                            (conversation.handoff_active
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800")
                          }
                        >
                          {conversation.handoff_active ? "Manual" : "IA"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-[#a87545]">
                        {CHANNEL_LABELS[conversation.channel] || conversation.channel}
                      </p>
                      <p className="mt-2 truncate text-sm text-[#75685e]">
                        {conversation.last_message || "Sin mensajes"}
                      </p>
                      <p className="mt-1 text-[11px] text-[#a2968c]">
                        {formatDate(
                          conversation.last_message_at || conversation.updated_at
                        )}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <div className="flex min-h-[58vh] flex-col">
            {!selected ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-[#8a7d72]">
                Selecciona una conversación para ver su historial.
              </div>
            ) : (
              <>
                <header className="flex flex-col gap-3 border-b border-[#e7ddd3] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-black text-[#2d261f]">
                      {CHANNEL_LABELS[selected.channel] || selected.channel} ·{" "}
                      {selected.external_user_id}
                    </p>
                    <p className="text-xs text-[#8a7d72]">
                      {selected.handoff_active
                        ? "El equipo tiene el control. La IA está pausada."
                        : "La IA responde automáticamente."}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={toggleMode}
                    className={
                      "rounded-full px-4 py-2 text-sm font-black text-white transition disabled:opacity-60 " +
                      (selected.handoff_active
                        ? "bg-emerald-700 hover:bg-emerald-800"
                        : "bg-[#a87545] hover:bg-[#8f623a]")
                    }
                  >
                    {selected.handoff_active ? "Volver a IA" : "Tomar conversación"}
                  </button>
                </header>

                <div className="flex-1 space-y-3 overflow-y-auto bg-[#f8f5f0] p-4 md:p-6">
                  {loadingMessages && messages.length === 0 ? (
                    <p className="text-center text-sm text-[#8a7d72]">
                      Cargando historial...
                    </p>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-sm text-[#8a7d72]">
                      Esta conversación todavía no tiene mensajes.
                    </p>
                  ) : (
                    messages.map((message) => {
                      const incoming = message.direction === "incoming";
                      return (
                        <div
                          key={message.id}
                          className={
                            "flex " + (incoming ? "justify-start" : "justify-end")
                          }
                        >
                          <div
                            className={
                              "max-w-[86%] rounded-2xl px-4 py-3 shadow-sm md:max-w-[70%] " +
                              (incoming
                                ? "rounded-bl-md border border-[#e0d6cb] bg-white text-[#2d261f]"
                                : message.author === "admin"
                                  ? "rounded-br-md bg-[#2f6f5e] text-white"
                                  : "rounded-br-md bg-[#a87545] text-white")
                            }
                          >
                            <div className="mb-1 flex items-center justify-between gap-4 text-[10px] font-black uppercase tracking-wide opacity-75">
                              <span>{messageLabel(message)}</span>
                              <span>{message.status}</span>
                            </div>
                            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                              {message.content ||
                                "[" + message.message_type + " recibido]"}
                            </p>
                            <p className="mt-1 text-right text-[10px] opacity-65">
                              {formatDate(message.meta_timestamp || message.created_at)}
                            </p>
                            {message.error_detail && (
                              <p className="mt-2 rounded-lg bg-red-950/15 px-2 py-1 text-xs">
                                {message.error_detail}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form
                  onSubmit={sendMessage}
                  className="border-t border-[#e7ddd3] bg-white p-4"
                >
                  {!selected.handoff_active && (
                    <p className="mb-2 text-xs font-bold text-amber-700">
                      Toma la conversación para responder manualmente.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      disabled={!selected.handoff_active || saving}
                      maxLength={4000}
                      rows={2}
                      placeholder="Escribe una respuesta..."
                      className="min-h-[48px] flex-1 resize-none rounded-2xl border border-[#d8c8b7] px-4 py-3 text-sm outline-none focus:border-[#a87545] focus:ring-2 focus:ring-[#a87545]/20 disabled:bg-slate-100"
                    />
                    <button
                      type="submit"
                      disabled={
                        !selected.handoff_active || !draft.trim() || saving
                      }
                      className="self-stretch rounded-2xl bg-[#2d261f] px-5 font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {saving ? "..." : "Enviar"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
