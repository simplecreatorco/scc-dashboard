/* ══════════════════════════════════════════════════════════
   SCC HQ · Attribution tab (Hyros replacement)
   Self-contained module. Reads from the hq-attribution Worker with a
   personal access key (stored in this browser only). Uses hq.html's
   design tokens and helpers (esc, pillHTML, statCard, fC, fR, roasColor).
   All data-act values here start with "at-" so they never collide.
   ══════════════════════════════════════════════════════════ */
var ATTR = (function () {
  var BASE = 'https://hq-attribution.black-bread-143b.workers.dev';
  var KEY_STORE = 'hqa-key';
  var S = {
    brand: 'scc', view: 'overview', days: 7, custom: { from: null, to: null }, model: null, organic: null,
    level: 'adset', leadsStatus: '', leadsQ: '', person: null, sub: 'general', cohortKind: 'webinar',
    data: {}, loading: {}, err: {}, me: null, chart: null, lastRangeKey: null, keyErr: ''
  };
  try { S.brand = sessionStorage.getItem('hqa-brand') || 'scc'; S.view = sessionStorage.getItem('hqa-view') || 'overview'; } catch (e) {}

  var CSS = '.at-table{width:100%;border-collapse:collapse;font-size:13px}.at-table th{font-family:var(--label);font-weight:700;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dusty);text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);white-space:nowrap}' +
    '.at-table td{padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}.at-table tr:last-child td{border-bottom:0}.at-table td.r,.at-table th.r{text-align:right;white-space:nowrap}.at-table tr.click{cursor:pointer}.at-table tr.click:hover td{background:#FAFAFA}' +
    '.at-scroll{overflow-x:auto}.at-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:middle}.at-in{font-family:var(--body);font-size:14px;color:var(--text);border:1px solid var(--line);border-radius:12px;padding:8px 12px;background:#fff;outline:none;width:100%}.at-in:focus{border-color:var(--dusty)}' +
    'select.at-in{width:auto}.at-form{display:grid;gap:10px}.at-form label{font-family:var(--label);font-weight:700;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dusty)}.at-code{font-family:ui-monospace,Menlo,monospace;font-size:12px;background:var(--gray);border-radius:10px;padding:10px 12px;word-break:break-all;white-space:pre-wrap}' +
    '.at-sub{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px}.at-tl{border-left:2px solid var(--line);margin-left:6px;padding-left:16px}.at-tl-i{position:relative;padding:6px 0 14px}.at-tl-i::before{content:"";position:absolute;left:-22px;top:12px;width:10px;height:10px;border-radius:50%;background:var(--dusty)}.at-tl-i.buy::before{background:var(--good)}.at-tl-i.ab::before{background:var(--warn)}.at-tl-i.ad::before{background:var(--coral)}' +
    '.at-flag{color:var(--bad);font-weight:600}.at-ok{color:var(--good);font-weight:600}.at-warn{color:var(--warn);font-weight:600}.at-tag{display:inline-block;border-radius:50px;padding:2px 9px;font-family:var(--label);font-weight:700;font-size:10px;letter-spacing:1px;text-transform:uppercase;border:1px solid var(--line);color:var(--dusty)}' +
    '@media(max-width:720px){.at-table{font-size:12px}.at-table td,.at-table th{padding:7px 6px}}';
  function ensureCss() { if (document.getElementById('at-css')) return; var st = document.createElement('style'); st.id = 'at-css'; st.textContent = CSS; document.head.appendChild(st); }

  /* ── helpers ───────────────────────────────────────────── */
  function getKey() { try { return localStorage.getItem(KEY_STORE); } catch (e) { return window.__hqaKey || null; } }
  function setKey(k) { try { localStorage.setItem(KEY_STORE, k); } catch (e) { window.__hqaKey = k; } }
  function clearKey() { try { localStorage.removeItem(KEY_STORE); } catch (e) {} window.__hqaKey = null; }
  function rangeQS() {
    if (S.days === 'custom' && S.custom.from && S.custom.to) return 'from=' + S.custom.from + '&to=' + S.custom.to;
    return 'days=' + (S.days || 7);
  }
  function modelQS() { return (S.model ? '&model=' + S.model : '') + (S.organic ? '&organic=' + S.organic : ''); }
  function call(path, opts) {
    opts = opts || {};
    var sep = path.indexOf('?') === -1 ? '?' : '&';
    var url = BASE + '/api' + path + sep + 'brand=' + S.brand;
    var headers = { Authorization: 'Bearer ' + (getKey() || '') };
    if (opts.body) headers['Content-Type'] = 'application/json';
    return fetch(url, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(function (r) { return r.json().then(function (j) { if (r.status === 401) { j.__auth = true; } return j; }); });
  }
  function load(name, path, force) {
    var k = name + '|' + S.brand + '|' + rangeQS() + modelQS();
    if (!force && S.data[k]) return Promise.resolve(S.data[k]);
    if (S.loading[k]) return S.loading[k];
    S.loading[k] = call(path).then(function (j) {
      delete S.loading[k];
      if (j.__auth) { clearKey(); S.keyErr = 'That key was not accepted. Paste it again.'; render(); throw new Error('auth'); }
      if (!j.ok) { S.err[k] = j.error || 'Failed'; throw new Error(j.error || 'Failed'); }
      delete S.err[k]; S.data[k] = j; return j;
    });
    return S.loading[k];
  }
  function cached(name) { return S.data[name + '|' + S.brand + '|' + rangeQS() + modelQS()] || null; }
  function errOf(name) { return S.err[name + '|' + S.brand + '|' + rangeQS() + modelQS()] || null; }
  function invalidate() { S.data = {}; S.err = {}; }
  function money(v) { return (v === null || v === undefined || isNaN(v)) ? '–' : '$' + Math.round(v).toLocaleString('en-US'); }
  function x(v) { return (v === null || v === undefined || isNaN(v)) ? '–' : Number(v).toFixed(2) + 'x'; }
  function pct(v) { return (v === null || v === undefined || isNaN(v)) ? '–' : Math.round(v * 100) + '%'; }
  function n0(v) { return (v === null || v === undefined || isNaN(v)) ? '–' : Math.round(v).toLocaleString('en-US'); }
  function when(iso) { if (!iso) return ''; var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  function roasC(v, th) { if (v === null || v === undefined || isNaN(v)) return C_TEXT; th = th || {}; if (v >= (th.target || 1.65)) return C_GOOD; if (v >= (th.breakeven || 1.35)) return C_WARN; return C_BAD; }
  function pill(label, act, val, on) { return pillHTML(label, act, val, on); }
  function dot(color) { return '<span class="at-dot" style="background:' + color + ';"></span>'; }
  function stateColor(s) { return s === 'green' ? C_GOOD : s === 'yellow' ? C_WARN : s === 'red' ? C_BAD : C_DUSTY; }
  function card(inner, style) { return '<div class="card" style="padding:18px 20px;' + (style || '') + '">' + inner + '</div>'; }
  function loadingCard(t) { return '<div class="card empty">' + (t || 'Loading') + '</div>'; }
  function errCard(t) { return '<div class="card" style="padding:20px;"><div class="h-card">Didn\u2019t load</div><p style="margin-top:6px;">' + esc(t) + '</p></div>'; }
  function view() { return document.getElementById('view'); }

  /* ── key gate ──────────────────────────────────────────── */
  function keyPrompt() {
    return '<div class="card" style="max-width:520px;margin:20px auto;padding:32px 28px;text-align:center;">' +
      '<div class="eyebrow">Attribution</div><h2 class="h-card" style="margin-top:8px;">Enter your access key</h2>' +
      '<p style="margin-top:8px;">Keys start with <b>hqa_</b>. Rebecca creates them under Settings \u2192 Users. Yours is stored only in this browser.</p>' +
      '<input id="at-key" class="at-in" type="password" placeholder="hqa_..." style="margin:20px 0 12px;text-align:center;" />' +
      '<button class="btn-primary" data-act="at-key-save" style="width:100%;">Open Attribution</button>' +
      '<div class="login-err">' + esc(S.keyErr || '') + '</div></div>';
  }

  /* ── chrome ────────────────────────────────────────────── */
  var VIEWS = [['overview', 'Overview'], ['ads', 'Ads'], ['take', 'Take Rates'], ['leads', 'Leads'], ['cohorts', 'Cohorts'], ['organic', 'Organic'], ['alerts', 'Alerts'], ['hyros', 'vs Hyros'], ['settings', 'Settings']];
  function header() {
    var h = '<div class="row-between" style="margin-bottom:14px;align-items:flex-end;">';
    h += '<div><div class="eyebrow">' + (S.brand === 'scc' ? 'Simple Creator Co.' : 'Rebecca Rice Photography') + '</div><h1 class="h-hero" style="margin-top:6px;">Attribution</h1></div>';
    h += '<div class="range-row">' + pill('SCC', 'at-brand', 'scc', S.brand === 'scc') + pill('RRP', 'at-brand', 'rrp', S.brand === 'rrp') +
      '<span style="width:8px;"></span>' + (S.me ? '<span class="small muted">' + esc(S.me.name) + ' \u00b7 ' + esc(S.me.role) + '</span>' : '') +
      '<button class="linklab" data-act="at-key-clear" style="margin-left:8px;">Change key</button></div></div>';
    h += '<div class="at-sub">';
    for (var i = 0; i < VIEWS.length; i++) h += pill(VIEWS[i][1], 'at-view', VIEWS[i][0], S.view === VIEWS[i][0]);
    h += '</div>';
    return h;
  }
  function rangeBar(withModel) {
    var h = '<div class="row-between" style="margin-bottom:16px;"><div class="range-row"><span class="lab" style="margin-right:4px;">Window</span>' +
      pill('Today', 'at-days', '1', S.days === 1) + pill('7-Day', 'at-days', '7', S.days === 7) + pill('14-Day', 'at-days', '14', S.days === 14) + pill('30-Day', 'at-days', '30', S.days === 30) + pill('Custom', 'at-days', 'custom', S.days === 'custom');
    if (S.days === 'custom') h += '<input type="date" id="at-from" value="' + (S.custom.from || '') + '"><input type="date" id="at-to" value="' + (S.custom.to || '') + '">';
    h += '</div>';
    if (withModel) {
      h += '<div class="range-row"><span class="lab">Model</span><select class="at-in" id="at-model"><option value="">Default</option><option value="last"' + (S.model === 'last' ? ' selected' : '') + '>Last click</option><option value="first"' + (S.model === 'first' ? ' selected' : '') + '>First click</option><option value="scientific"' + (S.model === 'scientific' ? ' selected' : '') + '>Scientific</option><option value="linear"' + (S.model === 'linear' ? ' selected' : '') + '>Linear</option></select>' +
        '<select class="at-in" id="at-organic"><option value="">All sources</option><option value="paid"' + (S.organic === 'paid' ? ' selected' : '') + '>Prioritize paid</option><option value="organic"' + (S.organic === 'organic' ? ' selected' : '') + '>Organic only</option></select>' +
        '<button class="pill sm" data-act="at-refresh">Refresh</button></div>';
    } else h += '<div class="range-row"><button class="pill sm" data-act="at-refresh">Refresh</button></div>';
    h += '</div>';
    return h;
  }

  /* ── charts ────────────────────────────────────────────── */
  function drawSeries(canvasId, series) {
    var c = document.getElementById(canvasId); if (!c || !window.Chart) return;
    if (S.chart) { try { S.chart.destroy(); } catch (e) {} }
    var labels = series.map(function (d) { var p = d.date.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleString('en-US', { month: 'short', day: 'numeric' }); });
    var line = function (label, data, color, dash) { return { label: label, data: data, borderColor: color, borderWidth: dash ? 1.5 : 2.5, borderDash: dash || [], pointRadius: dash ? 0 : 3, pointBackgroundColor: color, tension: .3, fill: false }; };
    S.chart = new Chart(c.getContext('2d'), { type: 'line', data: { labels: labels, datasets: [
      line('Ad spend', series.map(function (d) { return Math.round(d.spend); }), C_DUSTY),
      line('Tracked revenue (paid)', series.map(function (d) { return Math.round(d.paid_revenue); }), C_GOOD),
      line('All tracked revenue', series.map(function (d) { return Math.round(d.revenue); }), C_CORAL, [4, 4]),
      line('Meta-reported value', series.map(function (d) { return Math.round(d.meta_value); }), C_WARN, [2, 4])
    ] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { usePointStyle: true, boxWidth: 8, font: { family: 'Nunito', size: 11 }, color: C_TEXT } }, tooltip: { mode: 'index', intersect: false, backgroundColor: '#fff', titleColor: C_DUSTY, bodyColor: C_TEXT, borderColor: C_LINE, borderWidth: 1, callbacks: { label: function (ctx) { return ' ' + ctx.dataset.label + ': $' + Math.round(ctx.parsed.y).toLocaleString('en-US'); } } } },
      scales: { x: { grid: { display: false }, border: { display: false }, ticks: { font: { family: 'Nunito', size: 10 }, color: C_TEXT } }, y: { min: 0, grid: { color: C_LINE }, border: { display: false }, ticks: { font: { family: 'Nunito', size: 10 }, color: C_TEXT, maxTicksLimit: 6, callback: function (v) { return v >= 1000 ? '$' + (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k' : '$' + Math.round(v); } } } } } });
  }

  /* ── Overview ──────────────────────────────────────────── */
  function renderOverview() {
    var d = cached('overview'), e = errOf('overview');
    if (!d && !e) { load('overview', '/overview?' + rangeQS() + modelQS()).then(render).catch(function () { render(); }); return header() + rangeBar(true) + loadingCard('Loading attribution'); }
    if (e) return header() + rangeBar(true) + errCard(e);
    var t = d.totals, th = d.thresholds, br = d.breaker;
    var h = header() + rangeBar(true);
    var setup = [];
    if (!d.settings.has_meta_token) setup.push('META_ACCESS_TOKEN is not set, so spend and ROAS stay empty. Paste the Meta system-user token in Cloudflare \u2192 hq-attribution \u2192 Variables and Secrets.');
    if (!d.settings.pixel_id) setup.push('No Pixel ID yet. Add it under Settings \u2192 General before switching Meta purchase sending to live.');
    for (var i = 0; i < setup.length; i++) h += '<div class="alert" style="border-color:' + C_WARN + ';">' + esc(setup[i]) + '</div>';
    h += '<div class="grid g4" style="margin-bottom:12px;">';
    h += statCard('Ad Spend', money(t.spend), d.range.from + ' to ' + d.range.to);
    h += statCard('Tracked Revenue', money(t.revenue), 'Paid ' + money(t.paid_revenue) + (t.refunds ? ' \u00b7 refunds ' + money(t.refunds) : ''));
    h += statCard('ROAS', x(t.roas), 'Meta says ' + x(t.meta_roas), roasC(t.roas, th));
    h += statCard('Cost per Buyer', money(t.cpb), t.buyers + ' buyers \u00b7 ' + Math.round(t.new_buyers) + ' new');
    h += '</div><div class="grid g4" style="margin-bottom:20px;">';
    h += statCard('AOV', money(t.aov), Math.round(t.orders) + ' orders');
    h += statCard('Leads', n0(t.leads), t.abandoned + ' abandoned checkouts');
    h += statCard('Break-even', x(th.breakeven), 'Target ' + x(th.target), t.roas === null ? null : (t.roas >= th.breakeven ? C_GOOD : C_BAD));
    h += statCard('Circuit Breaker', '<span style="color:' + stateColor(br.state) + ';">' + br.state.toUpperCase() + '</span>', 'Trailing ' + br.days + '-day ' + x(br.roas));
    h += '</div>';
    h += '<div class="callout" style="border-left-color:' + stateColor(br.state) + ';margin-bottom:20px;font-size:13.5px;">' + esc(br.advice) + ' <span class="muted">Cut line ' + x(br.cut_line) + ', winners-only line ' + x(br.winners_line) + '. Meta purchase sending is <b>' + esc(d.settings.capi_mode) + '</b>.</span></div>';
    h += '<div class="card" style="padding:18px 20px 14px;margin-bottom:20px;"><div class="lab" style="margin-bottom:10px;">Daily</div><div class="chart-box"><canvas id="at-chart"></canvas></div></div>';
    if (d.alerts.length) {
      h += '<h2 class="h-sec" style="margin-bottom:10px;">Open alerts</h2><div class="card list">';
      for (var a = 0; a < d.alerts.length; a++) h += '<div class="row"><div class="row-in" data-act="at-view" data-v="alerts" style="border-left-color:' + (d.alerts[a].level === 'money' ? C_BAD : C_WARN) + ';"><div><div class="row-name">' + esc(d.alerts[a].title) + '</div><div class="row-sub">' + esc(when(d.alerts[a].created_at)) + '</div></div></div></div>';
      h += '</div>';
    }
    setTimeout(function () { drawSeries('at-chart', d.series || []); }, 0);
    return h;
  }

  /* ── Ads ───────────────────────────────────────────────── */
  function adsTable(rows, th, opts) {
    opts = opts || {};
    var h = '<div class="at-scroll"><table class="at-table"><thead><tr><th>' + (opts.first || 'Source') + '</th><th class="r">Spend</th><th class="r">Clicks</th><th class="r">Leads</th><th class="r">Aband.</th><th class="r">Buyers</th><th class="r">Revenue</th><th class="r">ROAS</th><th class="r">Meta ROAS</th><th class="r">CPB</th><th class="r">AOV</th><th class="r">New/Ret</th></tr></thead><tbody>';
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i], flag = r.params_ok === 0 && r.status === 'ACTIVE';
      h += '<tr' + (r.type === 'paid_meta' && r.id ? ' class="click" data-act="at-drill" data-v="' + esc(r.id) + '"' : '') + '><td><div style="font-weight:600;">' + esc(r.label) + '</div><div class="small muted">' + (r.type === 'paid_meta' ? (r.status ? esc(r.status.toLowerCase()) + (r.budget ? ' \u00b7 $' + Math.round(r.budget) + '/day' : '') : 'Meta ad') : esc(r.type)) + (flag ? ' \u00b7 <span class="at-flag">missing URL params</span>' : '') + (r.zero_upsell ? ' \u00b7 <span class="at-warn">zero upsells</span>' : '') + '</div></td>';
      h += '<td class="r">' + money(r.spend) + '</td><td class="r">' + n0(r.clicks) + '</td><td class="r">' + n0(r.leads) + '</td><td class="r">' + n0(r.abandoned) + '</td><td class="r">' + n0(r.buyers) + '</td><td class="r">' + money(r.revenue) + '</td>';
      h += '<td class="r" style="color:' + roasC(r.roas, th) + ';font-weight:600;">' + x(r.roas) + '</td><td class="r muted">' + x(r.meta_roas) + '</td><td class="r">' + money(r.cpb) + '</td><td class="r">' + money(r.aov) + '</td><td class="r">' + Math.round(r.new_buyers) + '/' + Math.round(r.returning) + '</td></tr>';
    }
    if (!rows.length) h += '<tr><td colspan="12" class="empty">Nothing tracked in this window yet.</td></tr>';
    return h + '</tbody></table></div>';
  }
  function renderAds() {
    var name = 'ads-' + S.level, d = cached(name), e = errOf(name);
    if (!d && !e) { load(name, '/ads?level=' + S.level + '&' + rangeQS() + modelQS()).then(render).catch(function () { render(); }); return header() + rangeBar(true) + loadingCard(); }
    if (e) return header() + rangeBar(true) + errCard(e);
    var h = header() + rangeBar(true);
    h += '<div class="row-between" style="margin-bottom:12px;"><div class="range-row">' + pill('Campaigns', 'at-level', 'campaign', S.level === 'campaign') + pill('Ad Sets', 'at-level', 'adset', S.level === 'adset') + pill('Ads', 'at-level', 'ad', S.level === 'ad') + '</div>' +
      '<span class="small muted">' + esc(d.model) + ' click \u00b7 ' + esc(d.organic) + ' sources \u00b7 click a row to drill down</span></div>';
    var paid = d.rows.filter(function (r) { return r.type === 'paid_meta'; }), other = d.rows.filter(function (r) { return r.type !== 'paid_meta'; });
    h += card(adsTable(paid, d.thresholds, { first: S.level === 'campaign' ? 'Campaign' : S.level === 'adset' ? 'Ad set' : 'Ad' }), 'padding:8px 6px;margin-bottom:16px;');
    if (other.length) { h += '<h2 class="h-sec" style="margin:8px 0 10px;">Everything else</h2>' + card(adsTable(other, d.thresholds, { first: 'Source' }), 'padding:8px 6px;'); }
    return h;
  }

  /* ── Take rates ────────────────────────────────────────── */
  function renderTake() {
    var d = cached('take'), e = errOf('take');
    if (!d && !e) { load('take', '/take-rates?level=adset&' + rangeQS() + modelQS()).then(render).catch(function () { render(); }); return header() + rangeBar(false) + loadingCard(); }
    if (e) return header() + rangeBar(false) + errCard(e);
    var h = header() + rangeBar(false);
    h += '<p class="small muted" style="margin-bottom:12px;">Share of buyers from each ad set who also took the bump, upsells or downsell. Roles come from Settings \u2192 Products.</p>';
    var t = '<div class="at-scroll"><table class="at-table"><thead><tr><th>Ad set</th><th class="r">Buyers</th><th class="r">Bump</th><th class="r">Upsell 1</th><th class="r">Upsell 2</th><th class="r">Upsell 3</th><th class="r">Downsell</th><th class="r">Upsell $/buyer</th><th class="r">Revenue</th></tr></thead><tbody>';
    for (var i = 0; i < d.rows.length; i++) {
      var r = d.rows[i];
      t += '<tr' + (r.zero_upsell ? ' style="background:#FFF7F5;"' : '') + '><td><div style="font-weight:600;">' + esc(r.label) + '</div>' + (r.zero_upsell ? '<div class="small at-flag">Buyers here take zero upsells</div>' : '') + '</td><td class="r">' + r.buyers + '</td><td class="r">' + pct(r.take.bump) + '</td><td class="r">' + pct(r.take.u1) + '</td><td class="r">' + pct(r.take.u2) + '</td><td class="r">' + pct(r.take.u3) + '</td><td class="r">' + pct(r.take.downsell) + '</td><td class="r">' + money(r.take.upsell_rev_per_buyer) + '</td><td class="r">' + money(r.revenue) + '</td></tr>';
    }
    if (!d.rows.length) t += '<tr><td colspan="9" class="empty">No buyers in this window yet.</td></tr>';
    return h + card(t + '</tbody></table></div>', 'padding:8px 6px;');
  }

  /* ── Leads & journeys ──────────────────────────────────── */
  function renderLeads() {
    if (S.person) return renderPerson();
    var name = 'leads-' + S.leadsStatus + '-' + S.leadsQ, d = cached(name), e = errOf(name);
    if (!d && !e) { load(name, '/leads?' + rangeQS() + (S.leadsStatus ? '&status=' + S.leadsStatus : '') + (S.leadsQ ? '&q=' + encodeURIComponent(S.leadsQ) : '')).then(render).catch(function () { render(); }); return header() + rangeBar(false) + loadingCard(); }
    if (e) return header() + rangeBar(false) + errCard(e);
    var h = header() + rangeBar(false);
    h += '<div class="row-between" style="margin-bottom:12px;"><div class="range-row">' + pill('All', 'at-lstatus', '', S.leadsStatus === '') + pill('Leads', 'at-lstatus', 'lead', S.leadsStatus === 'lead') + pill('Abandoned', 'at-lstatus', 'abandoned', S.leadsStatus === 'abandoned') + pill('Buyers', 'at-lstatus', 'buyer', S.leadsStatus === 'buyer') + '</div>' +
      '<div class="range-row"><input class="at-in" id="at-lq" placeholder="Search email or name" value="' + esc(S.leadsQ) + '" style="width:220px;"><button class="pill sm" data-act="at-lsearch">Search</button><a class="linklab" href="' + BASE + '/api/abandoned?brand=' + S.brand + '&days=7&format=csv" data-act="at-csv">Export abandoned CSV</a></div></div>';
    var t = '<div class="at-scroll"><table class="at-table"><thead><tr><th>Person</th><th>Status</th><th>First source</th><th>Last source</th><th class="r">Spent</th><th class="r">Last seen</th></tr></thead><tbody>';
    for (var i = 0; i < d.rows.length; i++) {
      var r = d.rows[i], sc = r.status === 'buyer' ? C_GOOD : r.status === 'abandoned' ? C_WARN : C_DUSTY;
      t += '<tr class="click" data-act="at-person" data-v="' + esc(r.id) + '"><td><div style="font-weight:600;">' + esc(r.email || r.phone || 'Unknown') + '</div><div class="small muted">' + esc(((r.first_name || '') + ' ' + (r.last_name || '')).trim()) + '</div></td>' +
        '<td><span class="at-tag" style="color:' + sc + ';border-color:' + sc + ';">' + esc(r.status) + '</span></td><td>' + esc(r.first_adset || r.first_source || '–') + '</td><td>' + esc(r.last_adset || r.last_source || '–') + '</td><td class="r">' + money(r.total_spent) + '</td><td class="r small muted">' + esc(when(r.last_seen)) + '</td></tr>';
    }
    if (!d.rows.length) t += '<tr><td colspan="6" class="empty">No people match.</td></tr>';
    return h + card(t + '</tbody></table></div>', 'padding:8px 6px;');
  }
  function renderPerson() {
    var name = 'person-' + S.person, d = cached(name), e = errOf(name);
    var back = '<button class="linklab" data-act="at-person-back" style="margin-bottom:14px;">Back to people</button>';
    if (!d && !e) { load(name, '/person/' + encodeURIComponent(S.person)).then(render).catch(function () { render(); }); return header() + back + loadingCard(); }
    if (e) return header() + back + errCard(e);
    var p = d.person, h = header() + back;
    h += '<div class="grid g4" style="margin-bottom:16px;">' + statCard('Person', esc(p.email || p.phone || ''), esc(((p.first_name || '') + ' ' + (p.last_name || '')).trim())) + statCard('Status', esc(p.status), 'First seen ' + esc(when(p.first_seen))) + statCard('Total spent', money(p.total_spent), p.order_count + ' orders') + statCard('Devices', String(d.visitors.length), null) + '</div>';
    h += '<div class="card" style="padding:18px 20px;"><div class="lab" style="margin-bottom:12px;">Journey</div><div class="at-tl">';
    for (var i = 0; i < d.timeline.length; i++) {
      var t = d.timeline[i], cls = t.kind === 'purchase' ? 'buy' : t.kind === 'abandoned' ? 'ab' : (t.source_type === 'paid_meta' ? 'ad' : '');
      var line;
      if (t.kind === 'purchase') line = '<b style="color:' + C_GOOD + ';">Purchase</b> ' + money(t.total) + ' via ' + esc(t.source) + (t.items && t.items.length ? ' \u00b7 ' + esc(t.items.map(function (x) { return x.product_name || 'item'; }).join(', ')) : '') + (t.is_new_buyer ? ' \u00b7 new buyer' : '');
      else if (t.kind === 'refund') line = '<b style="color:' + C_BAD + ';">Refunded</b> ' + money(t.refunded) + ' via ' + esc(t.source);
      else if (t.kind === 'abandoned') line = '<b style="color:' + C_WARN + ';">Abandoned checkout</b> on ' + esc(t.host || '');
      else if (t.kind === 'identify') line = 'Email entered on ' + esc(t.host || '');
      else if (t.kind === 'registration') line = '<b>Registered</b> for ' + esc(t.webinar) + (t.showed ? ' \u00b7 showed' : '') + (t.replay ? ' \u00b7 replay' : '');
      else if (t.kind === 'checkout_view') line = 'Opened checkout ' + esc(t.host || '');
      else if (t.kind === 'event') { var mm = {}; try { mm = JSON.parse(t.meta || '{}'); } catch (x2) {} line = 'Event: ' + esc(mm.name || 'custom'); }
      else line = (t.source_type === 'paid_meta' ? '<b style="color:' + C_CORAL + ';">Ad click</b> ' + esc(t.adset_name || t.ad_name || t.ad_id || 'Meta') : esc(t.source_name || 'Visit')) + ' \u2192 ' + esc(t.title || t.url || '');
      h += '<div class="at-tl-i ' + cls + '"><div class="small muted">' + esc(when(t.ts)) + (t.device ? ' \u00b7 ' + esc(t.device) : '') + '</div><div>' + line + '</div></div>';
    }
    if (!d.timeline.length) h += '<div class="small muted">No touches recorded.</div>';
    return h + '</div></div>';
  }

  /* ── Cohorts ───────────────────────────────────────────── */
  function renderCohorts() {
    var name = 'cohorts-' + S.cohortKind, d = cached(name), e = errOf(name);
    var top = header() + '<div class="row-between" style="margin-bottom:14px;"><div class="range-row">' + pill('Webinar cohorts', 'at-cohort', 'webinar', S.cohortKind === 'webinar') + pill('Buyer LTV', 'at-cohort', 'buyers', S.cohortKind === 'buyers') + '</div><button class="pill sm" data-act="at-refresh">Refresh</button></div>';
    if (!d && !e) { load(name, S.cohortKind === 'webinar' ? '/cohorts/webinar?weeks=10' : '/cohorts/buyers?months=6').then(render).catch(function () { render(); }); return top + loadingCard(); }
    if (e) return top + errCard(e);
    var t;
    if (S.cohortKind === 'webinar') {
      t = '<p class="small muted" style="margin-bottom:10px;">Weekly registrant cohorts. The verdict lands once a cohort is 14 days old, so the 7-day funnel has finished. Green = keep or step up 30%. Yellow = hold. Red = cut back. Two reds in a row = pause and diagnose.</p>';
      t += '<div class="at-scroll"><table class="at-table"><thead><tr><th>Week of</th><th class="r">Spend</th><th class="r">Registrants</th><th class="r">Cost/reg</th><th class="r">Show rate</th><th class="r">Replay</th><th class="r">Buyers</th><th class="r">Sales/reg</th><th class="r">Revenue</th><th class="r">ROAS</th><th>Verdict</th></tr></thead><tbody>';
      for (var i = 0; i < d.rows.length; i++) {
        var r = d.rows[i], vc = r.verdict === 'green' ? C_GOOD : r.verdict === 'yellow' ? C_WARN : r.verdict === 'red' ? C_BAD : C_DUSTY;
        t += '<tr><td style="font-weight:600;">' + esc(r.week) + '<div class="small muted">' + r.age_days + ' days old</div></td><td class="r">' + money(r.spend) + '</td><td class="r">' + r.registrants + '</td><td class="r">' + money(r.cost_per_registrant) + '</td><td class="r">' + pct(r.show_rate) + '</td><td class="r">' + r.replay + '</td><td class="r">' + r.buyers + '</td><td class="r">' + pct(r.sales_per_registrant) + '</td><td class="r">' + money(r.revenue) + '</td><td class="r" style="font-weight:600;color:' + vc + ';">' + x(r.roas) + '</td><td>' + dot(vc) + esc(r.verdict.replace('_', ' ')) + '</td></tr>';
      }
      if (!d.rows.length) t += '<tr><td colspan="11" class="empty">No webinar registrations yet. Send them in from Kit through the generic webhook (kind: registration) and they show up here.</td></tr>';
    } else {
      t = '<p class="small muted" style="margin-bottom:10px;">Lifetime value by the ad set that brought each buyer in (first click). Day 0 is the first order alone.</p>';
      t += '<div class="at-scroll"><table class="at-table"><thead><tr><th>First-click ad set</th><th class="r">Buyers</th><th class="r">Day 0</th><th class="r">30-day</th><th class="r">60-day</th><th class="r">90-day</th></tr></thead><tbody>';
      for (var j = 0; j < d.rows.length; j++) { var b = d.rows[j]; t += '<tr><td style="font-weight:600;">' + esc(b.label) + '</td><td class="r">' + b.buyers + '</td><td class="r">' + money(b.ltv0) + '</td><td class="r">' + money(b.ltv30) + '</td><td class="r">' + money(b.ltv60) + '</td><td class="r">' + money(b.ltv90) + '</td></tr>'; }
      if (!d.rows.length) t += '<tr><td colspan="6" class="empty">No buyers yet.</td></tr>';
    }
    return top + card(t + '</tbody></table></div>', 'padding:8px 6px;');
  }

  /* ── Organic ───────────────────────────────────────────── */
  function renderOrganic() {
    var d = cached('organic'), e = errOf('organic');
    if (!d && !e) { load('organic', '/organic?' + rangeQS()).then(render).catch(function () { render(); }); return header() + rangeBar(false) + loadingCard(); }
    if (e) return header() + rangeBar(false) + errCard(e);
    var t = '<div class="at-scroll"><table class="at-table"><thead><tr><th>Source</th><th>Type</th><th class="r">Visits</th><th class="r">Visitors</th><th class="r">Leads</th><th class="r">Buyers</th><th class="r">Revenue</th></tr></thead><tbody>';
    for (var i = 0; i < d.rows.length; i++) { var r = d.rows[i]; t += '<tr><td style="font-weight:600;">' + esc(r.source_name) + '</td><td class="muted">' + esc(r.source_type) + '</td><td class="r">' + n0(r.visits) + '</td><td class="r">' + n0(r.visitors) + '</td><td class="r">' + n0(r.leads) + '</td><td class="r">' + n0(r.buyers) + '</td><td class="r">' + money(r.revenue) + '</td></tr>'; }
    if (!d.rows.length) t += '<tr><td colspan="7" class="empty">No traffic tracked yet. Install the script and this fills in.</td></tr>';
    return header() + rangeBar(false) + card(t + '</tbody></table></div>', 'padding:8px 6px;');
  }

  /* ── Alerts ────────────────────────────────────────────── */
  function renderAlerts() {
    var d = cached('alerts'), e = errOf('alerts');
    if (!d && !e) { load('alerts', '/alerts').then(render).catch(function () { render(); }); return header() + loadingCard(); }
    if (e) return header() + errCard(e);
    var h = header() + '<div class="row-between" style="margin-bottom:12px;"><h2 class="h-sec">Open alerts</h2><button class="pill sm" data-act="at-refresh">Refresh</button></div>';
    if (!d.rows.length) return h + '<div class="card" style="padding:40px 24px;text-align:center;"><div class="h-card">All clear</div><p style="margin-top:6px;">Missing URL parameters, unmapped products, tracking drops and circuit-breaker trips show up here and in the Claude Inbox.</p></div>';
    h += '<div class="card list">';
    for (var i = 0; i < d.rows.length; i++) { var a = d.rows[i]; h += '<div class="row"><div class="row-in" style="cursor:default;border-left-color:' + (a.level === 'money' ? C_BAD : C_WARN) + ';"><div style="flex:1;min-width:0;"><div class="row-name" style="white-space:normal;">' + esc(a.title) + '</div><div class="small" style="margin-top:4px;white-space:pre-wrap;">' + esc(a.message || '') + '</div><div class="small muted" style="margin-top:6px;">' + esc(a.kind) + ' \u00b7 ' + esc(when(a.created_at)) + '</div></div><button class="pill sm" data-act="at-alert-done" data-v="' + a.id + '">Resolve</button></div></div>'; }
    return h + '</div>';
  }

  /* ── Hyros comparison (parallel run) ───────────────────── */
  function hyrosParsed() { var k = S.days === 30 ? window.hyros30 : window.hyros7; return (k && k.map) ? k : null; }
  function renderHyros() {
    var d = cached('hyros'), e = errOf('hyros');
    if (!d && !e) { load('hyros', '/hyros-compare?' + rangeQS()).then(render).catch(function () { render(); }); return header() + rangeBar(false) + loadingCard(); }
    if (e) return header() + rangeBar(false) + errCard(e);
    var hy = hyrosParsed(), h = header() + rangeBar(false);
    h += '<p class="small muted" style="margin-bottom:12px;">Our numbers per ad set next to the Hyros report already loaded on the Ads tab (7-day or 30-day window only, matched by the (ID: nnn) token in the ad set name). Cutover rule: purchases per ad set within about 10% for 30+ days.</p>';
    if (!hy) h += '<div class="alert" style="border-color:' + C_WARN + ';">Pick the 7-Day or 30-Day window to line up against the Hyros sheets, and make sure the Ads tab has loaded once.</div>';
    var t = '<div class="at-scroll"><table class="at-table"><thead><tr><th>Ad set</th><th class="r">Spend</th><th class="r">Our buyers</th><th class="r">Hyros sales</th><th class="r">Gap</th><th class="r">Our revenue</th><th class="r">Hyros revenue</th><th class="r">Gap</th></tr></thead><tbody>';
    var totO = 0, totH = 0, totOR = 0, totHR = 0, matched = 0;
    for (var i = 0; i < d.rows.length; i++) {
      var r = d.rows[i], hr = null;
      if (hy) { hr = hy.map['id:' + String(parseInt(r.adset_id, 10))] || hy.map['name:' + String(r.name || '').toLowerCase()] || null; var tok = idToken(r.name); if (!hr && tok) hr = hy.map['id:' + tok] || null; }
      if (hr) { matched++; totH += hr.sales || 0; totHR += hr.rev || 0; }
      totO += r.buyers; totOR += r.revenue;
      var gS = hr && hr.sales ? (r.buyers - hr.sales) / hr.sales : null, gR = hr && hr.rev ? (r.revenue - hr.rev) / hr.rev : null;
      t += '<tr><td style="font-weight:600;">' + esc(r.name) + '<div class="small muted">' + esc(r.adset_id) + '</div></td><td class="r">' + money(r.spend) + '</td><td class="r">' + r.buyers + '</td><td class="r">' + (hr ? n0(hr.sales) : '–') + '</td><td class="r" style="color:' + (gS === null ? C_TEXT : Math.abs(gS) <= 0.1 ? C_GOOD : C_WARN) + ';">' + (gS === null ? '–' : (gS > 0 ? '+' : '') + Math.round(gS * 100) + '%') + '</td><td class="r">' + money(r.revenue) + '</td><td class="r">' + (hr ? money(hr.rev) : '–') + '</td><td class="r" style="color:' + (gR === null ? C_TEXT : Math.abs(gR) <= 0.1 ? C_GOOD : C_WARN) + ';">' + (gR === null ? '–' : (gR > 0 ? '+' : '') + Math.round(gR * 100) + '%') + '</td></tr>';
    }
    if (!d.rows.length) t += '<tr><td colspan="8" class="empty">No paid ad sets with tracked sales in this window yet.</td></tr>';
    t += '</tbody></table></div>';
    h += '<div class="grid g4" style="margin-bottom:12px;">' + statCard('Ad sets matched', matched + ' of ' + d.rows.length, null) + statCard('Our buyers', String(totO), 'Hyros ' + n0(totH)) + statCard('Our revenue', money(totOR), 'Hyros ' + money(totHR)) + statCard('Overall gap', totH ? ((totO - totH) / totH > 0 ? '+' : '') + Math.round((totO - totH) / totH * 100) + '%' : '–', 'buyers vs Hyros sales', totH && Math.abs((totO - totH) / totH) <= 0.1 ? C_GOOD : null) + '</div>';
    return h + card(t, 'padding:8px 6px;');
  }

  /* ── Settings ──────────────────────────────────────────── */
  var SUBS = [['general', 'General'], ['utm', 'UTM Checker'], ['rules', 'Source Rules'], ['products', 'Products'], ['audiences', 'Audiences'], ['health', 'Tracking Health'], ['webhooks', 'Webhooks'], ['users', 'Users'], ['log', 'Change Log']];
  function isOwner() { return S.me && S.me.role === 'owner'; }
  function isEditor() { return S.me && (S.me.role === 'owner' || S.me.role === 'editor'); }
  function subNav() { var h = '<div class="at-sub">'; for (var i = 0; i < SUBS.length; i++) { if (SUBS[i][0] === 'users' && !isOwner()) continue; h += pill(SUBS[i][1], 'at-sub', SUBS[i][0], S.sub === SUBS[i][0]); } return h + '</div>'; }
  function renderSettings() {
    var d = cached('settings'), e = errOf('settings');
    if (!d && !e) { load('settings', '/settings').then(render).catch(function () { render(); }); return header() + subNav() + loadingCard(); }
    if (e) return header() + subNav() + errCard(e);
    var fn = { general: subGeneral, utm: subUtm, rules: subRules, products: subProducts, audiences: subAudiences, health: subHealth, webhooks: subWebhooks, users: subUsers, log: subLog }[S.sub] || subGeneral;
    return header() + subNav() + fn(d);
  }
  function field(label, id, val, hint, type) { return '<div><label>' + label + '</label><input class="at-in" id="' + id + '" type="' + (type || 'text') + '" value="' + esc(val === null || val === undefined ? '' : val) + '"' + (isEditor() ? '' : ' disabled') + '>' + (hint ? '<div class="small muted" style="margin-top:3px;">' + hint + '</div>' : '') + '</div>'; }
  function subGeneral(d) {
    var s = d.settings, own = isOwner();
    var h = '<div class="grid" style="grid-template-columns:1fr 1fr;gap:14px;">';
    h += card('<div class="lab" style="margin-bottom:10px;">Meta</div><div class="at-form">' + field('Ad account ID', 'at-s-ad_account_id', s.ad_account_id, 'Numbers only, no act_ prefix') + field('Pixel / Dataset ID', 'at-s-pixel_id', s.pixel_id, 'Required before purchase sending goes live') +
      '<div><label>Purchase sending to Meta</label><select class="at-in" id="at-s-capi_mode"' + (own ? '' : ' disabled') + '><option value="shadow"' + (s.capi_mode === 'shadow' ? ' selected' : '') + '>Shadow (build and log, send nothing)</option><option value="live"' + (s.capi_mode === 'live' ? ' selected' : '') + '>Live</option></select><div class="small muted" style="margin-top:3px;">Owner only. Turn Hyros purchase sending off the same day this goes live.</div></div></div>');
    h += card('<div class="lab" style="margin-bottom:10px;">Thresholds</div><div class="at-form">' + field('Break-even ROAS', 'at-s-breakeven_roas', s.breakeven_roas, null, 'number') + field('Target ROAS', 'at-s-target_roas', s.target_roas, null, 'number') + field('Circuit breaker: cut 30% below', 'at-s-breaker_cut', s.breaker_cut, 'Trailing ROAS', 'number') + field('Circuit breaker: winners-only below', 'at-s-breaker_winners', s.breaker_winners, 'For this many days in a row', 'number') + field('Breaker days', 'at-s-breaker_days', s.breaker_days, null, 'number') + '</div>');
    h += card('<div class="lab" style="margin-bottom:10px;">Attribution (owner only)</div><div class="at-form">' +
      '<div><label>Default model</label><select class="at-in" id="at-s-default_model"' + (own ? '' : ' disabled') + '>' + ['last', 'first', 'scientific', 'linear'].map(function (m) { return '<option value="' + m + '"' + (s.default_model === m ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></div>' +
      '<div><label>Organic handling</label><select class="at-in" id="at-s-default_organic"' + (own ? '' : ' disabled') + '>' + ['all', 'paid', 'organic'].map(function (m) { return '<option value="' + m + '"' + (s.default_organic === m ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></div>' +
      '<div><label>Lead attribution window (days)</label><input class="at-in" id="at-s-lead_window_days" type="number" value="' + s.lead_window_days + '"' + (own ? '' : ' disabled') + '></div>' +
      '<div><label>Scientific: first click counts within (days)</label><input class="at-in" id="at-s-scientific_first_days" type="number" value="' + s.scientific_first_days + '"' + (own ? '' : ' disabled') + '></div>' +
      '<div><label>Group purchases within (minutes)</label><input class="at-in" id="at-s-group_minutes" type="number" value="' + s.group_minutes + '"' + (own ? '' : ' disabled') + '></div></div>');
    h += card('<div class="lab" style="margin-bottom:10px;">Tracking script</div><div class="at-form">' + field('Abandoned after (minutes)', 'at-s-abandon_minutes', s.abandon_minutes, null, 'number') +
      '<div><label>Single-page-app mode</label><select class="at-in" id="at-s-spa_mode"' + (isEditor() ? '' : ' disabled') + '><option value="false"' + (!s.spa_mode ? ' selected' : '') + '>Off</option><option value="true"' + (s.spa_mode ? ' selected' : '') + '>On</option></select></div>' +
      '<div><label>Strip tracking params from the visible URL</label><select class="at-in" id="at-s-strip_params"' + (isEditor() ? '' : ' disabled') + '><option value="false"' + (!s.strip_params ? ' selected' : '') + '>Off</option><option value="true"' + (s.strip_params ? ' selected' : '') + '>On</option></select></div>' +
      '<div><label>Install on every ' + S.brand.toUpperCase() + ' page and checkout</label><div class="at-code">' + esc(d.tracking_snippet) + '</div></div></div>');
    h += '</div>';
    if (isEditor()) h += '<div style="margin-top:14px;"><button class="btn-primary" data-act="at-settings-save">Save settings</button> <span class="small muted" id="at-save-msg" style="margin-left:10px;"></span></div>';
    h += '<div class="card" style="padding:18px 20px;margin-top:14px;"><div class="lab" style="margin-bottom:8px;">Secrets on the Worker</div><div class="small">' + ['meta_token', 'webhook_token', 'notion', 'shopify_scc', 'shopify_rrp', 'mcp'].map(function (k) { return dot(d.secrets[k] ? C_GOOD : C_BAD) + k.toUpperCase().replace('NOTION', 'NOTION_TOKEN').replace('META_TOKEN', 'META_ACCESS_TOKEN').replace('MCP', 'MCP_TOKEN'); }).join(' &nbsp; ') + '</div><p class="small muted" style="margin-top:8px;">Secrets are pasted in Cloudflare (hq-attribution \u2192 Settings \u2192 Variables and Secrets), never here.</p></div>';
    return h;
  }
  function subUtm(d) {
    var h = card('<div class="lab" style="margin-bottom:8px;">Required parameter string (paste into every ad\u2019s URL parameters field, both brands)</div><div class="at-code" id="at-req">' + esc(d.required_string) + '</div><button class="pill sm" data-act="at-copy" data-v="at-req" style="margin-top:10px;">Copy</button><p class="small muted" style="margin-top:10px;">Meta fills every {{...}} value when the ad serves. Nobody types names or IDs, so nothing can be misspelled. The engine attributes on <b>h_ad_id</b> and <b>fbc_id</b>; the utm names are labels only.</p>', 'margin-bottom:14px;');
    h += card('<div class="lab" style="margin-bottom:8px;">Check an ad URL before it goes live</div><input class="at-in" id="at-url" placeholder="https://thesimplecreator.com/made-to-sell-ad?utm_source=..."><button class="pill sm" data-act="at-check" style="margin-top:10px;">Check</button><div id="at-check-out" style="margin-top:12px;"></div>');
    return h;
  }
  function checkOut(r) {
    var h = '<div class="callout" style="border-left-color:' + (r.passes ? C_GOOD : C_BAD) + ';">';
    if (r.error) return h + '<span class="at-flag">' + esc(r.error) + '</span></div>';
    h += '<div class="' + (r.passes ? 'at-ok' : 'at-flag') + '">' + (r.passes ? 'Passes. Will be tagged as: ' + esc(r.will_tag_as) : 'Not ready. Will be tagged as: ' + esc(r.will_tag_as)) + '</div>';
    if (r.missing.length) h += '<div class="small" style="margin-top:6px;">Missing: <b>' + esc(r.missing.join(', ')) + '</b></div>';
    if (r.unfilled_placeholders.length) h += '<div class="small" style="margin-top:6px;">Unfilled placeholder text in: <b>' + esc(r.unfilled_placeholders.join(', ')) + '</b></div>';
    h += '<div class="small muted" style="margin-top:6px;">' + esc(r.note) + '</div>';
    if (!r.passes && r.suggested_url) h += '<div class="small" style="margin-top:8px;">Corrected URL:</div><div class="at-code" id="at-fixed">' + esc(r.suggested_url) + '</div><button class="pill sm" data-act="at-copy" data-v="at-fixed" style="margin-top:8px;">Copy corrected URL</button>';
    return h + '</div>';
  }
  function subRules(d) {
    var r = cached('rules'), e = errOf('rules');
    if (!r && !e) { load('rules', '/source-rules').then(render).catch(function () { render(); }); return loadingCard(); }
    if (e) return errCard(e);
    var h = '<p class="small muted" style="margin-bottom:12px;">Rules decide how non-ad traffic is labeled when there are no UTMs. Ad IDs and UTMs always win over rules. Editors can add and disable rules; only the owner can delete.</p>';
    var t = '<div class="at-scroll"><table class="at-table"><thead><tr><th>Rule</th><th>If</th><th>Tag as</th><th>Type</th><th class="r">Priority</th><th></th></tr></thead><tbody>';
    for (var i = 0; i < r.rows.length; i++) { var x1 = r.rows[i]; t += '<tr' + (x1.enabled ? '' : ' style="opacity:.5;"') + '><td style="font-weight:600;">' + esc(x1.name) + '</td><td>' + esc(x1.field + ' ' + x1.op + ' \u201c' + x1.value + '\u201d') + '</td><td>' + esc(x1.source_name) + '</td><td class="muted">' + esc(x1.source_type) + '</td><td class="r">' + x1.priority + '</td><td class="r">' + (isEditor() ? '<button class="pill sm" data-act="at-rule-toggle" data-v="' + x1.id + '" data-e="' + (x1.enabled ? 0 : 1) + '">' + (x1.enabled ? 'Disable' : 'Enable') + '</button>' : '') + (isOwner() ? ' <button class="linklab" data-act="at-rule-del" data-v="' + x1.id + '">Delete</button>' : '') + '</td></tr>'; }
    for (var j = 0; j < r.builtin.length; j++) { var b = r.builtin[j]; t += '<tr style="color:var(--dusty);"><td>Built-in</td><td>' + esc(b.field + ' contains \u201c' + b.value + '\u201d') + '</td><td>' + esc(b.source_name) + '</td><td>' + esc(b.source_type) + '</td><td class="r">fallback</td><td></td></tr>'; }
    h += card(t + '</tbody></table></div>', 'padding:8px 6px;margin-bottom:14px;');
    if (isEditor()) h += card('<div class="lab" style="margin-bottom:10px;">Add a rule</div><div class="grid" style="grid-template-columns:repeat(3,1fr);gap:10px;"><div><label class="lab">Name</label><input class="at-in" id="at-r-name" placeholder="Pinterest pins"></div><div><label class="lab">Field</label><select class="at-in" id="at-r-field" style="width:100%;"><option value="referrer">referrer</option><option value="url">url</option><option value="host">host</option><option value="path">path</option></select></div><div><label class="lab">Match</label><select class="at-in" id="at-r-op" style="width:100%;"><option value="contains">contains</option><option value="equals">equals</option><option value="starts">starts with</option><option value="regex">regex</option></select></div><div><label class="lab">Value</label><input class="at-in" id="at-r-value" placeholder="pinterest.com"></div><div><label class="lab">Tag as</label><input class="at-in" id="at-r-sname" placeholder="Pinterest Organic"></div><div><label class="lab">Type</label><select class="at-in" id="at-r-stype" style="width:100%;"><option value="organic">organic</option><option value="email">email</option><option value="manychat">manychat</option><option value="paid_other">paid (not Meta)</option><option value="referral">referral</option></select></div></div>' +
      '<div class="range-row" style="margin-top:12px;"><input class="at-in" id="at-r-test" placeholder="Test URL (optional)" style="flex:1;"><input class="at-in" id="at-r-ref" placeholder="Referrer (optional)" style="flex:1;"><button class="pill sm" data-act="at-rule-test">Test</button><button class="pill sm on" data-act="at-rule-add">Add rule</button></div><div id="at-rule-out" class="small" style="margin-top:8px;"></div>');
    return h;
  }
  function subProducts(d) {
    var r = cached('products'), e = errOf('products');
    if (!r && !e) { load('products', '/products').then(render).catch(function () { render(); }); return loadingCard(); }
    if (e) return errCard(e);
    var h = '<p class="small muted" style="margin-bottom:12px;">Every product the engine has seen. Unmapped ones (no role) are first and red. Give each a clean name and a role so take rates and product reports are right. Changes apply to past sales too.</p>';
    var t = '<div class="at-scroll"><table class="at-table"><thead><tr><th>Source / ID</th><th>Name</th><th>Role</th><th>Funnel</th><th class="r">Sales</th><th class="r">Revenue</th><th></th></tr></thead><tbody>';
    for (var i = 0; i < r.rows.length; i++) {
      var p = r.rows[i], un = !p.role;
      t += '<tr' + (un ? ' style="background:#FFF7F5;"' : '') + '><td><div class="small muted">' + esc(p.source) + '</div><div class="small">' + esc(p.external_id) + '</div>' + (p.raw_name && p.raw_name !== p.name ? '<div class="small muted">' + esc(p.raw_name) + '</div>' : '') + '</td>' +
        '<td><input class="at-in" id="at-pn-' + p.id + '" value="' + esc(p.name || p.raw_name || '') + '"' + (isEditor() ? '' : ' disabled') + '></td>' +
        '<td><select class="at-in" id="at-pr-' + p.id + '"' + (isEditor() ? '' : ' disabled') + '><option value="">' + (un ? 'unmapped' : '') + '</option>' + r.roles.map(function (ro) { return '<option value="' + ro + '"' + (p.role === ro ? ' selected' : '') + '>' + ro + '</option>'; }).join('') + '</select></td>' +
        '<td><input class="at-in" id="at-pf-' + p.id + '" value="' + esc(p.funnel || '') + '" style="width:90px;"' + (isEditor() ? '' : ' disabled') + '></td><td class="r">' + n0(p.sales_count) + '</td><td class="r">' + money(p.revenue) + '</td><td class="r">' + (isEditor() ? '<button class="pill sm" data-act="at-prod-save" data-v="' + p.id + '">Save</button>' : '') + '</td></tr>';
    }
    if (!r.rows.length) t += '<tr><td colspan="7" class="empty">No sales yet. Products appear here the moment a webhook delivers one.</td></tr>';
    return h + card(t + '</tbody></table></div>', 'padding:8px 6px;');
  }
  function subAudiences(d) {
    var r = cached('audiences'), e = errOf('audiences');
    if (!r && !e) { load('audiences', '/audiences').then(render).catch(function () { render(); }); return loadingCard(); }
    if (e) return errCard(e);
    var h = '<p class="small muted" style="margin-bottom:12px;">People are added within minutes of the event (Hyros synced daily). Sync to Meta only runs when purchase sending is live. Until then members queue up here.</p>';
    var t = '<div class="at-scroll"><table class="at-table"><thead><tr><th>Audience</th><th>Rules</th><th>Meta ID</th><th class="r">Members</th><th class="r">Synced</th><th>Last sync</th><th></th></tr></thead><tbody>';
    for (var i = 0; i < r.rows.length; i++) { var a = r.rows[i]; t += '<tr' + (a.enabled ? '' : ' style="opacity:.5;"') + '><td style="font-weight:600;">' + esc(a.name) + (a.value_based ? ' <span class="at-tag">value-based</span>' : '') + (a.last_error ? '<div class="small at-flag">' + esc(a.last_error) + '</div>' : '') + '</td><td class="small">' + esc((a.definition.rules || []).map(function (x1) { return x1.kind + (x1.product ? ' ' + x1.product : '') + (x1.days ? ' ' + x1.days + 'd' : '') + (x1.source ? ' ' + x1.source : '') + (x1.url ? ' ' + x1.url : ''); }).join(' + ')) + '</td><td class="small">' + esc(a.meta_audience_id || '–') + '</td><td class="r">' + n0(a.members) + '</td><td class="r">' + n0(a.synced_count) + '</td><td class="small muted">' + esc(when(a.last_sync_at)) + '</td><td class="r">' + (isEditor() ? '<button class="pill sm" data-act="at-aud-toggle" data-v="' + a.id + '" data-e="' + (a.enabled ? 0 : 1) + '">' + (a.enabled ? 'Pause' : 'Resume') + '</button>' : '') + '</td></tr>'; }
    if (!r.rows.length) t += '<tr><td colspan="7" class="empty">No audiences yet. The three Hyros replacements are one click below.</td></tr>';
    h += card(t + '</tbody></table></div>', 'padding:8px 6px;margin-bottom:14px;');
    if (isEditor()) {
      h += card('<div class="lab" style="margin-bottom:10px;">Quick create (Hyros replacements)</div><div class="range-row">' +
        '<button class="pill sm" data-act="at-aud-quick" data-v="all_purchase">All Purchase</button><button class="pill sm" data-act="at-aud-quick" data-v="abandoned7">Abandoned checkout, 7 days</button><button class="pill sm" data-act="at-aud-quick" data-v="value_buyers">Value-based buyers (lookalike seed)</button></div>' +
        '<div class="lab" style="margin:16px 0 10px;">Custom</div><div class="grid" style="grid-template-columns:repeat(4,1fr);gap:10px;"><div><label class="lab">Name</label><input class="at-in" id="at-a-name" placeholder="Bought MTS not IPSS"></div><div><label class="lab">Rule</label><select class="at-in" id="at-a-kind" style="width:100%;"><option value="bought">bought</option><option value="not_bought">not bought</option><option value="abandoned">abandoned (days)</option><option value="lead_source">lead source</option><option value="visited">visited URL part</option><option value="any_buyer">any buyer</option></select></div><div><label class="lab">Product / source / URL</label><input class="at-in" id="at-a-val" placeholder="Made to Sell"></div><div><label class="lab">Days (optional)</label><input class="at-in" id="at-a-days" type="number"></div></div>' +
        '<div class="range-row" style="margin-top:12px;"><label class="small"><input type="checkbox" id="at-a-meta"> Create in Meta now (needs META_ACCESS_TOKEN)</label><label class="small"><input type="checkbox" id="at-a-value"> Value-based</label><button class="pill sm on" data-act="at-aud-add">Create audience</button><button class="pill sm" data-act="at-aud-backfill">Backfill members from history</button></div><div id="at-aud-out" class="small" style="margin-top:8px;"></div>');
    }
    return h;
  }
  function subHealth(d) {
    var r = cached('health'), e = errOf('health');
    if (!r && !e) { load('health', '/tracking-health').then(render).catch(function () { render(); }); return loadingCard(); }
    if (e) return errCard(e);
    var h = '<div class="grid" style="grid-template-columns:1fr 1fr;gap:14px;">';
    var t = '<div class="lab" style="margin-bottom:8px;">Sites</div><table class="at-table"><thead><tr><th>Host</th><th>Last event</th><th class="r">Events today</th><th class="r">Emails today</th></tr></thead><tbody>';
    for (var i = 0; i < r.sites.length; i++) { var s = r.sites[i], stale = (Date.now() - new Date(s.last_event_at)) > 6 * 3600000; t += '<tr><td style="font-weight:600;">' + dot(stale ? C_BAD : C_GOOD) + esc(s.host) + '</td><td class="small">' + esc(when(s.last_event_at)) + '</td><td class="r">' + n0(s.events_today) + '</td><td class="r">' + n0(s.emails_today) + '</td></tr>'; }
    if (!r.sites.length) t += '<tr><td colspan="4" class="empty">No events yet. Install the script from Settings \u2192 General.</td></tr>';
    h += card(t + '</tbody></table>', 'padding:14px 12px;');
    var w = '<div class="lab" style="margin-bottom:8px;">Webhooks, last 7 days</div><table class="at-table"><thead><tr><th>Source</th><th>Status</th><th class="r">Count</th><th>Last</th></tr></thead><tbody>';
    for (var j = 0; j < r.webhooks.length; j++) { var x1 = r.webhooks[j]; w += '<tr><td style="font-weight:600;">' + esc(x1.source) + '</td><td class="' + (x1.status === 'ok' || x1.status === 'duplicate' ? 'at-ok' : 'at-warn') + '">' + esc(x1.status) + '</td><td class="r">' + n0(x1.n) + '</td><td class="small">' + esc(when(x1.last)) + '</td></tr>'; }
    if (!r.webhooks.length) w += '<tr><td colspan="4" class="empty">No webhooks received yet.</td></tr>';
    w += '</tbody></table><div class="lab" style="margin:14px 0 8px;">Meta purchase events</div><div class="small">' + (r.capi.length ? r.capi.map(function (c) { return esc(c.status) + ': ' + n0(c.n); }).join(' \u00b7 ') : 'none yet') + '</div>';
    h += card(w, 'padding:14px 12px;') + '</div>';
    var dd = '<div class="lab" style="margin-bottom:8px;">Daily volume</div><div class="at-scroll"><table class="at-table"><thead><tr><th>Date</th><th class="r">Page views</th><th class="r">Emails captured</th><th class="r">Orders</th></tr></thead><tbody>';
    for (var k = 0; k < Math.min(r.stats.length, 14); k++) { var st1 = r.stats[k]; dd += '<tr><td>' + esc(st1.date) + '</td><td class="r">' + n0(st1.pageviews) + '</td><td class="r">' + n0(st1.identifies) + '</td><td class="r">' + n0(st1.orders) + '</td></tr>'; }
    if (!r.stats.length) dd += '<tr><td colspan="4" class="empty">Nothing yet.</td></tr>';
    return h + card(dd + '</tbody></table></div>', 'padding:14px 12px;margin-top:14px;');
  }
  function subWebhooks(d) {
    var r = cached('whlog'), e = errOf('whlog');
    var h = card('<div class="lab" style="margin-bottom:8px;">Endpoints for ' + S.brand.toUpperCase() + '</div><div class="small" style="line-height:2;">' +
      '<b>SamCart</b> (all order events) <div class="at-code">' + esc(d.webhooks.samcart) + '</div>' +
      '<b>Kajabi</b> (purchase, recurring payment, refund, cancellation) <div class="at-code">' + esc(d.webhooks.kajabi) + '</div>' +
      '<b>Shopify</b> (orders/create, refunds/create; signed with the store secret) <div class="at-code">' + esc(d.webhooks.shopify) + '</div>' +
      '<b>Generic / n8n</b> (normalized order, refund, prospect, registration, cancellation) <div class="at-code">' + esc(d.webhooks.generic) + '</div>' +
      '</div><p class="small muted" style="margin-top:8px;">Replace WEBHOOK_TOKEN with the real token from Cloudflare. The engine ignores duplicates, so retries are safe.</p>', 'margin-bottom:14px;');
    if (!r && !e) { load('whlog', '/webhook-log').then(render).catch(function () { render(); }); return h + loadingCard(); }
    if (e) return h + errCard(e);
    var t = '<div class="lab" style="margin-bottom:8px;">Recent deliveries</div><div class="at-scroll"><table class="at-table"><thead><tr><th>When</th><th>Source</th><th>Event</th><th>ID</th><th>Status</th><th>Note</th></tr></thead><tbody>';
    for (var i = 0; i < r.rows.length; i++) { var x1 = r.rows[i]; t += '<tr><td class="small">' + esc(when(x1.received_at)) + '</td><td>' + esc(x1.source) + '</td><td class="small">' + esc(x1.event || '') + '</td><td class="small">' + esc(x1.external_id || '') + '</td><td class="' + (x1.status === 'ok' || x1.status === 'duplicate' ? 'at-ok' : 'at-warn') + '">' + esc(x1.status) + '</td><td class="small">' + esc(x1.note || '') + (x1.raw ? ' <details><summary class="linklab" style="cursor:pointer;">raw</summary><div class="at-code">' + esc(x1.raw) + '</div></details>' : '') + '</td></tr>'; }
    if (!r.rows.length) t += '<tr><td colspan="6" class="empty">No deliveries yet.</td></tr>';
    return h + card(t + '</tbody></table></div>', 'padding:14px 12px;');
  }
  function subUsers(d) {
    var r = cached('users'), e = errOf('users');
    if (!r && !e) { load('users', '/users').then(render).catch(function () { render(); }); return loadingCard(); }
    if (e) return errCard(e);
    var t = '<table class="at-table"><thead><tr><th>Name</th><th>Role</th><th>Brands</th><th>Key</th><th>Last used</th><th></th></tr></thead><tbody>';
    for (var i = 0; i < r.rows.length; i++) { var u = r.rows[i]; t += '<tr' + (u.active ? '' : ' style="opacity:.5;"') + '><td style="font-weight:600;">' + esc(u.name) + (u.email ? '<div class="small muted">' + esc(u.email) + '</div>' : '') + '</td><td>' + esc(u.role) + '</td><td>' + esc(u.brands) + '</td><td class="small">' + esc(u.key_hint || '') + '</td><td class="small muted">' + esc(when(u.last_used_at)) + '</td><td class="r">' + (u.active && S.me && u.id !== S.me.id ? '<button class="linklab" data-act="at-user-off" data-v="' + u.id + '">Deactivate</button>' : '') + '</td></tr>'; }
    var h = card(t + '</tbody></table>', 'padding:8px 6px;margin-bottom:14px;');
    h += card('<div class="lab" style="margin-bottom:10px;">Create a key</div><div class="grid" style="grid-template-columns:repeat(4,1fr);gap:10px;"><div><label class="lab">Name</label><input class="at-in" id="at-u-name" placeholder="Alexis"></div><div><label class="lab">Email</label><input class="at-in" id="at-u-email"></div><div><label class="lab">Role</label><select class="at-in" id="at-u-role" style="width:100%;"><option value="editor">Editor (Alexis)</option><option value="viewer">Viewer</option><option value="owner">Owner</option></select></div><div><label class="lab">Brands</label><select class="at-in" id="at-u-brands" style="width:100%;"><option value="scc,rrp">SCC + RRP</option><option value="scc">SCC only</option><option value="rrp">RRP only</option></select></div></div><div style="margin-top:12px;"><button class="pill sm on" data-act="at-user-add">Create key</button></div><div id="at-user-out" style="margin-top:10px;"></div><p class="small muted" style="margin-top:8px;">Editors can map products, add rules, create audiences and change thresholds. They cannot change attribution defaults, switch Meta sending on, or delete anything.</p>');
    return h;
  }
  function subLog(d) {
    var r = cached('log'), e = errOf('log');
    if (!r && !e) { load('log', '/change-log').then(render).catch(function () { render(); }); return loadingCard(); }
    if (e) return errCard(e);
    var t = '<div class="at-scroll"><table class="at-table"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Target</th><th>Before</th><th>After</th><th></th></tr></thead><tbody>';
    for (var i = 0; i < r.rows.length; i++) { var c = r.rows[i]; t += '<tr' + (c.undone ? ' style="opacity:.5;"' : '') + '><td class="small">' + esc(when(c.ts)) + '</td><td>' + esc(c.user_name) + '</td><td>' + esc(c.action) + '</td><td class="small">' + esc(c.target) + '</td><td class="small">' + esc((c.before || '').slice(0, 80)) + '</td><td class="small">' + esc((c.after || '').slice(0, 80)) + '</td><td class="r">' + (!c.undone && isEditor() && ['setting', 'product_map', 'rule_update', 'rule_create', 'audience_create', 'audience_toggle'].indexOf(c.action) !== -1 ? '<button class="linklab" data-act="at-undo" data-v="' + c.id + '">Undo</button>' : '') + '</td></tr>'; }
    if (!r.rows.length) t += '<tr><td colspan="7" class="empty">No changes yet.</td></tr>';
    return card(t + '</tbody></table></div>', 'padding:8px 6px;');
  }

  /* ── render ────────────────────────────────────────────── */
  function render() {
    ensureCss();
    var v = view(); if (!v) return;
    if (!getKey()) { v.innerHTML = keyPrompt(); var kI = document.getElementById('at-key'); if (kI) kI.focus(); return; }
    if (!S.me) {
      call('/me').then(function (j) { if (j.__auth || !j.ok) { clearKey(); S.keyErr = 'That key was not accepted. Paste it again.'; } else S.me = j.user; render(); });
      v.innerHTML = header() + loadingCard('Checking your key');
      return;
    }
    var fn = { overview: renderOverview, ads: renderAds, take: renderTake, leads: renderLeads, cohorts: renderCohorts, organic: renderOrganic, alerts: renderAlerts, hyros: renderHyros, settings: renderSettings }[S.view] || renderOverview;
    try { v.innerHTML = fn(); } catch (err) { v.innerHTML = header() + errCard(String(err.message || err)); }
    try { if (typeof broadcastHeight === 'function') setTimeout(broadcastHeight, 120); } catch (e) {}
  }
  function isActive() { return typeof HQ_TAB !== 'undefined' && HQ_TAB === 'attribution'; }
  function rerender() { if (isActive()) render(); }
  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }
  function msg(id, text, bad) { var el = document.getElementById(id); if (el) { el.textContent = text; el.style.color = bad ? C_BAD : C_GOOD; } }
  function post(path, body) { return call(path, { method: 'POST', body: body }); }
  function afterWrite(names) { for (var k in S.data) { if (!S.data.hasOwnProperty(k)) continue; for (var i = 0; i < names.length; i++) if (k.indexOf(names[i] + '|') === 0) delete S.data[k]; } rerender(); }

  /* ── events ────────────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!t) return;
    var act = t.getAttribute('data-act'), v = t.getAttribute('data-v');
    if (!act || act.indexOf('at-') !== 0) return;
    if (act === 'at-csv') { e.preventDefault(); fetch(t.href, { headers: { Authorization: 'Bearer ' + (getKey() || '') } }).then(function (r) { return r.blob(); }).then(function (b) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'abandoned-' + S.brand + '.csv'; a.click(); }); return; }
    if (act === 'at-key-save') { var k = val('at-key').trim(); if (!k) return; setKey(k); S.keyErr = ''; S.me = null; render(); return; }
    if (act === 'at-key-clear') { clearKey(); S.me = null; invalidate(); render(); return; }
    if (act === 'at-brand') { S.brand = v; S.person = null; try { sessionStorage.setItem('hqa-brand', v); } catch (x) {} render(); return; }
    if (act === 'at-view') { S.view = v; S.person = null; try { sessionStorage.setItem('hqa-view', v); } catch (x) {} window.scrollTo(0, 0); render(); return; }
    if (act === 'at-days') { S.days = v === 'custom' ? 'custom' : parseInt(v, 10); render(); return; }
    if (act === 'at-refresh') { invalidate(); render(); return; }
    if (act === 'at-level') { S.level = v; render(); return; }
    if (act === 'at-drill') { if (S.level === 'campaign') S.level = 'adset'; else if (S.level === 'adset') S.level = 'ad'; render(); return; }
    if (act === 'at-lstatus') { S.leadsStatus = v; render(); return; }
    if (act === 'at-lsearch') { S.leadsQ = val('at-lq').trim(); render(); return; }
    if (act === 'at-person') { S.person = v; window.scrollTo(0, 0); render(); return; }
    if (act === 'at-person-back') { S.person = null; render(); return; }
    if (act === 'at-cohort') { S.cohortKind = v; render(); return; }
    if (act === 'at-sub') { S.sub = v; render(); return; }
    if (act === 'at-copy') { var el = document.getElementById(v); if (el && navigator.clipboard) { navigator.clipboard.writeText(el.textContent); t.textContent = 'Copied'; setTimeout(function () { t.textContent = 'Copy'; }, 1500); } return; }
    if (act === 'at-alert-done') { t.disabled = true; post('/alerts', { id: parseInt(v, 10) }).then(function () { afterWrite(['alerts', 'overview']); }); return; }
    if (act === 'at-check') { var u = val('at-url').trim(); if (!u) return; post('/check-url', { url: u }).then(function (j) { var o = document.getElementById('at-check-out'); if (o) o.innerHTML = j.ok ? checkOut(j) : errCard(j.error); }); return; }
    if (act === 'at-settings-save') {
      var ids = ['ad_account_id', 'pixel_id', 'capi_mode', 'breakeven_roas', 'target_roas', 'breaker_cut', 'breaker_winners', 'breaker_days', 'default_model', 'default_organic', 'lead_window_days', 'scientific_first_days', 'group_minutes', 'abandon_minutes', 'spa_mode', 'strip_params'];
      var cur = cached('settings'), set = {};
      for (var i = 0; i < ids.length; i++) { var elx = document.getElementById('at-s-' + ids[i]); if (!elx || elx.disabled) continue; var nv = elx.value; if (elx.type === 'number') nv = parseFloat(nv); if (nv === 'true') nv = true; if (nv === 'false') nv = false; if (cur && JSON.stringify(cur.settings[ids[i]]) !== JSON.stringify(nv)) set[ids[i]] = nv; }
      if (!Object.keys(set).length) { msg('at-save-msg', 'Nothing changed.'); return; }
      post('/settings', { settings: set }).then(function (j) { if (j.ok) { msg('at-save-msg', 'Saved.'); afterWrite(['settings', 'overview', 'ads-']); } else msg('at-save-msg', j.error || 'Failed', true); });
      return;
    }
    if (act === 'at-rule-test') { post('/source-rules', { test_url: val('at-r-test'), referrer: val('at-r-ref'), rule: { name: val('at-r-name'), field: val('at-r-field'), op: val('at-r-op'), value: val('at-r-value'), source_type: val('at-r-stype'), source_name: val('at-r-sname'), enabled: 1 } }).then(function (j) { var o = document.getElementById('at-rule-out'); if (o) o.textContent = j.ok ? 'Would be tagged as: ' + j.result.source_name + ' (' + j.result.source_type + ')' : (j.error || 'Failed'); }); return; }
    if (act === 'at-rule-add') { post('/source-rules', { rule: { name: val('at-r-name'), field: val('at-r-field'), op: val('at-r-op'), value: val('at-r-value'), source_type: val('at-r-stype'), source_name: val('at-r-sname') } }).then(function (j) { if (j.ok) afterWrite(['rules', 'log']); else msg('at-rule-out', j.error || 'Failed', true); }); return; }
    if (act === 'at-rule-toggle') { post('/source-rules', { id: parseInt(v, 10), rule: { enabled: t.getAttribute('data-e') === '1' } }).then(function () { afterWrite(['rules', 'log']); }); return; }
    if (act === 'at-rule-del') { if (!confirm('Delete this rule?')) return; post('/source-rules', { action: 'delete', id: parseInt(v, 10) }).then(function () { afterWrite(['rules', 'log']); }); return; }
    if (act === 'at-prod-save') { t.disabled = true; post('/products', { id: parseInt(v, 10), name: val('at-pn-' + v), role: val('at-pr-' + v) || undefined, funnel: val('at-pf-' + v) }).then(function (j) { if (!j.ok) alert(j.error || 'Failed'); afterWrite(['products', 'alerts', 'take', 'log']); }); return; }
    if (act === 'at-aud-toggle') { post('/audiences', { action: 'toggle', id: parseInt(v, 10), enabled: t.getAttribute('data-e') === '1' }).then(function () { afterWrite(['audiences', 'log']); }); return; }
    if (act === 'at-aud-backfill') { t.disabled = true; t.textContent = 'Working'; post('/audiences', { action: 'backfill', limit: 2000 }).then(function (j) { msg('at-aud-out', j.ok ? 'Evaluated ' + j.evaluated + ' people.' : (j.error || 'Failed'), !j.ok); afterWrite(['audiences']); }); return; }
    if (act === 'at-aud-quick') {
      var defs = { all_purchase: { name: 'All Purchase', rules: [{ kind: 'any_buyer' }] }, abandoned7: { name: 'Abandoned checkout 7d', rules: [{ kind: 'abandoned', days: 7 }] }, value_buyers: { name: 'Value buyers', rules: [{ kind: 'any_buyer' }], value_based: true } };
      var q1 = defs[v]; if (!q1) return;
      post('/audiences', { name: q1.name, definition: { rules: q1.rules }, value_based: !!q1.value_based }).then(function (j) { if (!j.ok) msg('at-aud-out', j.error || 'Failed', true); afterWrite(['audiences', 'log']); });
      return;
    }
    if (act === 'at-aud-add') {
      var rule = { kind: val('at-a-kind') }, vv = val('at-a-val').trim(), dv = parseInt(val('at-a-days'), 10);
      if (rule.kind === 'bought' || rule.kind === 'not_bought') rule.product = vv; else if (rule.kind === 'lead_source') rule.source = vv; else if (rule.kind === 'visited') rule.url = vv;
      if (dv) rule.days = dv;
      var cm = document.getElementById('at-a-meta'), cv = document.getElementById('at-a-value');
      post('/audiences', { name: val('at-a-name') || 'Audience', definition: { rules: [rule] }, create_in_meta: !!(cm && cm.checked), value_based: !!(cv && cv.checked) }).then(function (j) { if (!j.ok) msg('at-aud-out', j.error || 'Failed', true); afterWrite(['audiences', 'log']); });
      return;
    }
    if (act === 'at-user-add') { post('/users', { name: val('at-u-name'), email: val('at-u-email'), role: val('at-u-role'), brands: val('at-u-brands').split(',') }).then(function (j) { var o = document.getElementById('at-user-out'); if (!o) return; o.innerHTML = j.ok ? '<div class="callout" style="border-left-color:' + C_GOOD + ';"><div class="at-ok">Key for ' + esc(val('at-u-name')) + ' (shown once, save it in the password manager):</div><div class="at-code" id="at-newkey">' + esc(j.key) + '</div><button class="pill sm" data-act="at-copy" data-v="at-newkey" style="margin-top:8px;">Copy</button></div>' : errCard(j.error); delete S.data['users|' + S.brand + '|' + rangeQS() + modelQS()]; }); return; }
    if (act === 'at-user-off') { if (!confirm('Deactivate this key?')) return; post('/users', { action: 'deactivate', id: parseInt(v, 10) }).then(function () { afterWrite(['users', 'log']); }); return; }
    if (act === 'at-undo') { post('/change-log', { undo_id: parseInt(v, 10) }).then(function (j) { if (!j.ok) alert(j.error || 'Could not undo'); invalidate(); rerender(); }); return; }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target && e.target.id === 'at-key') { var b = document.querySelector('[data-act="at-key-save"]'); if (b) b.click(); } if (e.key === 'Enter' && e.target && e.target.id === 'at-lq') { S.leadsQ = e.target.value.trim(); render(); } if (e.key === 'Enter' && e.target && e.target.id === 'at-url') { var c = document.querySelector('[data-act="at-check"]'); if (c) c.click(); } });
  document.addEventListener('change', function (e) {
    var id = e.target && e.target.id;
    if (id === 'at-from' || id === 'at-to') { var f = val('at-from'), t2 = val('at-to'); if (f && t2) { S.custom = { from: f, to: t2 }; render(); } }
    if (id === 'at-model') { S.model = e.target.value || null; render(); }
    if (id === 'at-organic') { S.organic = e.target.value || null; render(); }
  });

  return { render: render, state: S, base: BASE };
})();
