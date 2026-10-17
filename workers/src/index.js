const ALLOWED_ORIGINS = [
  "https://commonspool.org",
  "https://www.commonspool.org",
];

function originAllowed(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const url = new URL(origin);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const headers = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Accept",
    "Access-Control-Max-Age": "86400",
  };
  if (originAllowed(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }
  return headers;
}

function json(request, body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(request),
    },
  });
}

// The pool is not live yet, so there are no stats to report. Never return
// sample numbers here: the site shows whatever this endpoint says.
// fee and payout are published policy (faq.html, architecture.html), not stats.
function notLiveStatus() {
  return {
    phase: "not_live",
    network: "signet",
    fee: "1%",
    payout: "coinbase / PPLNS",
    updated_at: new Date().toISOString(),
  };
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (url.pathname === "/api/status" && request.method === "GET") {
      return json(request, notLiveStatus(), 200);
    }

    return json(request, { error: "not found" }, 404);
  },
};
