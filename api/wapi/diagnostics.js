import { getWapiInstanceStatus, getWapiQueue, getWapiRuntimeConfig } from "../_lib/wapi.js";
import { allowMethods, handleApiError, sendJson } from "../_lib/http.js";

function getQueryValue(req, key) {
  const host = req.headers.host || "localhost";
  const url = new URL(req.url || "", `https://${host}`);
  return url.searchParams.get(key);
}

function assertDiagnosticsSecret(req) {
  const expectedSecret = process.env.WAPI_WEBHOOK_SECRET;

  if (!expectedSecret) {
    throw Object.assign(new Error("WAPI_WEBHOOK_SECRET não está configurado."), { statusCode: 500 });
  }

  if (getQueryValue(req, "secret") !== expectedSecret) {
    throw Object.assign(new Error("Diagnóstico não autorizado."), { statusCode: 401 });
  }
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["GET"])) {
    return;
  }

  try {
    assertDiagnosticsSecret(req);

    const [status, queue] = await Promise.all([
      getWapiInstanceStatus(),
      getWapiQueue({ perPage: 10, page: 1 }),
    ]);

    sendJson(res, 200, {
      ok: true,
      config: getWapiRuntimeConfig(),
      status,
      queue,
    });
  } catch (error) {
    handleApiError(res, error);
  }
}
