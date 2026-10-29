import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../services/api";

const TRUSTED_META_ORIGINS = new Set([
  "https://www.facebook.com",
  "https://web.facebook.com",
  "https://business.facebook.com",
]);
const SUCCESS_EVENT = "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING";

export default function WhatsAppCoexistenceAdmin() {
  const [configuration, setConfiguration] = useState(null);
  const [loadingConfiguration, setLoadingConfiguration] = useState(true);
  const [sdkReady, setSdkReady] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const flowRef = useRef({ code: null, session: null, processing: false });

  const completeIfReady = useCallback(async () => {
    const flow = flowRef.current;
    if (!flow.code || !flow.session || flow.processing) return;

    flow.processing = true;
    setBusy(true);
    setError("");
    setNotice("Meta confirmó la sesión. Verificando la cuenta de WhatsApp…");

    try {
      const response = await api.post("/meta/embedded-signup/complete", {
        code: flow.code,
        wabaId: flow.session.data.waba_id,
        event: flow.session.event,
        version: flow.session.version,
      });
      setResult(response.data.data);
      setNotice("Verificación completada. No se modificaron las variables de producción.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "No se pudo verificar la sesión con Meta. Revisa los registros del backend antes de volver a intentarlo."
      );
      setNotice("");
    } finally {
      // El código es de un solo uso; no se conserva después del intento.
      flowRef.current = { code: null, session: null, processing: false };
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    api
      .get("/meta/embedded-signup/status")
      .then((response) => {
        if (active) setConfiguration(response.data.data);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              "No se pudo consultar la configuración segura del backend."
          );
        }
      })
      .finally(() => {
        if (active) setLoadingConfiguration(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!configuration?.appId) return undefined;

    let active = true;

    const initializeSdk = () => {
      if (!active) return;

      if (window.FB) {
        window.FB.init({
          appId: configuration.appId,
          cookie: true,
          xfbml: false,
          version: "v26.0",
        });
        setSdkReady(true);
        return;
      }

      window.fbAsyncInit = () => {
        if (!active || !window.FB) return;
        window.FB.init({
          appId: configuration.appId,
          cookie: true,
          xfbml: false,
          version: "v26.0",
        });
        setSdkReady(true);
      };

      if (!document.getElementById("facebook-jssdk")) {
        const script = document.createElement("script");
        script.id = "facebook-jssdk";
        script.src = "https://connect.facebook.net/en_US/sdk.js";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    };

    const handleMetaMessage = (event) => {
      if (!TRUSTED_META_ORIGINS.has(event.origin)) return;

      let payload = event.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }

      if (payload?.type !== "WA_EMBEDDED_SIGNUP") return;

      if (payload.event === SUCCESS_EVENT && payload.data?.waba_id) {
        flowRef.current.session = payload;
        setNotice("Se recibió la confirmación de Meta. Esperando el código seguro…");
        void completeIfReady();
        return;
      }

      if (payload.event === "CANCEL") {
        setNotice("El flujo de Meta se canceló. No se cambiaron las variables de producción.");
      } else if (payload.event === "ERROR") {
        setError("Meta notificó un error en el flujo de incorporación. Revisa el panel de Meta antes de reintentar.");
      }
    };

    window.addEventListener("message", handleMetaMessage);
    initializeSdk();

    return () => {
      active = false;
      window.removeEventListener("message", handleMetaMessage);
    };
  }, [configuration?.appId, completeIfReady]);

  function launchSignup() {
    if (!configuration?.enabled || !sdkReady || !confirmed || busy) return;

    setError("");
    setNotice("Abriendo el flujo seguro de Meta…");
    setResult(null);
    flowRef.current = { code: null, session: null, processing: false };

    window.FB.login(
      (response) => {
        const code = response?.authResponse?.code || response?.code;
        if (typeof code !== "string" || !code) {
          flowRef.current = { code: null, session: null, processing: false };
          setNotice("No se recibió un código de autorización. Si cancelaste el flujo, no se realizaron cambios.");
          return;
        }

        flowRef.current.code = code;
        setNotice("Código recibido. Esperando la confirmación de la sesión de coexistencia…");
        void completeIfReady();
      },
      {
        config_id: configuration.configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: "3",
        },
      }
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f1e8] px-5 py-6 md:px-8 md:py-8">
      <section className="mx-auto max-w-5xl">
        <header className="rounded-[1.7rem] border border-[#eadfce] bg-[#2b1d12] p-6 text-white shadow-sm md:p-9">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d9b48f]">
            Integraciones · WhatsApp
          </p>
          <h1 className="mt-3 font-serif text-3xl tracking-tight md:text-5xl">
            Coexistencia de WhatsApp Business
          </h1>
          <p className="mt-4 max-w-3xl leading-relaxed text-white/75">
            Preparación del registro integrado para conectar la aplicación WhatsApp Business
            del hospedaje con Cloud API, conservando la atención desde el celular.
          </p>
        </header>

        <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed text-amber-950">
          <strong>No inicies el registro real mientras la revisión de permisos de Meta siga pendiente.</strong>
          Esta página permanece bloqueada hasta habilitarlo explícitamente en Render y confirmar
          la autorización para continuar.
        </div>

        <section className="mt-6 rounded-2xl border border-[#eadfce] bg-white p-5 shadow-sm md:p-7">
          <h2 className="font-serif text-2xl text-[#2d261f]">Configuración de Meta</h2>

          {loadingConfiguration ? (
            <p className="mt-4 text-sm text-[#6f6258]">Consultando la configuración del backend…</p>
          ) : configuration ? (
            <dl className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-[#fbf7ef] p-4">
                <dt className="text-xs font-black uppercase tracking-wide text-[#8f623a]">App ID</dt>
                <dd className="mt-2 break-all font-mono text-sm text-[#2d261f]">
                  {configuration.appId || "No configurado en Render"}
                </dd>
              </div>
              <div className="rounded-xl bg-[#fbf7ef] p-4">
                <dt className="text-xs font-black uppercase tracking-wide text-[#8f623a]">Configuration ID</dt>
                <dd className="mt-2 break-all font-mono text-sm text-[#2d261f]">
                  {configuration.configId || "No configurado en Render"}
                </dd>
              </div>
              <div className="rounded-xl bg-[#fbf7ef] p-4 md:col-span-2">
                <dt className="text-xs font-black uppercase tracking-wide text-[#8f623a]">Estado del flujo</dt>
                <dd className="mt-2 font-bold text-[#2d261f]">
                  {configuration.enabled
                    ? "Habilitado en el backend"
                    : "Bloqueado por seguridad"}
                </dd>
                {!configuration.enabled && (
                  <p className="mt-2 text-sm leading-relaxed text-[#6f6258]">
                    {configuration.reason ||
                      "El backend no permite iniciar el registro todavía."}
                  </p>
                )}
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-red-700">
              No se pudo leer la configuración. Comprueba que hayas iniciado sesión como administrador.
            </p>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-[#eadfce] bg-white p-5 shadow-sm md:p-7">
          <h2 className="font-serif text-2xl text-[#2d261f]">Verificaciones previas</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#6f6258]">
            <li>La solicitud de revisión de Meta debe estar aprobada para los permisos requeridos.</li>
            <li>El dominio del panel debe estar autorizado en la configuración de inicio de sesión de Meta.</li>
            <li>El titular debe tener a mano el teléfono con WhatsApp Business y poder completar la verificación solicitada por Meta.</li>
            <li>Este flujo no reemplaza automáticamente el token ni el Phone Number ID que usa actualmente el asesor.</li>
          </ul>

          <label className="mt-6 flex items-start gap-3 rounded-xl border border-[#eadfce] p-4 text-sm leading-relaxed text-[#2d261f]">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-[#8f623a]"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>
              Confirmo que el titular autorizó esta operación, que la revisión de Meta ya está aprobada
              y que estamos listos para iniciar el registro real del número comercial.
            </span>
          </label>

          <button
            type="button"
            onClick={launchSignup}
            disabled={!configuration?.enabled || !sdkReady || !confirmed || busy}
            className="mt-5 rounded-xl bg-[#8f623a] px-5 py-3 font-black text-white transition hover:bg-[#754d2c] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy
              ? "Verificando con Meta…"
              : !configuration?.enabled
                ? "Registro deshabilitado"
                : !sdkReady
                  ? "Cargando Meta…"
                  : "Iniciar vinculación de coexistencia"}
          </button>

          {notice && (
            <p role="status" className="mt-4 rounded-xl bg-blue-50 p-4 text-sm leading-relaxed text-blue-900">
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm leading-relaxed text-red-800">
              {error}
            </p>
          )}
        </section>

        {result && (
          <section className="mt-6 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm md:p-7">
            <h2 className="font-serif text-2xl text-[#2d261f]">Cuenta consultada</h2>
            <p className="mt-3 text-sm text-[#6f6258]">WABA ID</p>
            <p className="break-all font-mono text-sm text-[#2d261f]">{result.wabaId}</p>
            <p className="mt-4 text-sm leading-relaxed text-[#166534]">{result.message}</p>
            <div className="mt-5 space-y-3">
              {result.phoneNumbers?.length ? (
                result.phoneNumbers.map((phone) => (
                  <article key={phone.id} className="rounded-xl border border-[#eadfce] p-4">
                    <p className="font-bold text-[#2d261f]">{phone.displayPhoneNumber || "Número sin formato"}</p>
                    <p className="mt-1 break-all font-mono text-xs text-[#6f6258]">Phone Number ID: {phone.id}</p>
                    {phone.verifiedName && (
                      <p className="mt-1 text-sm text-[#6f6258]">Nombre verificado: {phone.verifiedName}</p>
                    )}
                  </article>
                ))
              ) : (
                <p className="text-sm text-[#6f6258]">Meta no devolvió números para esta cuenta.</p>
              )}
            </div>
            <p className="mt-5 text-sm leading-relaxed text-amber-900">
              No se guardó el token obtenido durante la consulta ni se modificaron las variables de Render.
              Antes de cambiar el número activo del asesor, verificaremos que el token de sistema tenga acceso a esta cuenta.
            </p>
          </section>
        )}
      </section>
    </div>
  );
}
