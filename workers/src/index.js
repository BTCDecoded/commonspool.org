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

function stubStatus() {
  const now = Date.now();
  return {
    phase: "stub",
    network: "signet",
    snapshot_id: "7c3e9a1f4b82d0e6a591c4f8b2d7e0136a8c5f91d4b0e27a9c1d6f83b5e4a072",
    derivation_version: 1,
    peers_finalized: 8,
    quorum_status: "assembled",
    last_attestation_at: new Date(now - 4 * 60 * 1000).toISOString(),
    pending_shares: 142,
    last_checkpoint_at: new Date(now - 11 * 60 * 1000).toISOString(),
    hashrate: "48.2 TH/s",
    hashrate_3h: "51.0 TH/s",
    hashrate_24h: "44.7 TH/s",
    blocks_found: 7,
    miners: 12,
    btc_mined: 87.5,
    fee: "1%",
    payout: "coinbase / PPLNS",
    share_window: 10000,
    network_difficulty: "1.21k",
    avg_time_to_block: "3h 12m",
    last_block: {
      height: 1842,
      hash: "000000086c4a91e2b7d04f1c8a55e390b2d1c7a04e9f6b83a1c2d4e5f6071829",
      found_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      finder: "miner-a1",
      shares: 18420,
    },
    stale_peers: [
      { peer_id: "peer-03", checkpoints_behind: 2 },
      { peer_id: "peer-11", checkpoints_behind: 1 },
    ],
    contributors: [
      { miner_id: "miner-a1", hashrate: "12.4 TH/s", share_pct: "25.7%", expected_blocks: 1.8, actual_blocks: 2 },
      { miner_id: "miner-b7", hashrate: "9.1 TH/s", share_pct: "18.9%", expected_blocks: 1.3, actual_blocks: 1 },
      { miner_id: "miner-c3", hashrate: "6.8 TH/s", share_pct: "14.1%", expected_blocks: 1.0, actual_blocks: 1 },
      { miner_id: "miner-d2", hashrate: "5.4 TH/s", share_pct: "11.2%", expected_blocks: 0.8, actual_blocks: 1 },
      { miner_id: "miner-e9", hashrate: "4.2 TH/s", share_pct: "8.7%", expected_blocks: 0.6, actual_blocks: 1 },
      { miner_id: "miner-f4", hashrate: "3.1 TH/s", share_pct: "6.4%", expected_blocks: 0.4, actual_blocks: 1 },
      { miner_id: "miner-g8", hashrate: "2.4 TH/s", share_pct: "5.0%", expected_blocks: 0.3, actual_blocks: 0 },
      { miner_id: "miner-h1", hashrate: "1.8 TH/s", share_pct: "3.7%", expected_blocks: 0.3, actual_blocks: 0 },
    ],
    recent_blocks: [
      {
        found_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
        height: 1842,
        hash: "000000086c4a91e2b7d04f1c8a55e390b2d1c7a04e9f6b83a1c2d4e5f6071829",
        finder: "miner-a1",
        shares: 18420,
      },
      {
        found_at: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
        height: 1831,
        hash: "0000000a91c3e4b18d205f7a6c44d201e9b0c8f15a76e392d4c1b0a9f8e7d6c5",
        finder: "miner-d2",
        shares: 16110,
      },
    ],
    updated_at: new Date(now).toISOString(),
  };
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (url.pathname === "/api/status" && request.method === "GET") {
      return json(request, stubStatus(), 200);
    }

    return json(request, { error: "not found" }, 404);
  },
};
