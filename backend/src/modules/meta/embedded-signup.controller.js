import { env } from "../../config/env.js";

const SUCCESS_EVENT = "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING";

function isNumericId(value) {
  return typeof value === "string" && /^\d{5,40}$/.test(value);
}

function jsonOrEmpty(response) {
  return response.json().catch(() => ({}));
}

function safeGraphError(body) {
  return {
    code: Number.isFinite(Number(body?.error?.code))
      ? Number(body.error.code)
      : undefined,
    type: typeof body?.error?.type === "string"
      ? body.error.type.slice(0, 80)
      : undefined,
  };
}

export function embeddedSignupStatusController(_req, res) {
  const configured = Boolean(
    env.meta.appId &&
    env.meta.embeddedSignupConfigId &&
    env.meta.appSecret
  );
  const enabled = env.meta.embeddedSignupEnabled && configured;

  return res.json({
    success: true,
    data: {
      appId: env.meta.appId || null,
      configId: env.meta.embeddedSignupConfigId || null,
      configured,
      enabled,
      reason: enabled
        ? null
        : !configured
          ? "Faltan META_APP_ID, META_EMBEDDED_SIGNUP_CONFIG_ID o META_APP_SECRET en Render."
          : "El flujo permanece deshabilitado hasta confirmar que Meta aprobó la revisión y que se puede iniciar el registro.",
    },
  });
}

export async function completeEmbeddedSignupController(req, res) {
  // La activación es explícita en Render para evitar iniciar por accidente
  // el registro real mientras la revisión de Meta siga pendiente.
  if (!env.meta.embeddedSignupEnabled) {
    return res.status(409).json({
      success: false,
      message: "El registro de coexistencia está deshabilitado en el backend.",
    });
  }

  if (!env.meta.appId || !env.meta.embeddedSignupConfigId || !env.meta.appSecret) {
    return res.status(503).json({
      success: false,
      message: "La configuración de Embedded Signup no está completa en el backend.",
    });
  }

  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  const wabaId = typeof req.body?.wabaId === "string" ? req.body.wabaId.trim() : "";
  const event = typeof req.body?.event === "string" ? req.body.event : "";

  if (
    !code ||
    code.length > 4096 ||
    !isNumericId(wabaId) ||
    event !== SUCCESS_EVENT
  ) {
    return res.status(400).json({
      success: false,
      message: "La confirmación de Embedded Signup no es válida o está incompleta.",
    });
  }

  let accessToken;

  try {
    const exchangeUrl = new URL(
      `https://graph.facebook.com/${env.meta.graphApiVersion}/oauth/access_token`
    );
    exchangeUrl.searchParams.set("client_id", env.meta.appId);
    exchangeUrl.searchParams.set("client_secret", env.meta.appSecret);
    exchangeUrl.searchParams.set("code", code);

    const exchangeResponse = await fetch(exchangeUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const exchangeBody = await jsonOrEmpty(exchangeResponse);

    if (!exchangeResponse.ok || typeof exchangeBody.access_token !== "string") {
      console.error("Meta Embedded Signup code exchange failed", {
        httpStatus: exchangeResponse.status,
        ...safeGraphError(exchangeBody),
      });
      return res.status(502).json({
        success: false,
        message: "Meta no pudo validar el código de incorporación. Si el código ya se consumió, inicia un flujo nuevo.",
      });
    }

    accessToken = exchangeBody.access_token;

    const phoneNumbersUrl = new URL(
      `https://graph.facebook.com/${env.meta.graphApiVersion}/${encodeURIComponent(wabaId)}/phone_numbers`
    );
    phoneNumbersUrl.searchParams.set(
      "fields",
      "id,display_phone_number,verified_name"
    );

    const phoneNumbersResponse = await fetch(phoneNumbersUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const phoneNumbersBody = await jsonOrEmpty(phoneNumbersResponse);

    if (!phoneNumbersResponse.ok || !Array.isArray(phoneNumbersBody.data)) {
      console.error("Meta Embedded Signup phone-number lookup failed", {
        httpStatus: phoneNumbersResponse.status,
        ...safeGraphError(phoneNumbersBody),
      });
      return res.status(502).json({
        success: false,
        message: "Meta confirmó el código, pero no fue posible consultar los números de esa cuenta. No se modificaron las variables de Render.",
      });
    }

    const phoneNumbers = phoneNumbersBody.data
      .filter((phone) => isNumericId(String(phone?.id ?? "")))
      .map((phone) => ({
        id: String(phone.id),
        displayPhoneNumber:
          typeof phone.display_phone_number === "string"
            ? phone.display_phone_number
            : null,
        verifiedName:
          typeof phone.verified_name === "string"
            ? phone.verified_name
            : null,
      }));

    return res.json({
      success: true,
      data: {
        wabaId,
        phoneNumbers,
        tokenStored: false,
        productionSettingsChanged: false,
        message: "La cuenta fue consultada. El token temporal se descartó y no se modificaron WHATSAPP_ACCESS_TOKEN ni WHATSAPP_PHONE_NUMBER_ID.",
      },
    });
  } catch (error) {
    console.error("Meta Embedded Signup request failed", {
      name: error?.name || "Error",
    });
    return res.status(502).json({
      success: false,
      message: "No se pudo completar la verificación con Meta. No se modificaron las variables de Render.",
    });
  } finally {
    // No se persiste ni se devuelve el token del intercambio.
    accessToken = undefined;
  }
}
