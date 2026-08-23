(function () {
  "use strict";

  var API_BASE = document.documentElement.getAttribute("data-api-base") || "";
  var STATUS_PATH = "/api/status";
  var REFRESH_MS = 30000;

  function truncateHash(hex, head, tail) {
    if (!hex || hex.length <= head + tail + 1) return hex || "—";
    return hex.slice(0, head) + "…" + hex.slice(-tail);
  }

  function formatTime(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toISOString().replace(/\.\d{3}Z$/, "Z");
  }

  function timeAgo(iso) {
    if (!iso) return "—";
    var then = new Date(iso).getTime();
    if (isNaN(then)) return "—";
    var sec = Math.max(0, Math.round((Date.now() - then) / 1000));
    if (sec < 5) return "just now";
    if (sec < 60) return sec + "s ago";
    var min = Math.round(sec / 60);
    if (min < 60) return min + "m ago";
    var hr = Math.round(min / 60);
    if (hr < 48) return hr + "h ago";
    return formatTime(iso);
  }

  function elapsed(iso) {
    if (!iso) return "—";
    var then = new Date(iso).getTime();
    if (isNaN(then)) return "—";
    var sec = Math.max(0, Math.round((Date.now() - then) / 1000));
    if (sec < 60) return sec + "s";
    var min = Math.floor(sec / 60);
    if (min < 60) return min + "m " + (sec % 60) + "s";
    var hr = Math.floor(min / 60);
    return hr + "h " + (min % 60) + "m";
  }

  function setText(root, selector, value) {
    var nodes = root.querySelectorAll(selector);
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = value;
    }
  }

  function fillList(tbody, rows, colCount, renderRow) {
    if (!tbody) return;
    tbody.textContent = "";
    if (!rows || !rows.length) {
      var empty = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = colCount;
      td.textContent = "none";
      empty.appendChild(td);
      tbody.appendChild(empty);
      return;
    }
    for (var i = 0; i < rows.length; i++) {
      tbody.appendChild(renderRow(rows[i]));
    }
  }

  function cell(text) {
    var td = document.createElement("td");
    td.textContent = text;
    return td;
  }

  function lastBlockLine(block) {
    if (!block) return "—";
    var height = block.height != null ? String(block.height) : "—";
    return height + " · " + timeAgo(block.found_at);
  }

  function num(value) {
    return value == null || value === "" ? "—" : String(value);
  }

  function applyStatus(root, data) {
    var fallback = localStub();
    data = Object.assign({}, fallback, data || {});
    if (!data.last_block) data.last_block = fallback.last_block;
    if (!data.contributors || !data.contributors.length) data.contributors = fallback.contributors;
    if (!data.recent_blocks || !data.recent_blocks.length) data.recent_blocks = fallback.recent_blocks;
    if (!data.hashrate_series) data.hashrate_series = fallback.hashrate_series;

    var live = data.phase === "live";
    root.classList.toggle("status-panel--live", live);
    root.classList.toggle("tape--live", live);

    var indicators = root.querySelectorAll(".indicator, .pip");
    for (var i = 0; i < indicators.length; i++) {
      indicators[i].classList.toggle("indicator--stub", !live);
      indicators[i].classList.toggle("pip--stub", !live);
      indicators[i].classList.toggle("indicator--live", live);
      indicators[i].classList.toggle("pip--live", live);
    }

    var last = data.last_block || {};
    setText(root, "[data-field='phase-label']", live ? "mainnet live" : "signet testnet");
    setText(
      root,
      "[data-field='updated']",
      (live ? "updated " : "test data · ") + timeAgo(data.updated_at)
    );
    setText(root, "[data-field='snapshot_id']", truncateHash(data.snapshot_id, 8, 6));
    setText(root, "[data-field='snapshot_id_full']", truncateHash(data.snapshot_id, 8, 6));
    setText(root, "[data-field='peers_finalized']", num(data.peers_finalized));
    setText(root, "[data-field='pending_shares']", num(data.pending_shares));
    setText(root, "[data-field='quorum_status']", data.quorum_status || "—");
    setText(root, "[data-field='last_checkpoint_at']", formatTime(data.last_checkpoint_at));
    setText(root, "[data-field='derivation_version']", num(data.derivation_version));
    setText(root, "[data-field='attestation_age']", elapsed(data.last_attestation_at));
    setText(root, "[data-field='last_attestation_at']", formatTime(data.last_attestation_at));
    setText(root, "[data-field='network']", data.network || "signet");
    setText(root, "[data-field='hashrate']", data.hashrate || "—");
    setText(root, "[data-field='hashrate_3h']", data.hashrate_3h || "—");
    setText(root, "[data-field='hashrate_24h']", data.hashrate_24h || "—");
    setText(root, "[data-field='blocks_found']", num(data.blocks_found));
    setText(root, "[data-field='miners']", num(data.miners));
    setText(root, "[data-field='btc_mined']", num(data.btc_mined));
    setText(root, "[data-field='fee']", data.fee || "1%");
    setText(root, "[data-field='payout']", data.payout || "—");
    setText(root, "[data-field='share_window']", num(data.share_window));
    setText(root, "[data-field='network_difficulty']", data.network_difficulty || "—");
    setText(root, "[data-field='avg_time_to_block']", data.avg_time_to_block || "—");
    setText(root, "[data-field='last_block']", lastBlockLine(last));
    setText(root, "[data-field='last_block_height']", last.height != null ? String(last.height) : "—");
    setText(root, "[data-field='last_block_hash']", truncateHash(last.hash, 10, 8));
    setText(root, "[data-field='last_block_age']", timeAgo(last.found_at));
    setText(
      root,
      "[data-field='stale_count']",
      String((data.stale_peers && data.stale_peers.length) || 0)
    );

    fillList(root.querySelector("[data-list='stale_peers']"), data.stale_peers, 2, function (row) {
      var tr = document.createElement("tr");
      tr.appendChild(cell(row.peer_id));
      tr.appendChild(cell(String(row.checkpoints_behind)));
      return tr;
    });

    setText(root, "[data-field='luck']", data.luck || "—");
    setText(root, "[data-field='rejected_pct']", data.rejected_pct || "—");
    setText(root, "[data-field='orphans']", num(data.orphans));

    fillList(root.querySelector("[data-list='contributors']"), data.contributors, 6, function (row) {
      var tr = document.createElement("tr");
      tr.appendChild(cell(row.miner_id));
      tr.appendChild(cell(row.hashrate));
      tr.appendChild(cell(row.share_pct));
      tr.appendChild(cell(num(row.workers)));
      tr.appendChild(cell(String(row.expected_blocks)));
      tr.appendChild(cell(String(row.actual_blocks)));
      return tr;
    });

    fillShareBars(root.querySelector("[data-list='share-bars']"), data.contributors);
    fillCompose(root.querySelector("[data-compose='shares']"), data.contributors);

    fillList(root.querySelector("[data-list='miner_stats']"), data.contributors || data.miner_stats, 4, function (row) {
      var tr = document.createElement("tr");
      tr.appendChild(cell(row.miner_id));
      tr.appendChild(cell(String(row.expected_blocks)));
      tr.appendChild(cell(String(row.actual_blocks)));
      tr.appendChild(cell(row.hashrate || String(row.window_shares || "")));
      return tr;
    });

    var finds = root.querySelector("[data-list='recent_blocks']");
    if (finds && finds.tagName === "OL") {
      fillFinds(finds, data.recent_blocks);
    } else {
      fillList(finds, data.recent_blocks, 6, function (row) {
        var tr = document.createElement("tr");
        tr.appendChild(cell(timeAgo(row.found_at)));
        tr.appendChild(cell(String(row.height)));
        tr.appendChild(cell(truncateHash(row.hash, 8, 6)));
        tr.appendChild(cell(row.finder));
        tr.appendChild(cell(String(row.shares)));
        tr.appendChild(cell(row.difficulty || "—"));
        return tr;
      });
    }

    root._poolData = data;
    drawActiveChart(root);
    applyMinerFilter(root);
  }

  function hashSeries(hours, points, now) {
    var out = [];
    var i;
    for (i = 0; i < points; i++) {
      var t = now - ((points - 1 - i) * (hours * 3600000) / (points - 1));
      var wave = 48.2 + Math.sin(i / 3.7) * 5.4 + ((i * 13) % 9) - 4;
      out.push({ t: t, th: Math.round(Math.max(28, wave) * 10) / 10 });
    }
    return out;
  }

  function drawChart(svg, series) {
    if (!svg || !series || !series.length) return;
    var w = 800;
    var h = 200;
    var pad = 8;
    var min = series[0].th;
    var max = series[0].th;
    var i;
    for (i = 1; i < series.length; i++) {
      if (series[i].th < min) min = series[i].th;
      if (series[i].th > max) max = series[i].th;
    }
    if (min === max) {
      min -= 1;
      max += 1;
    }
    var pts = [];
    for (i = 0; i < series.length; i++) {
      var x = pad + (i / (series.length - 1)) * (w - pad * 2);
      var y = pad + (1 - (series[i].th - min) / (max - min)) * (h - pad * 2);
      pts.push(x.toFixed(1) + "," + y.toFixed(1));
    }
    var line = pts.join(" ");
    var fill = pad + "," + (h - pad) + " " + line + " " + (w - pad) + "," + (h - pad);
    svg.innerHTML =
      '<polyline fill="#141418" stroke="none" points="' +
      fill +
      '"></polyline>' +
      '<polyline fill="none" stroke="#eeeae3" stroke-width="1.5" points="' +
      line +
      '"></polyline>';
    return { min: min, max: max };
  }

  function drawActiveChart(root) {
    var svg = root.querySelector("[data-chart='hashrate']");
    if (!svg) return;
    var data = root._poolData || localStub();
    var btn = root.querySelector('.range-tabs button[aria-pressed="true"]');
    var range = (btn && btn.getAttribute("data-range")) || "24h";
    var series = (data.hashrate_series && data.hashrate_series[range]) || [];
    var ext = drawChart(svg, series);
    if (ext) {
      setText(root, "[data-field='chart-low']", ext.min.toFixed(1) + " TH/s");
      setText(root, "[data-field='chart-high']", ext.max.toFixed(1) + " TH/s");
    }
  }

  function sharePct(row) {
    return parseFloat(String(row.share_pct || "0").replace("%", "")) || 0;
  }

  function fillCompose(host, rows) {
    if (!host) return;
    host.textContent = "";
    if (!rows || !rows.length) return;
    for (var i = 0; i < rows.length; i++) {
      var seg = document.createElement("span");
      seg.className = "compose__seg";
      seg.style.flexGrow = String(Math.max(sharePct(rows[i]), 0.4));
      seg.title = rows[i].miner_id + " " + (rows[i].share_pct || "");
      host.appendChild(seg);
    }
  }

  function fillShareBars(host, rows) {
    if (!host) return;
    host.textContent = "";
    if (!rows || !rows.length) {
      var empty = document.createElement("p");
      empty.className = "status-note";
      empty.textContent = "none";
      host.appendChild(empty);
      return;
    }
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var el = document.createElement("div");
      el.className = "bar";
      var meta = document.createElement("div");
      meta.className = "bar__meta";
      var name = document.createElement("span");
      name.textContent = row.miner_id;
      var val = document.createElement("span");
      val.className = "muted";
      val.textContent = (row.share_pct || "—") + (row.hashrate ? " · " + row.hashrate : "");
      meta.appendChild(name);
      meta.appendChild(val);
      var track = document.createElement("div");
      track.className = "bar__track";
      var fill = document.createElement("span");
      fill.className = "bar__fill";
      fill.style.width = sharePct(row) + "%";
      track.appendChild(fill);
      el.appendChild(meta);
      el.appendChild(track);
      host.appendChild(el);
    }
  }

  function fillFinds(list, rows) {
    list.textContent = "";
    if (!rows || !rows.length) {
      var empty = document.createElement("li");
      empty.className = "find";
      empty.textContent = "none";
      list.appendChild(empty);
      return;
    }
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var li = document.createElement("li");
      li.className = "find";
      var age = document.createElement("span");
      age.className = "find__age";
      age.textContent = timeAgo(row.found_at);
      var h = document.createElement("span");
      h.className = "find__h";
      h.textContent = String(row.height);
      var meta = document.createElement("span");
      meta.className = "find__meta";
      meta.textContent =
        (row.finder || "—") + " · " + truncateHash(row.hash, 8, 6);
      li.appendChild(age);
      li.appendChild(h);
      li.appendChild(meta);
      list.appendChild(li);
    }
  }

  function applyMinerFilter(root) {
    var input = root.querySelector('[data-filter="contributors"]');
    if (!input) return;
    var q = input.value.toLowerCase().trim();
    var rows = root.querySelectorAll("[data-list='contributors'] tr, [data-list='share-bars'] .bar");
    for (var i = 0; i < rows.length; i++) {
      var text = rows[i].textContent.toLowerCase();
      rows[i].classList.toggle("is-hidden", q !== "" && text.indexOf(q) === -1);
    }
  }

  function localStub() {
    var now = Date.now();
    return {
      hashrate_series: {
        "24h": hashSeries(24, 48, now),
        "7d": hashSeries(24 * 7, 56, now),
        "30d": hashSeries(24 * 30, 60, now),
      },
      luck: "112%",
      rejected_pct: "1.8%",
      orphans: 0,
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
        { miner_id: "miner-a1", hashrate: "12.4 TH/s", share_pct: "25.7%", workers: 4, expected_blocks: 1.8, actual_blocks: 2 },
        { miner_id: "miner-b7", hashrate: "9.1 TH/s", share_pct: "18.9%", workers: 3, expected_blocks: 1.3, actual_blocks: 1 },
        { miner_id: "miner-c3", hashrate: "6.8 TH/s", share_pct: "14.1%", workers: 2, expected_blocks: 1.0, actual_blocks: 1 },
        { miner_id: "miner-d2", hashrate: "5.4 TH/s", share_pct: "11.2%", workers: 2, expected_blocks: 0.8, actual_blocks: 1 },
        { miner_id: "miner-e9", hashrate: "4.2 TH/s", share_pct: "8.7%", workers: 1, expected_blocks: 0.6, actual_blocks: 1 },
        { miner_id: "miner-f4", hashrate: "3.1 TH/s", share_pct: "6.4%", workers: 1, expected_blocks: 0.4, actual_blocks: 1 },
        { miner_id: "miner-g8", hashrate: "2.4 TH/s", share_pct: "5.0%", workers: 1, expected_blocks: 0.3, actual_blocks: 0 },
        { miner_id: "miner-h1", hashrate: "1.8 TH/s", share_pct: "3.7%", workers: 1, expected_blocks: 0.3, actual_blocks: 0 },
        { miner_id: "miner-j6", hashrate: "1.2 TH/s", share_pct: "2.5%", workers: 1, expected_blocks: 0.2, actual_blocks: 0 },
        { miner_id: "miner-k3", hashrate: "0.9 TH/s", share_pct: "1.9%", workers: 1, expected_blocks: 0.1, actual_blocks: 0 },
        { miner_id: "miner-m2", hashrate: "0.6 TH/s", share_pct: "1.2%", workers: 1, expected_blocks: 0.1, actual_blocks: 0 },
        { miner_id: "miner-n8", hashrate: "0.3 TH/s", share_pct: "0.7%", workers: 1, expected_blocks: 0.0, actual_blocks: 0 },
      ],
      recent_blocks: [
        {
          found_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
          height: 1842,
          hash: "000000086c4a91e2b7d04f1c8a55e390b2d1c7a04e9f6b83a1c2d4e5f6071829",
          finder: "miner-a1",
          shares: 18420,
          difficulty: "1.21k",
        },
        {
          found_at: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
          height: 1831,
          hash: "0000000a91c3e4b18d205f7a6c44d201e9b0c8f15a76e392d4c1b0a9f8e7d6c5",
          finder: "miner-d2",
          shares: 16110,
          difficulty: "1.21k",
        },
        {
          found_at: new Date(now - 11 * 60 * 60 * 1000).toISOString(),
          height: 1819,
          hash: "00000004e2b91a70c3d85f14a6b0e291d7c4a8f03e55b162c9d0e1f2a3b4c5d6",
          finder: "miner-b7",
          shares: 19840,
          difficulty: "1.21k",
        },
        {
          found_at: new Date(now - 15 * 60 * 60 * 1000).toISOString(),
          height: 1804,
          hash: "00000011b8c0d4e5f6a7182930415263748596a7b8c9d0e1f203142536475869",
          finder: "miner-c3",
          shares: 14220,
          difficulty: "1.19k",
        },
        {
          found_at: new Date(now - 22 * 60 * 60 * 1000).toISOString(),
          height: 1788,
          hash: "00000007d1c2b3a49586757463524130291807f6e5d4c3b2a1908071625344",
          finder: "miner-e9",
          shares: 17650,
          difficulty: "1.19k",
        },
        {
          found_at: new Date(now - 29 * 60 * 60 * 1000).toISOString(),
          height: 1766,
          hash: "00000002c8d9e0f1a2b30415263748596a7b8c9d0e1f2031425364758697a8b9",
          finder: "miner-f4",
          shares: 15330,
          difficulty: "1.18k",
        },
        {
          found_at: new Date(now - 38 * 60 * 60 * 1000).toISOString(),
          height: 1741,
          hash: "00000009a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabb",
          finder: "miner-a1",
          shares: 20110,
          difficulty: "1.18k",
        },
      ],
      updated_at: new Date(now).toISOString(),
    };
  }

  function fetchStatus() {
    return fetch(API_BASE + STATUS_PATH, {
      headers: { Accept: "application/json" },
    }).then(function (res) {
      if (!res.ok) throw new Error("status " + res.status);
      return res.json();
    });
  }

  function bindPanel(root) {
    var refresh = root.getAttribute("data-refresh") === "true";

    function tick() {
      fetchStatus()
        .then(function (data) {
          applyStatus(root, data);
        })
        .catch(function () {
          applyStatus(root, localStub());
        });
    }

    var tabs = root.querySelectorAll(".range-tabs button");
    for (var t = 0; t < tabs.length; t++) {
      tabs[t].addEventListener("click", function () {
        for (var j = 0; j < tabs.length; j++) {
          tabs[j].setAttribute("aria-pressed", tabs[j] === this ? "true" : "false");
        }
        drawActiveChart(root);
      });
    }

    var filter = root.querySelector('[data-filter="contributors"]');
    if (filter) {
      filter.addEventListener("input", function () {
        applyMinerFilter(root);
      });
    }

    tick();
    if (refresh) {
      window.setInterval(tick, REFRESH_MS);
    }
  }

  var panels = document.querySelectorAll("[data-status-panel]");
  for (var i = 0; i < panels.length; i++) {
    bindPanel(panels[i]);
  }
})();
