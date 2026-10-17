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

  // Only a live pool's own numbers are shown. Before launch (or when the
  // status API can't be reached) every stat stays blank: no sample data.
  var NOT_LIVE_NOTE = "The pool is not live yet. Stats will appear here once it is.";
  var UNREACHABLE_NOTE = "Pool status is unavailable right now. No stats to show.";

  function applyStatus(root, data, unreachable) {
    var live = !!data && data.phase === "live";
    if (!live) {
      data = {
        network: (data && data.network) || "signet",
        fee: data && data.fee,
        payout: data && data.payout,
      };
    }
    root.classList.toggle("status-panel--live", live);
    root.classList.toggle("tape--live", live);

    var indicators = root.querySelectorAll(".indicator, .pip");
    for (var i = 0; i < indicators.length; i++) {
      indicators[i].classList.toggle("indicator--stub", !live);
      indicators[i].classList.toggle("pip--stub", !live);
      indicators[i].classList.toggle("indicator--live", live);
      indicators[i].classList.toggle("pip--live", live);
    }

    var notes = root.querySelectorAll("[data-field='notice']");
    for (var n = 0; n < notes.length; n++) {
      notes[n].hidden = live;
      notes[n].textContent = live ? "" : unreachable ? UNREACHABLE_NOTE : NOT_LIVE_NOTE;
    }

    var last = data.last_block || {};
    setText(root, "[data-field='phase-label']", live ? "mainnet live" : "signet testnet");
    setText(
      root,
      "[data-field='updated']",
      live ? "updated " + timeAgo(data.updated_at) : unreachable ? "status unavailable" : "not live yet"
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
    setText(root, "[data-field='payout']", data.payout || "coinbase / PPLNS");
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
      live ? String((data.stale_peers && data.stale_peers.length) || 0) : "—"
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

  function drawChart(svg, series) {
    if (!svg) return;
    if (!series || series.length < 2) {
      svg.innerHTML = "";
      return;
    }
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
    var data = root._poolData || {};
    var btn = root.querySelector('.range-tabs button[aria-pressed="true"]');
    var range = (btn && btn.getAttribute("data-range")) || "24h";
    var series = (data.hashrate_series && data.hashrate_series[range]) || [];
    var ext = drawChart(svg, series);
    setText(root, "[data-field='chart-low']", ext ? ext.min.toFixed(1) + " TH/s" : "—");
    setText(root, "[data-field='chart-high']", ext ? ext.max.toFixed(1) + " TH/s" : "—");
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
          applyStatus(root, null, true);
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
