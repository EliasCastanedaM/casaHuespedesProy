import { useEffect, useRef, useState } from "react";

import { sendAiMessage } from "../services/aiService";
import "./AiAssistant.css";

const AI_SESSION_KEY = "pimentelAiSessionId";
const INITIAL_MESSAGE = {
  role: "assistant",
  content:
    "¡Hola! Soy el asesor virtual de Casa Huéspedes Pimentel. Puedo ayudarte con habitaciones, precios y disponibilidad.",
};

function createSessionId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getSessionId() {
  try {
    const storedSessionId = localStorage.getItem(AI_SESSION_KEY);

    if (storedSessionId) return storedSessionId;

    const sessionId = createSessionId();
    localStorage.setItem(AI_SESSION_KEY, sessionId);
    return sessionId;
  } catch {
    return createSessionId();
  }
}

function ChatIcon({ close = false }) {
  if (close) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 12a8 8 0 0 1-8 8H6l-3 2 1-4a8 8 0 1 1 17-6Z" />
      <path d="M8 12h.01M12 12h.01M16 12h.01" />
    </svg>
  );
}

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const sessionIdRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    sessionIdRef.current = getSessionId();
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages, isSending]);

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage || isSending) return;

    if (trimmedMessage.length > 4000) {
      setError("El mensaje admite hasta 4000 caracteres.");
      return;
    }

    const sessionId = sessionIdRef.current || getSessionId();
    sessionIdRef.current = sessionId;

    setMessage("");
    setError("");
    setIsSending(true);
    setMessages((current) => [
      ...current,
      { role: "user", content: trimmedMessage },
    ]);

    try {
      const reply = await sendAiMessage({
        message: trimmedMessage,
        sessionId,
      });

      setMessages((current) => [
        ...current,
        { role: "assistant", content: reply },
      ]);
    } catch (sendError) {
      setError(
        sendError.message ||
          "No se pudo contactar al asesor. Inténtalo nuevamente."
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <aside className="ai-assistant" aria-label="Asesor virtual">
      {isOpen && (
        <section className="ai-assistant__panel" aria-live="polite">
          <header className="ai-assistant__header">
            <div>
              <p>Casa Huéspedes Pimentel</p>
              <h2>Asesor virtual</h2>
            </div>

            <button
              type="button"
              className="ai-assistant__close"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar asesor virtual"
            >
              <ChatIcon close />
            </button>
          </header>

          <div className="ai-assistant__messages">
            {messages.map((item, index) => (
              <p
                key={`${item.role}-${index}`}
                className={`ai-assistant__message ai-assistant__message--${item.role}`}
              >
                {item.content}
              </p>
            ))}

            {isSending && (
              <p className="ai-assistant__message ai-assistant__message--assistant">
                Consultando...
              </p>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form className="ai-assistant__form" onSubmit={handleSubmit}>
            {error && <p className="ai-assistant__error">{error}</p>}

            <label htmlFor="ai-assistant-message" className="sr-only">
              Escribe tu consulta
            </label>
            <div className="ai-assistant__composer">
              <textarea
                id="ai-assistant-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows="2"
                maxLength="4000"
                placeholder="Consulta por habitaciones o fechas..."
                disabled={isSending}
              />
              <button type="submit" disabled={isSending || !message.trim()}>
                Enviar
              </button>
            </div>
          </form>
        </section>
      )}

      <button
        type="button"
        className="ai-assistant__toggle"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Cerrar asesor virtual" : "Abrir asesor virtual"}
      >
        <ChatIcon close={isOpen} />
        <span>{isOpen ? "Cerrar" : "Asesor IA"}</span>
      </button>
    </aside>
  );
}
