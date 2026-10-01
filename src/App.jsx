import React, { useEffect } from "react";
import "./App.css";
import rawData from "./data.json";

function App() {
  useEffect(() => {
    
// Captured before any DOM change so an editor can republish the page with new data baked in.
var PRISTINE = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
var RAW = rawData;
var LS_KEY = 'banglainvest.rates.v1', LS_THEME = 'banglainvest.theme';
var VORI = 11.664, ANA = VORI/16, ROTI = VORI/96, POINT = VORI/960, OZ = 31.1034768;
var UNIT_G = {vori:VORI, ana:ANA, roti:ROTI, point:POINT, g:1, oz:OZ, kg:1000};
var PURITY = {k24:1, k22:22/24, k21:21/24, k18:18/24};
var KARATS = [
  {id:'k22', en:'22 karat', bn:'২২ ক্যারেট', cls:'--k22'},
  {id:'k21', en:'21 karat', bn:'২১ ক্যারেট', cls:'--k21'},
  {id:'k18', en:'18 karat', bn:'১৮ ক্যারেট', cls:'--k18'},
  {id:'trad', en:'Traditional', bn:'সনাতন', cls:'--trad'}
];
var KSHORT = {k24:'24K equivalent', k22:'22K', k21:'21K', k18:'18K', trad:'Sanatan'};
var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var DAY = 86400000;

var D, override = null, artifactNS = null, charts = [];
try { var s0 = localStorage.getItem(LS_KEY); if (s0) override = JSON.parse(s0); } catch (e) {}
if (override && override.baseAsOf !== RAW.asOf) { override = null; try { localStorage.removeItem(LS_KEY); } catch (e) {} }

function build(){
  D = JSON.parse(JSON.stringify(RAW));
  D.overridden = false;
  if (override && typeof override === 'object') {
    try {
      if (override.spot) Object.assign(D.spot, override.spot);
      if (override.fx) Object.assign(D.fx, override.fx);
      if (override.perVori) {
        var prev = override.prevPerVori || RAW.bajus.perVori;
        Object.assign(D.bajus.perVori, override.perVori);
        KARATS.forEach(function(k){ D.bajus.change[k.id] = Math.round(D.bajus.perVori[k.id] - prev[k.id]); });
      }
      if (override.silver) Object.assign(D.bajus.silverPerGram, override.silver);
      if (override.asOfLabel) D.asOfLabel = override.asOfLabel;
      if (override.asOf) D.asOf = override.asOf;
      D.overridden = true;
    } catch (e) {}
  }
}

/* ---------- formatting ---------- */
var fIN0 = new Intl.NumberFormat('en-IN', {maximumFractionDigits:0});
var fIN2 = new Intl.NumberFormat('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});
var fUS0 = new Intl.NumberFormat('en-US', {maximumFractionDigits:0});
var fUS2 = new Intl.NumberFormat('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
function bdt(n, d){ return '\u09F3' + (d ? fIN2 : fIN0).format(n); }
function usd(n, d){ return '$' + (d ? fUS2 : fUS0).format(n); }
function num(n, d){ return new Intl.NumberFormat('en-US', {maximumFractionDigits: d == null ? 2 : d}).format(n); }
function pct(x, d){ return (x >= 0 ? '+' : '\u2212') + Math.abs(x*100).toFixed(d == null ? 1 : d) + '%'; }
function round(n, d){ var m = Math.pow(10, d); return Math.round(n*m)/m; }
function $(id){ return document.getElementById(id); }
function setT(id, t){ var el = $(id); if (el) el.textContent = t; }
function chgClass(n){ return n > 0 ? 'up' : n < 0 ? 'down' : 'flat'; }
function signed(n, fmt){ return (n > 0 ? '\u25B2 ' : n < 0 ? '\u25BC ' : '') + fmt(Math.abs(n)); }
function setChg(id, n, fmt, suffix){ var el = $(id); if (!el) return; el.className = 'chg ' + chgClass(n); el.textContent = (n > 0 ? '\u25B2 ' : n < 0 ? '\u25BC ' : '\u2013 ') + fmt(Math.abs(n)) + (suffix || ''); }
function ts(s){ if (typeof s === 'number') return s; var p = s.split('-').map(Number); return Date.UTC(p[0], (p[1]||1)-1, p[2]||1); }
function fmtDate(s){ var t = new Date(ts(s)); return t.getUTCDate() + ' ' + MON[t.getUTCMonth()] + ' ' + t.getUTCFullYear(); }
function fmtAxis(t, spanDays){ var d = new Date(t); if (spanDays <= 60) return d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; if (spanDays <= 800) return MON[d.getUTCMonth()] + ' ' + String(d.getUTCFullYear()).slice(2); return String(d.getUTCFullYear()); }
function niceStep(raw){ var mag = Math.pow(10, Math.floor(Math.log10(raw))); var n = raw/mag; return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag; }
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function gramRate(k){ if (k === 'k24') return D.bajus.perVori.k22 / VORI / PURITY.k22; return D.bajus.perVori[k] / VORI; }
function todayISO(){ var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }

/* ---------- chart ---------- */
function lineChart(el, cfg){
  var df = cfg.dateFmt || fmtDate;
  function draw(){
    var W = Math.max(300, el.clientWidth || 600), H = cfg.height || 300;
    var padL = cfg.padL || 66, padR = 16, padT = 16, padB = 30;
    var iw = W - padL - padR, ih = H - padT - padB;
    var S = cfg.series.filter(function(s){ return s.data && s.data.length; });
    if (!S.length) { el.innerHTML = ''; return; }
    var xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    S.forEach(function(s){ s.data.forEach(function(p){ if (p[0] < xmin) xmin = p[0]; if (p[0] > xmax) xmax = p[0]; if (p[1] < ymin) ymin = p[1]; if (p[1] > ymax) ymax = p[1]; }); });
    if (xmax === xmin) xmax = xmin + DAY;
    var yp = (ymax - ymin) * 0.08 || ymax * 0.05 || 1; ymin -= yp; ymax += yp; if (ymin < 0) ymin = 0;
    var step = niceStep((ymax - ymin) / 4), ticks = [];
    for (var v = Math.ceil(ymin/step)*step; v <= ymax + 1e-9; v += step) ticks.push(v);
    var sx = function(x){ return padL + (x - xmin)/(xmax - xmin)*iw; };
    var sy = function(y){ return padT + (ymax - y)/(ymax - ymin)*ih; };
    var spanDays = (xmax - xmin)/DAY;
    var nX = W < 480 ? 3 : 5, xt = [];
    for (var i = 0; i <= nX; i++) xt.push(xmin + (xmax - xmin)*i/nX);
    var g = '';
    ticks.forEach(function(v){ var y = sy(v); g += '<line x1="'+padL+'" x2="'+(W-padR)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line-2)" stroke-dasharray="3 4"/><text x="'+(padL-8)+'" y="'+(y+4)+'" text-anchor="end" font-size="11" fill="var(--ink-3)">'+esc(cfg.yFmt(v))+'</text>'; });
    xt.forEach(function(x, i){ var px = sx(x); var anchor = i === 0 ? 'start' : i === nX ? 'end' : 'middle'; g += '<text x="'+px+'" y="'+(H-8)+'" text-anchor="'+anchor+'" font-size="11" fill="var(--ink-3)">'+fmtAxis(x, spanDays)+'</text>'; });
    var gid = 'grad' + Math.random().toString(36).slice(2, 8);
    var grad = '<linearGradient id="'+gid+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+S[0].color+'" stop-opacity=".26"/><stop offset="1" stop-color="'+S[0].color+'" stop-opacity="0"/></linearGradient>';
    var paths = '';
    S.forEach(function(s, si){
      var pts = s.data.map(function(p){ return [sx(p[0]), sy(p[1])]; });
      var d = pts.map(function(p, i){ return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
      if (si === 0 && cfg.fill !== false) paths += '<path d="'+d+' L'+pts[pts.length-1][0].toFixed(1)+' '+(padT+ih).toFixed(1)+' L'+pts[0][0].toFixed(1)+' '+(padT+ih).toFixed(1)+' Z" fill="url(#'+gid+')"/>';
      paths += '<path d="'+d+'" fill="none" stroke="'+s.color+'" stroke-width="'+(si === 0 ? 2 : 1.6)+'" stroke-linejoin="round" stroke-linecap="round"/>';
      var last = pts[pts.length-1];
      paths += '<circle cx="'+last[0]+'" cy="'+last[1]+'" r="3.2" fill="'+s.color+'"/>';
    });
    var hovCircles = S.map(function(s){ return '<circle r="4.5" fill="'+s.color+'" stroke="var(--panel)" stroke-width="2"/>'; }).join('');
    el.innerHTML = '<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="'+esc(cfg.aria || 'chart')+'"><defs>'+grad+'</defs>'+g+paths+'<g class="hov" style="display:none"><line x1="0" x2="0" y1="'+padT+'" y2="'+(padT+ih)+'" stroke="var(--ink-3)" stroke-width="1"/>'+hovCircles+'</g><rect class="hit" x="'+padL+'" y="'+padT+'" width="'+iw+'" height="'+ih+'" fill="transparent"/></svg><div class="tip"></div>';
    var svg = el.querySelector('svg'), hov = svg.querySelector('.hov'), gl = hov.querySelector('line');
    var circles = Array.prototype.slice.call(hov.querySelectorAll('circle')), tip = el.querySelector('.tip'), hit = svg.querySelector('.hit');
    var base = S[0].data;
    function nearest(px){
      var xv = xmin + (px - padL)/iw*(xmax - xmin), lo = 0, hi = base.length - 1;
      while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (base[mid][0] < xv) lo = mid; else hi = mid; }
      return Math.abs(base[lo][0] - xv) <= Math.abs(base[hi][0] - xv) ? lo : hi;
    }
    function move(ev){
      var rect = svg.getBoundingClientRect(); var px = (ev.clientX - rect.left) * (W/rect.width);
      var i = nearest(px), x = sx(base[i][0]);
      hov.style.display = ''; gl.setAttribute('x1', x); gl.setAttribute('x2', x);
      var html = '<div class="d">' + df(base[i][0]) + (cfg.estFlag && base[i][2] === 0 ? ' \u00B7 estimated' : '') + '</div>';
      S.forEach(function(s, si){ var p = s.data[i] || s.data[s.data.length-1]; circles[si].setAttribute('cx', sx(p[0])); circles[si].setAttribute('cy', sy(p[1])); html += '<div><span class="dot" style="--kc:'+s.color+'"></span>' + (s.label ? esc(s.label) + ' ' : '') + esc(cfg.yFmtTip ? cfg.yFmtTip(p[1]) : cfg.yFmt(p[1])) + '</div>'; });
      tip.innerHTML = html; tip.style.display = 'block';
      var tw = tip.offsetWidth, cx = x * (rect.width/W);
      tip.style.left = Math.min(Math.max(cx - tw/2, 0), rect.width - tw) + 'px';
    }
    hit.addEventListener('pointermove', move); hit.addEventListener('pointerdown', move);
    hit.addEventListener('pointerleave', function(){ hov.style.display = 'none'; tip.style.display = 'none'; });
  }
  draw();
  el._redraw = draw;
  if (charts.indexOf(el) < 0) charts.push(el);
}

/* ---------- rate board ---------- */
function renderBoard(){
  var b = D.bajus, s = D.spot, fx = D.fx.usdbdt;
  setT('board-date', D.asOfLabel); setT('foot-date', D.asOfLabel);
  $('board-stamp').innerHTML = D.overridden ? '<span class="stamp">updated on this device</span>' : '';
  setT('board-22', bdt(b.perVori.k22));
  setT('board-22g', bdt(gramRate('k22')) + ' per gram');
  setChg('board-22chg', b.change.k22, function(v){ return bdt(v); }, ' per vori vs previous rate');
  setT('board-spot', usd(s.usd, true));
  var d = s.usd - s.prevClose;
  setChg('board-spotchg', d, function(v){ return usd(v, true); }, ' (' + pct(d/s.prevClose, 2) + ')');
  setT('board-spotbdt', '\u2248 ' + bdt(s.usd*fx) + ' per oz \u00B7 ' + bdt(s.usd*fx/OZ) + ' per gram');
  $('board-strip').innerHTML = KARATS.map(function(k){
    var ch = b.change[k.id] || 0;
    return '<div class="cell" style="--kc:var('+k.cls+')"><div class="k">'+k.en+' <span class="bn">'+k.bn+'</span></div><div class="v">'+bdt(b.perVori[k.id])+'</div><div class="d chg '+chgClass(ch)+'">'+signed(ch, function(v){ return bdt(v); })+' per vori</div></div>';
  }).join('');
  var intl22 = s.usd*fx/OZ*VORI*PURITY.k22, prem = b.perVori.k22/intl22 - 1;
  $('board-premium').innerHTML = 'Bangladesh premium: a vori of 22K at the world price would be <b>'+bdt(intl22)+'</b>; the BAJUS rate is <b>'+pct(prem, 1)+'</b> above it. Spot quoted '+esc(s.time)+'; exchange rate '+num(fx, 2)+' Taka per dollar.';
  setT('inv-prem', pct(prem, 0).replace('+',''));
  setT('bajus-datenote', 'Rate effective ' + D.asOfLabel + '.');
}

/* ---------- world price ---------- */
var gRange = '1y', gCur = 'usd';
function spotSeries(range){
  var daily = D.spotDaily2026.map(function(p){ return [ts(p[0]), p[1], 1]; });
  if (D.overridden && D.asOf) { var t = ts(D.asOf), last = daily[daily.length-1]; if (t > last[0]) daily.push([t, D.spot.usd, 1]); else if (t === last[0]) last[1] = D.spot.usd; }
  var weekly = D.spotWeekly2025.map(function(p){ return [ts(p[0]), p[1], 1]; });
  var q = D.spotQuarterly.map(function(p){ return [ts(p[0]), p[1], 1]; });
  var y = D.spotYearly.map(function(p){ return [Date.UTC(p[0], 6, 1), p[1], 1]; });
  var endT = daily[daily.length-1][0];
  if (range === '1m') return daily.filter(function(p){ return p[0] >= endT - 31*DAY; });
  if (range === 'ytd') return daily;
  if (range === '1y') return weekly.concat(daily);
  if (range === '5y') return q.concat(weekly, daily);
  return y;
}
function renderGlobal(){
  var fx = D.fx.usdbdt, mult = gCur === 'bdt' ? fx : 1;
  var data = spotSeries(gRange).map(function(p){ return [p[0], p[1]*mult, p[2]]; });
  var fmt = gCur === 'bdt' ? function(v){ return bdt(v); } : function(v){ return usd(v); };
  var df = gRange === 'all' ? function(t){ return new Date(t).getUTCFullYear() + ' average'; } : fmtDate;
  lineChart($('g-chart'), {series:[{label:'', color:'var(--gold)', data:data}], yFmt:fmt, aria:'World gold price', dateFmt:df});
  var hi = data[0], lo = data[0];
  data.forEach(function(p){ if (p[1] > hi[1]) hi = p; if (p[1] < lo[1]) lo = p; });
  var desc = {'1m':'Last month, daily closes', 'ytd':'2026 so far, daily closes', '1y':'One year: weekly closes to December 2025, daily from January 2026', '5y':'Five years: quarterly closes to mid-2025, then weekly and daily', 'all':'Yearly average price since 2000'}[gRange];
  setT('g-foot', desc + ' \u00B7 high ' + fmt(hi[1]) + ' (' + df(hi[0]) + ') \u00B7 low ' + fmt(lo[1]) + ' (' + df(lo[0]) + ')');
  var s = D.spot, rows = [['Troy ounce', OZ], ['Gram', 1], ['Vori (11.664 g)', VORI], ['Ana (0.729 g)', ANA], ['Kilogram', 1000]];
  $('g-table').querySelector('tbody').innerHTML = rows.map(function(r){
    var g = r[1], u24 = s.usd/OZ*g, u22 = u24*PURITY.k22;
    return '<tr><td>'+r[0]+'</td><td>'+usd(u24, u24 < 1000)+'</td><td class="num">'+bdt(u24*fx)+'</td><td>'+usd(u22, u22 < 1000)+'</td><td class="num">'+bdt(u22*fx)+'</td></tr>';
  }).join('');
  setT('g-fx', '$1 = ' + bdt(fx, true));
  renderConverter();
}
function renderConverter(){
  var amt = +$('cv-amt').value || 0, unit = $('cv-unit').value, pur = $('cv-purity').value;
  var grams = amt * UNIT_G[unit], usdVal = grams * D.spot.usd/OZ * PURITY[pur];
  setT('cv-usd', usd(usdVal, usdVal < 1000)); setT('cv-bdt', bdt(usdVal * D.fx.usdbdt));
  var local = grams * gramRate(pur);
  setT('cv-bajus', bdt(local));
  var diff = local / (usdVal * D.fx.usdbdt) - 1;
  setT('cv-bajus-s', num(grams, 3) + ' g of ' + KSHORT[pur] + ' \u00B7 ' + pct(diff, 1) + ' vs world price' + (pur === 'k24' ? ' \u00B7 BAJUS publishes no 24K rate; this is the 22K rate divided by 22\u204424' : ''));
}

/* ---------- BAJUS today ---------- */
function renderBajus(){
  var b = D.bajus;
  $('bajus-cards').innerHTML = KARATS.map(function(k){
    var v = b.perVori[k.id], g = v/VORI, ch = b.change[k.id] || 0;
    return '<div class="kcard" style="--kc:var('+k.cls+')"><div class="k"><b>'+k.en+'</b><span class="bn">'+k.bn+'</span></div>'+
      '<div class="big">'+bdt(v)+'</div><div class="per">per vori \u00B7 \u09AD\u09B0\u09BF</div>'+
      '<div class="chg '+chgClass(ch)+'">'+signed(ch, function(x){ return bdt(x); })+' vs previous rate</div>'+
      '<table><tr><td>Per gram</td><td>'+bdt(g)+'</td></tr>'+
      '<tr><td>Per ana <span class="u">\u0986\u09A8\u09BE</span></td><td>'+bdt(g*ANA)+'</td></tr>'+
      '<tr><td>Per roti <span class="u">\u09B0\u09A4\u09BF</span></td><td>'+bdt(g*ROTI)+'</td></tr>'+
      '<tr><td>Per point <span class="u">\u09AA\u09DF\u09C7\u09A8\u09CD\u099F</span></td><td>'+bdt(g*POINT, true)+'</td></tr>'+
      '<tr><td>Buy-back at \u2212'+b.sellDeduction+'%</td><td>'+bdt(v*(1 - b.sellDeduction/100))+'</td></tr></table></div>';
  }).join('');
  var names = {k22:'22 karat silver', k21:'21 karat silver', k18:'18 karat silver', trad:'Traditional silver'};
  $('silver-table').querySelector('tbody').innerHTML = KARATS.map(function(k){ var g = b.silverPerGram[k.id]; return '<tr><td>'+names[k.id]+'</td><td>'+bdt(g)+'</td><td class="num">'+bdt(g*VORI)+'</td></tr>'; }).join('');
}

/* ---------- history ---------- */
var hKarat = 'all', hUnit = 'vori', hRange = '1y';
function renderGrowth(){
  var now = gramRate('k22'), G = D.growth;
  var items = [['1 year', G.y1], ['5 years', G.y5], ['10 years', G.y10], ['15 years', G.y15]];
  $('growth-cards').innerHTML = items.map(function(it){
    var p = now/it[1].gram - 1;
    return '<div class="gcard"><div class="l">'+it[0]+' ago \u00B7 '+bdt(it[1].gram)+' per gram</div><div class="v '+(p >= 0 ? 'up' : 'down')+'">'+pct(p, 0)+'</div><div class="s">'+num(now/it[1].gram, 1)+'\u00D7 \u00B7 rate on '+it[1].date+'</div></div>';
  }).join('');
  var rec = D.record, below = now/rec.gram - 1;
  var note = $('record-note');
  if (!note) { note = document.createElement('p'); note.className = 'note'; note.id = 'record-note'; $('growth-cards').insertAdjacentElement('afterend', note); }
  note.innerHTML = 'Highest rate on record: <b>'+bdt(rec.gram)+' per gram</b> ('+bdt(rec.vori)+' per vori) on '+rec.date+'. Today\u2019s rate is '+Math.abs(below*100).toFixed(1)+'% '+(below < 0 ? 'below' : 'above')+' that peak.';
  setT('inv-10y', pct(now/G.y10.gram - 1, 0).replace('+',''));
  setT('p-5y', pct(now/G.y5.gram - 1, 0));
  var facts = [
    [pct(now/G.y10.gram - 1, 0), '22K rate per gram since '+G.y10.date+': '+bdt(G.y10.gram)+' then, '+bdt(now)+' today'],
    [pct(below, 0), 'Today against the record '+bdt(rec.gram)+' per gram set on '+rec.date],
    ['\u09F3'+num(D.fx.usdbdt, 1), 'Taka per US dollar today, from about \u09F385 in 2020 \u2014 a weaker Taka lifts the local gold rate']
  ];
  $('invest-facts').innerHTML = facts.map(function(f){ return '<div class="fact"><div class="v">'+f[0]+'</div><div class="l">'+f[1]+'</div></div>'; }).join('');
}
function bajusBase(range){
  var m = D.bajus1y.map(function(p){ return [ts(p[0]), p[1], p[2]]; });
  if (D.overridden && D.asOf) { var t = ts(D.asOf), last = m[m.length-1]; if (t > last[0]) m.push([t, D.bajus.perVori.k22, 1]); else last[1] = D.bajus.perVori.k22; }
  if (range === '1y') return m;
  var from = range === '5y' ? 2021 : range === '10y' ? 2016 : 2007;
  var yr = D.yearly.filter(function(r){ return r[0] >= from && r[0] <= 2024; }).sort(function(a, b){ return a[0]-b[0]; }).map(function(r){ return [Date.UTC(r[0], 11, 31), r[4], 1]; });
  return yr.concat(m);
}
function renderHistory(){
  var b = D.bajus, base = bajusBase(hRange);
  var uf = hUnit === 'vori' ? 1 : hUnit === 'g' ? 1/VORI : OZ/VORI, ul = hUnit === 'vori' ? 'vori' : hUnit === 'g' ? 'gram' : 'oz';
  var ratios = {k22:1, k21:b.perVori.k21/b.perVori.k22, k18:b.perVori.k18/b.perVori.k22, trad:b.perVori.trad/b.perVori.k22};
  var sel = KARATS.filter(function(k){ return hKarat === 'all' || hKarat === k.id; });
  var colors = {k22:'#C0392B', k21:'#2C5AA0', k18:'#2E8B57', trad:'#B8860B'};
  var dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) colors = {k22:'#EF6E63', k21:'#79A5E6', k18:'#66CB98', trad:'#E7C25A'};
  var series = sel.map(function(k){ return {label:k.en, color:colors[k.id], data: base.map(function(p){ return [p[0], p[1]*ratios[k.id]*uf, p[2]]; })}; });
  var dec = hUnit === 'g';
  lineChart($('h-chart'), {series:series, yFmt:function(v){ return bdt(v); }, yFmtTip:function(v){ return bdt(v, dec && v < 1000) + ' per ' + ul; }, estFlag:true, aria:'BAJUS gold rate history'});
  var first = series[0].data, hi = first[0], lo = first[0];
  first.forEach(function(p){ if (p[1] > hi[1]) hi = p; if (p[1] < lo[1]) lo = p; });
  $('h-legend').innerHTML = series.map(function(s){ var last = s.data[s.data.length-1]; return '<span><span class="dot" style="--kc:'+s.color+'"></span>'+s.label+' '+bdt(last[1])+' per '+ul+'</span>'; }).join('');
  var rangeDesc = {'1y':'One year: announced rates, joined by estimates between announcements', '5y':'Five years: year-end rates, then the last twelve months', '10y':'Ten years: year-end rates, then the last twelve months', 'all':'Since 2007: year-end rates, then the last twelve months'}[hRange];
  setT('h-foot', rangeDesc + ' \u00B7 ' + series[0].label + ' high ' + bdt(hi[1]) + ' (' + fmtDate(hi[0]) + '), low ' + bdt(lo[1]) + ' (' + fmtDate(lo[0]) + ') per ' + ul + (hKarat === 'all' || hKarat !== 'k22' ? ' \u00B7 21K, 18K and Sanatan follow today\u2019s BAJUS ratios to 22K' : ''));
  $('changes-table').querySelector('tbody').innerHTML = D.changes.map(function(c){
    var chg = c[5];
    return '<tr><td>'+fmtDate(c[0])+'<div class="note" style="margin:2px 0 0;max-width:22ch">'+esc(c[6] || '')+'</div></td><td class="num">'+bdt(c[1])+'</td><td class="chg '+chgClass(chg || 0)+'">'+(chg == null ? '\u2014' : signed(chg, function(x){ return bdt(x); }))+'</td><td>'+(c[2] ? bdt(c[2]) : '\u2014')+'</td><td>'+(c[3] ? bdt(c[3]) : '\u2014')+'</td><td>'+(c[4] ? bdt(c[4]) : '\u2014')+'</td></tr>';
  }).join('');
  var t = D.tally2026;
  setT('tally-note', 'Per vori, including VAT. BAJUS has changed the gold rate '+t.total+' times in 2026: '+t.up+' rises, '+t.down+' cuts and '+t.vat+' VAT restructuring. Announcements between the dates shown are omitted; the full log is on bajus.org.');
  $('yearly-table').querySelector('tbody').innerHTML = D.yearly.map(function(r){
    return '<tr><td>'+r[0]+(r[5] ? '<div class="note" style="margin:0">'+esc(r[5])+'</div>' : '')+'</td><td>'+bdt(r[1])+'</td><td>'+bdt(r[2])+'</td><td>'+bdt(r[3])+'</td><td class="num">'+bdt(r[4])+'</td></tr>';
  }).join('');
}

/* ---------- gold calculator ---------- */
function decompose(g){ var rem = g, v = Math.floor(rem/VORI + 1e-9); rem -= v*VORI; var a = Math.floor(rem/ANA + 1e-9); rem -= a*ANA; var r = Math.floor(rem/ROTI + 1e-9); rem -= r*ROTI; return {v:v, a:a, r:r, p:Math.max(0, rem/POINT)}; }
function calcGrams(){ return (+$('c-vori').value || 0)*VORI + (+$('c-ana').value || 0)*ANA + (+$('c-roti').value || 0)*ROTI + (+$('c-point').value || 0)*POINT; }
function setUnitFields(g){ var d = decompose(g); $('c-vori').value = d.v; $('c-ana').value = d.a; $('c-roti').value = d.r; $('c-point').value = round(d.p, 2); }
function renderCalc(){
  var g = calcGrams(), k = $('c-karat').value, mc = +$('c-mc').value || 0;
  var value = g * gramRate(k) * (1 + mc/100);
  setT('c-value', bdt(value));
  setT('c-value-s', KSHORT[k] + ' at ' + bdt(gramRate(k)) + ' per gram' + (mc ? ', plus ' + mc + '% making charge' : '') + (k === 'k24' ? ' (24K equivalent derived from 22K)' : ''));
  setT('c-grams', num(g, 3) + ' g');
  var d = decompose(g);
  setT('c-breakdown', '= ' + d.v + ' vori ' + d.a + ' ana ' + d.r + ' roti ' + num(d.p, 2) + ' point \u00B7 ' + num(g/VORI, 3) + ' vori');
  setT('c-ozkg', num(g/OZ, 4) + ' oz \u00B7 ' + num(g/1000, 4) + ' kg');
  var pur = PURITY[k];
  if (pur) { var w = g * D.spot.usd/OZ * pur; setT('c-world', 'World value: ' + usd(w, w < 1000) + ' \u2248 ' + bdt(w*D.fx.usdbdt)); } else setT('c-world', 'World value not defined for traditional gold');
}
function wireCalc(){
  ['c-vori','c-ana','c-roti','c-point'].forEach(function(id){ $(id).addEventListener('input', function(){ var g = calcGrams(); $('c-gram').value = round(g, 4); $('c-oz').value = round(g/OZ, 4); renderCalc(); }); });
  $('c-gram').addEventListener('input', function(){ var g = +this.value || 0; $('c-oz').value = round(g/OZ, 4); setUnitFields(g); renderCalc(); });
  $('c-oz').addEventListener('input', function(){ var g = (+this.value || 0)*OZ; $('c-gram').value = round(g, 4); setUnitFields(g); renderCalc(); });
  $('c-karat').addEventListener('change', renderCalc); $('c-mc').addEventListener('input', renderCalc);
  $('c-chips').addEventListener('click', function(e){ var b = e.target.closest('button'); if (!b) return; var g = +b.dataset.g; $('c-gram').value = round(g, 4); $('c-oz').value = round(g/OZ, 4); setUnitFields(g); renderCalc(); });
}

/* ---------- selling ---------- */
function renderSell(){
  var amt = +$('s-amt').value || 0, unit = $('s-unit').value, k = $('s-karat').value, ded = +$('s-ded').value || 0;
  var g = amt * UNIT_G[unit], gross = g * gramRate(k), cut = gross*ded/100, net = gross - cut;
  setT('s-net', bdt(net)); setT('s-gross', bdt(gross)); setT('s-cut', '\u2212' + bdt(cut));
  setT('s-net-s', num(g, 3) + ' g of ' + KSHORT[k] + ' \u00B7 ' + ded + '% deducted from ' + bdt(gramRate(k)) + ' per gram');
  var be = ded < 100 ? 1/(1 - ded/100) - 1 : 0;
  setT('s-note', 'Net rate ' + bdt(g ? net/g*VORI : gramRate(k)*VORI*(1 - ded/100)) + ' per vori. Gold bought at today\u2019s rate must rise ' + pct(be, 1).replace('+', '') + ' before selling at this deduction returns the purchase price \u2014 more if a making charge was paid.');
  setT('inv-be', pct(1/(1 - D.bajus.sellDeduction/100) - 1, 0).replace('+', ''));
}

/* ---------- coins ---------- */
function renderCoins(){
  var g22 = gramRate('k22');
  setT('gk-rate', bdt(g22));
  $('gk-table').querySelector('tbody').innerHTML = D.coins.goldKinen.map(function(r){ return '<tr><td>'+r[0]+'</td><td class="num">'+bdt(r[1]*g22)+'</td><td>'+bdt(r[2])+'</td></tr>'; }).join('');
  $('dw-table').querySelector('tbody').innerHTML = D.coins.diamondWorld.map(function(r){ return '<tr><td>'+r[0]+'</td><td class="num">'+bdt(r[1]*g22)+'</td><td>'+bdt(g22)+'</td></tr>'; }).join('');
}

/* ---------- planner ---------- */
function renderPlanner(){
  var amt = +$('p-amt').value || 0, yrs = Math.max(1, Math.min(40, +$('p-years').value || 1)), g22 = gramRate('k22');
  var gpm = amt/g22, N = yrs*12, gTotal = gpm*N;
  setT('p-month', num(gpm, 3) + ' g');
  setT('p-total', num(gTotal, 2) + ' g');
  setT('p-total-s', num(gTotal/VORI, 2) + ' vori for ' + bdt(amt*N) + ' paid in');
  var f5 = g22 / D.growth.y5.gram, r = Math.pow(f5, 1/5) - 1, grams = 0;
  for (var m = 1; m <= N; m++) grams += amt / (g22 * Math.pow(1 + r, m/12));
  var end = grams * g22 * Math.pow(1 + r, N/12);
  setT('p-proj', bdt(end));
}

/* ---------- update panel ---------- */
function fillUpdate(){
  $('u-date').value = D.asOfLabel; $('u-spot').value = D.spot.usd; $('u-prev').value = D.spot.prevClose; $('u-fx').value = D.fx.usdbdt;
  KARATS.forEach(function(k){ $('u-'+k.id).value = D.bajus.perVori[k.id]; $('u-s'+k.id.replace('k','')).value = D.bajus.silverPerGram[k.id]; });
}
function readUpdate(){
  var o = {baseAsOf: RAW.asOf, asOf: todayISO(), asOfLabel: ($('u-date').value || '').trim() || D.asOfLabel, spot:{}, fx:{}, perVori:{}, silver:{}, prevPerVori: JSON.parse(JSON.stringify(D.bajus.perVori))};
  var sp = +$('u-spot').value, pv = +$('u-prev').value, fx = +$('u-fx').value;
  if (sp > 0) o.spot.usd = sp; if (pv > 0) o.spot.prevClose = pv; o.spot.time = 'as entered for ' + o.asOfLabel; if (fx > 0) o.fx.usdbdt = fx;
  KARATS.forEach(function(k){ var v = +$('u-'+k.id).value; if (v > 0) o.perVori[k.id] = Math.round(v); var sv = +$('u-s'+k.id.replace('k','')).value; if (sv > 0) o.silver[k.id] = sv; });
  return o;
}
function wireUpdate(){
  $('u-save').addEventListener('click', function(){
    override = readUpdate();
    try { localStorage.setItem(LS_KEY, JSON.stringify(override)); } catch (e) {}
    build(); renderAll(); setT('u-msg', 'Saved in this browser. Other visitors still see the published rates.');
  });
  $('u-reset').addEventListener('click', function(){
    override = null; try { localStorage.removeItem(LS_KEY); } catch (e) {}
    build(); renderAll(); setT('u-msg', 'Back to the published rates.');
  });
  $('u-publish').addEventListener('click', function(){
    if (!artifactNS) return;
    var o = readUpdate(), R = JSON.parse(JSON.stringify(RAW));
    Object.assign(R.spot, o.spot); Object.assign(R.fx, o.fx);
    var prev = JSON.parse(JSON.stringify(R.bajus.perVori));
    Object.assign(R.bajus.perVori, o.perVori); Object.assign(R.bajus.silverPerGram, o.silver);
    KARATS.forEach(function(k){ R.bajus.change[k.id] = Math.round(R.bajus.perVori[k.id] - prev[k.id]); });
    R.asOf = o.asOf; R.asOfLabel = o.asOfLabel;
    var lastB = R.bajus1y[R.bajus1y.length-1];
    if (o.asOf > lastB[0]) R.bajus1y.push([o.asOf, R.bajus.perVori.k22, 1]); else lastB[1] = R.bajus.perVori.k22;
    var lastS = R.spotDaily2026[R.spotDaily2026.length-1];
    if (o.asOf > lastS[0]) R.spotDaily2026.push([o.asOf, R.spot.usd]); else lastS[1] = R.spot.usd;
    if (R.changes[0][0] !== o.asOf && R.bajus.perVori.k22 !== prev.k22) R.changes.unshift([o.asOf, R.bajus.perVori.k22, R.bajus.perVori.k21, R.bajus.perVori.k18, R.bajus.perVori.trad, R.bajus.change.k22, R.bajus.change.k22 > 0 ? 'Raised' : 'Cut']);
    var json = JSON.stringify(R).replace(/</g, '\\u003c');
    var html = PRISTINE.replace(/<script id="bi-data" type="application\/json">[\s\S]*?<\/script>/, function(){ return '<script id="bi-data" type="application/json">\n' + json + '\n</scr' + 'ipt>'; });
    var btn = $('u-publish'); btn.disabled = true; setT('u-msg', 'Publishing\u2026');
    artifactNS.publish(html).then(function(){ try { localStorage.removeItem(LS_KEY); } catch (e) {} setT('u-msg', 'Published. The page is reloading with the new rates.'); }).catch(function(err){ btn.disabled = false; setT('u-msg', 'Could not publish' + (err && err.code ? ' (' + err.code + ')' : '') + '. The rates are still saved on this device.'); });
  });
}
function wireCaps(){
  if (!(window.claude && typeof window.claude.use === 'function')) { setT('upd-pub-note', 'to change the rates for every visitor, republish the page.'); return; }
  Promise.all([window.claude.use('artifact'), window.claude.use('user')]).then(function(res){
    var art = res[0], user = res[1];
    if (!art) return;
    return (user ? user.canEdit() : Promise.resolve(false)).then(function(can){ if (can) { artifactNS = art; $('u-publish').hidden = false; } });
  }).catch(function(){});
}

/* ---------- controls, theme, resize ---------- */
function wireSeg(id, attr, onPick){
  $(id).addEventListener('click', function(e){
    var b = e.target.closest('button'); if (!b) return;
    Array.prototype.forEach.call(this.querySelectorAll('button'), function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    onPick(b.dataset[attr]);
  });
}
function applyTheme(t){ if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; var btn = $('theme-btn'); if (btn) btn.textContent = t === 'dark' ? 'Light mode' : t === 'light' ? 'Follow system theme' : 'Dark mode'; }
function wireTheme(){
  var t = null; try { t = localStorage.getItem(LS_THEME); } catch (e) {}
  applyTheme(t);
  $('theme-btn').addEventListener('click', function(){
    var cur = document.documentElement.dataset.theme || 'system', next = cur === 'system' ? 'dark' : cur === 'dark' ? 'light' : 'system';
    try { if (next === 'system') localStorage.removeItem(LS_THEME); else localStorage.setItem(LS_THEME, next); } catch (e) {}
    applyTheme(next === 'system' ? null : next); renderHistory();
  });
  if (window.matchMedia) { try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(){ renderHistory(); }); } catch (e) {} }
}
var rt; window.addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(function(){ charts.forEach(function(c){ if (c._redraw) c._redraw(); }); }, 150); });

function renderAll(){ renderBoard(); renderGlobal(); renderBajus(); renderGrowth(); renderHistory(); renderCalc(); renderSell(); renderCoins(); renderPlanner(); fillUpdate(); }

build();
wireTheme();
wireSeg('g-range', 'r', function(v){ gRange = v; renderGlobal(); });
wireSeg('g-cur', 'c', function(v){ gCur = v; renderGlobal(); });
wireSeg('h-karat', 'k', function(v){ hKarat = v; renderHistory(); });
wireSeg('h-unit', 'u', function(v){ hUnit = v; renderHistory(); });
wireSeg('h-range', 'r', function(v){ hRange = v; renderHistory(); });
['cv-amt','cv-unit','cv-purity'].forEach(function(id){ $(id).addEventListener('input', renderConverter); $(id).addEventListener('change', renderConverter); });
['s-amt','s-unit','s-karat','s-ded'].forEach(function(id){ $(id).addEventListener('input', renderSell); $(id).addEventListener('change', renderSell); });
['p-amt','p-years'].forEach(function(id){ $(id).addEventListener('input', renderPlanner); });
wireCalc(); wireUpdate();
renderAll();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ charts.forEach(function(c){ if (c._redraw) c._redraw(); }); });
wireCaps();

  }, []);

  return (
    <>
      


<header className="top">
  <div className="wrap">
    <a className="brand" href="#top" aria-label="Bangla Invest home">
      <span className="en">Bangla Invest</span><span className="bn">বাংলা ইনভেস্ট</span>
    </a>
    <nav className="nav" aria-label="Sections">
      <a href="#today">Today</a>
      <a href="#global">World price</a>
      <a href="#bajus">BAJUS rate</a>
      <a href="#history">History</a>
      <a href="#calculator">Calculator</a>
      <a href="#sell">Selling</a>
      <a href="#coins">Coins &amp; bars</a>
      <a href="#invest">Investing</a>
      <a href="#faq">FAQ</a>
    </nav>
  </div>
</header>

<main id="top">

{/* ================= RATE BOARD ================= */}
<section className="board" id="today" aria-label="Today's gold rates">
  <div className="wrap">
    <div className="board-frame">
      <div className="board-head">
        <h1>Gold in Bangladesh today<span className="bn">আজকের সোনার দাম</span></h1>
        <div className="board-date"><span id="board-date">—</span><span id="board-stamp"></span></div>
      </div>
      <div className="board-grid">
        <div className="quote">
          <div className="lbl">BAJUS 22 karat hallmark, per vori<span className="bn">প্রতি ভরি</span></div>
          <div className="big" id="board-22">—</div>
          <div className="sub"><span id="board-22g">—</span><span className="chg" id="board-22chg">—</span></div>
        </div>
        <div className="quote">
          <div className="lbl">World spot gold, per troy ounce<span className="bn">আন্তর্জাতিক বাজার</span></div>
          <div className="big" id="board-spot">—</div>
          <div className="sub"><span className="chg" id="board-spotchg">—</span><span id="board-spotbdt">—</span></div>
        </div>
      </div>
      <div className="strip" id="board-strip"></div>
      <div className="premium" id="board-premium"></div>
    </div>
  </div>
</section>

{/* ================= WORLD PRICE ================= */}
<section className="sec" id="global">
  <div className="wrap">
    <div className="sec-head"><h2>World gold price</h2><span className="bn">বিশ্ববাজারে সোনার দাম</span></div>
    <p className="lede">Spot gold in US dollars, converted to Taka at the mid-market exchange rate. The chart follows daily closes through 28 September 2026; the live tick-by-tick chart is on <a href="https://www.kitco.com/charts/gold" target="_blank" rel="noopener">kitco.com</a> and <a href="https://goldprice.org/" target="_blank" rel="noopener">goldprice.org</a>.</p>

    <div className="panel">
      <div className="controls">
        <div className="seg" id="g-range" role="group" aria-label="Chart range">
          <button aria-pressed="false" data-r="1m">1 month</button>
          <button aria-pressed="false" data-r="ytd">2026</button>
          <button aria-pressed="true" data-r="1y">1 year</button>
          <button aria-pressed="false" data-r="5y">5 years</button>
          <button aria-pressed="false" data-r="all">Since 2000</button>
        </div>
        <div className="seg" id="g-cur" role="group" aria-label="Currency">
          <button aria-pressed="true" data-c="usd">USD</button>
          <button aria-pressed="false" data-c="bdt">Taka</button>
        </div>
      </div>
      <div className="chart" id="g-chart" aria-label="World gold price chart"></div>
      <div className="chart-foot"><span id="g-foot"></span><span>24 karat spot, USD per troy ounce · closes from Kitco, Trading Economics and exchange-rates.org</span></div>
    </div>

    <div className="grid2" style={{marginTop: "18px"}}>
      <div className="panel">
        <h3>World price in dollars and Taka<span className="bn">ডলার ও টাকায়</span></h3>
        <div className="tblwrap"><table className="tbl" id="g-table">
          <thead><tr><th>Unit</th><th>24K, USD</th><th>24K, Taka</th><th>22K, USD</th><th>22K, Taka</th></tr></thead>
          <tbody></tbody>
        </table></div>
        <p className="note">1 troy ounce = 31.1035 g = 2.667 vori. 1 vori = 11.664 g. Exchange rate used: <b id="g-fx">—</b>.</p>
      </div>
      <div className="panel">
        <h3>Convert instantly<span className="bn">সাথে সাথে রূপান্তর</span></h3>
        <div className="fields2">
          <div className="field"><label htmlFor="cv-amt">Amount</label><input id="cv-amt" type="number" inputmode="decimal" min="0" step="any" value="1" /></div>
          <div className="field"><label htmlFor="cv-unit">Unit</label>
            <select id="cv-unit">
              <option value="vori">vori · ভরি (11.664 g)</option>
              <option value="ana">ana · আনা</option>
              <option value="roti">roti · রতি</option>
              <option value="g">gram</option>
              <option value="oz">troy ounce</option>
              <option value="kg">kilogram</option>
            </select></div>
          <div className="field"><label htmlFor="cv-purity">Purity</label>
            <select id="cv-purity">
              <option value="k24">24K (99.9%)</option>
              <option value="k22" selected>22K (91.6%)</option>
              <option value="k21">21K (87.5%)</option>
              <option value="k18">18K (75%)</option>
            </select></div>
        </div>
        <div className="result">
          <div className="r"><div className="l">World price, dollars</div><div className="v" id="cv-usd">—</div></div>
          <div className="r"><div className="l">World price, Taka</div><div className="v" id="cv-bdt">—</div></div>
          <div className="r hero"><div className="l">At today's BAJUS rate in Bangladesh</div><div className="v" id="cv-bajus">—</div><div className="s" id="cv-bajus-s"></div></div>
        </div>
      </div>
    </div>
  </div>
</section>

{/* ================= BAJUS RATE ================= */}
<section className="sec" id="bajus">
  <div className="wrap">
    <div className="sec-head"><h2>BAJUS rate today</h2><span className="bn">বাজুস নির্ধারিত আজকের দাম</span></div>
    <p className="lede">The Bangladesh Jewellers Association announces the official jewellery rate for four purities. Rates include VAT; the making charge for a finished ornament is added by the shop. <span id="bajus-datenote"></span></p>
    <div className="grid4" id="bajus-cards"></div>

    <div className="grid2" style={{marginTop: "18px"}}>
      <div className="panel">
        <h3>Silver today<span className="bn">রুপার দাম</span></h3>
        <table className="tbl" id="silver-table">
          <thead><tr><th>Purity</th><th>Per gram</th><th>Per vori</th></tr></thead><tbody></tbody>
        </table>
      </div>
      <div className="panel">
        <h3>The vori, explained<span className="bn">ভরি, আনা, রতি, পয়েন্ট</span></h3>
        <table className="tbl">
          <thead><tr><th>Unit</th><th>Grams</th><th>Of a vori</th></tr></thead>
          <tbody>
            <tr><td>1 vori (bhori, tola) <span className="bn">ভরি</span></td><td>11.664 g</td><td>1</td></tr>
            <tr><td>1 ana <span className="bn">আনা</span></td><td>0.729 g</td><td>1⁄16</td></tr>
            <tr><td>1 roti <span className="bn">রতি</span></td><td>0.1215 g</td><td>1⁄96</td></tr>
            <tr><td>1 point <span className="bn">পয়েন্ট</span></td><td>0.01215 g</td><td>1⁄960</td></tr>
            <tr><td>1 troy ounce</td><td>31.1035 g</td><td>2.667</td></tr>
          </tbody>
        </table>
        <p className="note">Hallmarked 22K gold is stamped <b>916</b> (91.6% pure), 21K is 875 and 18K is 750. Traditional (Sanatan) gold is old, copper-alloyed ornament gold and is priced lowest.</p>
      </div>
    </div>
  </div>
</section>

{/* ================= HISTORY ================= */}
<section className="sec" id="history">
  <div className="wrap">
    <div className="sec-head"><h2>BAJUS rate history</h2><span className="bn">দামের ইতিহাস ২০০৭–২০২৬</span></div>
    <p className="lede">Every yearly figure below comes from the BAJUS announcement archive (971 records since 2007). Growth is measured against today's 22K rate per gram, so it updates whenever the rate does.</p>

    <div className="grid4" id="growth-cards"></div>

    <div className="panel" style={{marginTop: "18px"}}>
      <div className="controls">
        <div className="seg karat" id="h-karat" role="group" aria-label="Purity">
          <button aria-pressed="true" data-k="all">All</button>
          <button aria-pressed="false" data-k="k22" style={{'--kc': "var(--k22)"}}>22K</button>
          <button aria-pressed="false" data-k="k21" style={{'--kc': "var(--k21)"}}>21K</button>
          <button aria-pressed="false" data-k="k18" style={{'--kc': "var(--k18)"}}>18K</button>
          <button aria-pressed="false" data-k="trad" style={{'--kc': "var(--trad)"}}>Sanatan</button>
        </div>
        <div className="seg" id="h-unit" role="group" aria-label="Unit">
          <button aria-pressed="false" data-u="g">gram</button>
          <button aria-pressed="true" data-u="vori">vori</button>
          <button aria-pressed="false" data-u="oz">oz</button>
        </div>
        <div className="seg" id="h-range" role="group" aria-label="Range">
          <button aria-pressed="true" data-r="1y">1 year</button>
          <button aria-pressed="false" data-r="5y">5 years</button>
          <button aria-pressed="false" data-r="10y">10 years</button>
          <button aria-pressed="false" data-r="all">Since 2007</button>
        </div>
      </div>
      <div className="chart" id="h-chart" aria-label="BAJUS rate history chart"></div>
      <div className="legend" id="h-legend"></div>
      <div className="chart-foot"><span id="h-foot"></span><span>Source: BAJUS announcements via alaminjewellers.com</span></div>
    </div>

    <div className="grid2" style={{marginTop: "18px"}}>
      <div className="panel">
        <h3>Recent BAJUS announcements<span className="bn">সাম্প্রতিক পরিবর্তন</span></h3>
        <div className="tblwrap"><table className="tbl" id="changes-table">
          <thead><tr><th>Effective</th><th>22K</th><th>Change</th><th>21K</th><th>18K</th><th>Sanatan</th></tr></thead>
          <tbody></tbody>
        </table></div>
        <p className="note" id="tally-note"></p>
      </div>
      <div className="panel">
        <h3>22 karat, year by year<span className="bn">বছরভিত্তিক</span></h3>
        <div className="tblwrap"><table className="tbl" id="yearly-table">
          <thead><tr><th>Year</th><th>Low /g</th><th>High /g</th><th>Average /g</th><th>Year end /vori</th></tr></thead>
          <tbody></tbody>
        </table></div>
        <p className="note">Per gram in Taka. A year with fewer archived announcements has a coarser range; 2021 has a single record in the archive.</p>
      </div>
    </div>
  </div>
</section>

{/* ================= GOLD CALCULATOR ================= */}
<section className="sec" id="calculator">
  <div className="wrap">
    <div className="sec-head"><h2>Gold calculator</h2><span className="bn">সোনার হিসাব</span></div>
    <p className="lede">Type a weight in any unit and the others fill in. The value uses today's BAJUS rate for the purity you choose; add a making-charge percentage if you are pricing an ornament.</p>
    <div className="panel">
      <div className="fields">
        <div className="field"><label htmlFor="c-vori">Vori<span className="bn">ভরি</span></label><input id="c-vori" data-u="vori" type="number" inputmode="decimal" min="0" step="any" value="1" /></div>
        <div className="field"><label htmlFor="c-ana">Ana<span className="bn">আনা</span></label><input id="c-ana" data-u="ana" type="number" inputmode="decimal" min="0" step="any" value="0" /></div>
        <div className="field"><label htmlFor="c-roti">Roti<span className="bn">রতি</span></label><input id="c-roti" data-u="roti" type="number" inputmode="decimal" min="0" step="any" value="0" /></div>
        <div className="field"><label htmlFor="c-point">Point<span className="bn">পয়েন্ট</span></label><input id="c-point" data-u="point" type="number" inputmode="decimal" min="0" step="any" value="0" /></div>
        <div className="field"><label htmlFor="c-gram">Gram</label><input id="c-gram" data-u="g" type="number" inputmode="decimal" min="0" step="any" value="11.664" /></div>
        <div className="field"><label htmlFor="c-oz">Troy ounce</label><input id="c-oz" data-u="oz" type="number" inputmode="decimal" min="0" step="any" value="0.375" /></div>
        <div className="field"><label htmlFor="c-karat">Purity</label>
          <select id="c-karat">
            <option value="k22" selected>22K hallmark</option>
            <option value="k21">21K hallmark</option>
            <option value="k18">18K hallmark</option>
            <option value="trad">Traditional (Sanatan)</option>
            <option value="k24">24K equivalent</option>
          </select></div>
        <div className="field"><label htmlFor="c-mc">Making charge, %</label><input id="c-mc" type="number" inputmode="decimal" min="0" step="any" value="0" /></div>
      </div>
      <div className="chips" id="c-chips">
        <button data-g="11.664">1 vori</button><button data-g="5.832">8 ana (½ vori)</button><button data-g="2.916">4 ana</button><button data-g="0.729">1 ana</button><button data-g="1">1 gram</button><button data-g="10">10 gram</button><button data-g="31.1034768">1 oz</button><button data-g="116.64">10 vori</button>
      </div>
      <div className="result">
        <div className="r hero"><div className="l">Value at today's BAJUS rate</div><div className="v" id="c-value">—</div><div className="s" id="c-value-s"></div></div>
        <div className="r"><div className="l">Total weight</div><div className="v" id="c-grams">—</div><div className="s" id="c-breakdown"></div></div>
        <div className="r"><div className="l">In troy ounces · kilograms</div><div className="v" id="c-ozkg">—</div><div className="s" id="c-world"></div></div>
      </div>
    </div>
  </div>
</section>

{/* ================= SELLING CALCULATOR ================= */}
<section className="sec" id="sell">
  <div className="wrap">
    <div className="sec-head"><h2>Selling old gold</h2><span className="bn">পুরাতন সোনা বিক্রির হিসাব</span></div>
    <p className="lede">Under BAJUS rules a jeweller deducts 18% from the day's rate when buying old jewellery, or 12% when you exchange it for a new piece. Making charges and stone costs are never refunded.</p>
    <div className="panel">
      <div className="fields">
        <div className="field"><label htmlFor="s-amt">Weight</label><input id="s-amt" type="number" inputmode="decimal" min="0" step="any" value="1" /></div>
        <div className="field"><label htmlFor="s-unit">Unit</label>
          <select id="s-unit">
            <option value="vori" selected>vori · ভরি</option>
            <option value="ana">ana · আনা</option>
            <option value="roti">roti · রতি</option>
            <option value="point">point · পয়েন্ট</option>
            <option value="g">gram</option>
          </select></div>
        <div className="field"><label htmlFor="s-karat">Purity</label>
          <select id="s-karat">
            <option value="k22" selected>22K hallmark</option>
            <option value="k21">21K hallmark</option>
            <option value="k18">18K hallmark</option>
            <option value="trad">Traditional (Sanatan)</option>
          </select></div>
        <div className="field"><label htmlFor="s-ded">Deduction</label>
          <select id="s-ded">
            <option value="18" selected>Sell — 18% (BAJUS)</option>
            <option value="12">Exchange — 12% (BAJUS)</option>
            <option value="17">17% (some shops)</option>
            <option value="20">20%</option>
            <option value="6">6% (Gold Kinen in-app sale)</option>
            <option value="0">No deduction</option>
          </select></div>
      </div>
      <div className="result">
        <div className="r hero"><div className="l">You receive</div><div className="v" id="s-net">—</div><div className="s" id="s-net-s"></div></div>
        <div className="r"><div className="l">Gold value at today's rate</div><div className="v" id="s-gross">—</div></div>
        <div className="r"><div className="l">Deducted</div><div className="v" id="s-cut" style={{color: "var(--down)"}}>—</div></div>
      </div>
      <p className="note" id="s-note"></p>
    </div>
  </div>
</section>

{/* ================= COINS & BARS ================= */}
<section className="sec" id="coins">
  <div className="wrap">
    <div className="sec-head"><h2>Coins and bars in Bangladesh</h2><span className="bn">কয়েন ও বার</span></div>
    <p className="lede">Two hallmarked, certified 22K options for investors who want metal rather than ornaments. Gold value is computed from today's BAJUS 22K rate; each seller adds its own collection or making charge, so confirm the final price on their site before buying.</p>
    <div className="grid2">
      <div className="shop">
        <h3>Gold Kinen</h3>
        <div className="meta">Buy from ৳500 in the app; collect as bars or coins with insured delivery in 64 districts · <a href="https://instabuy.goldkinen.com/" target="_blank" rel="noopener">instabuy.goldkinen.com</a></div>
        <div className="tblwrap"><table className="tbl" id="gk-table">
          <thead><tr><th>Product (22K)</th><th>Gold value today</th><th>Dhaka home delivery</th></tr></thead><tbody></tbody>
        </table></div>
        <p className="note">Priced at the BAJUS 22K market rate shown in the app (<b id="gk-rate">—</b> per gram). Selling back: 6% charge for gold sold inside the app, 17% for bars and coins already collected. Auto-save plans run ৳1,000–50,000 a month.</p>
      </div>
      <div className="shop">
        <h3>Diamond World</h3>
        <div className="meta">22K gold coins in 1, 2, 4 and 8 gram sizes, with a gold-loan facility · <a href="https://www.diamondworldltd.com/gold/gold-coin" target="_blank" rel="noopener">diamondworldltd.com</a></div>
        <div className="tblwrap"><table className="tbl" id="dw-table">
          <thead><tr><th>Product (22K)</th><th>Gold value today</th><th>Per gram</th></tr></thead><tbody></tbody>
        </table></div>
        <p className="note">Diamond World lists the final coin price on each product page (gold value plus its making charge). Ask for the hallmark certificate and the day's rate printed on the invoice.</p>
      </div>
    </div>
    <div className="panel" style={{marginTop: "18px"}}>
      <h3>Coin or ornament?<span className="bn">কোনটা কিনবেন</span></h3>
      <div className="tblwrap"><table className="tbl">
        <thead><tr><th>Form</th><th>Buy premium over gold value</th><th>Sell-back deduction</th><th>Best for</th></tr></thead>
        <tbody>
          <tr><td>Jewellery from a BAJUS shop</td><td>Making charge, often 5–20% by design</td><td>18% sale · 12% exchange</td><td>Wearing; weddings</td></tr>
          <tr><td>Gold Kinen app balance</td><td>None beyond the daily rate</td><td>6% in-app</td><td>Small monthly saving</td></tr>
          <tr><td>Collected bar or coin</td><td>Collection and delivery charge</td><td>17% at Gold Kinen; 18% at shops</td><td>Holding physical metal</td></tr>
        </tbody>
      </table></div>
    </div>
  </div>
</section>

{/* ================= INVESTING ================= */}
<section className="sec" id="invest">
  <div className="wrap">
    <div className="sec-head"><h2>Gold as an investment</h2><span className="bn">বিনিয়োগ হিসেবে সোনা</span></div>
    <div className="facts" id="invest-facts"></div>
    <div className="grid2">
      <div className="prose">
        <h3>Why Bangladeshi savers keep gold</h3>
        <p>Gold in Taka has two engines. One is the world price, which rose from about $1,250 an ounce in 2016 to more than $5,000 at the January 2026 peak. The other is the Taka itself: a dollar cost about ৳85 in 2020 and costs ৳123 today, so the same ounce buys more Taka every year the currency slips. Together they explain why the BAJUS 22K rate has risen roughly <b id="inv-10y">—</b> in ten years while bank deposits paid single digits.</p>
        <p>Gold also carries no counterparty. A bank deposit is a promise; a hallmarked coin in your hand is not. That is why it behaves well in crises — 2020, 2022 and the 2026 Gulf conflict all pushed the local rate up.</p>
        <h3>What the sceptic should know</h3>
        <p>Gold pays no interest and swings hard. From the 29 January 2026 record of ৳2,86,001 a vori the rate fell to ৳2,20,858 by mid-July, a drop of 23%, before recovering. Anyone who bought at the top is still under water.</p>
        <p>The costs are large and front-loaded. Buy jewellery and you pay a making charge; sell it and the shop deducts 18%. The rate must rise about <b id="inv-be">22%</b> before an ornament bought today returns what you paid — coins and app balances narrow that gap but never remove it. Gold is a five-to-ten-year holding, not a trade.</p>
        <p>Finally, Bangladesh pays a premium. Today's 22K BAJUS rate is about <b id="inv-prem">—</b> above the world price for the same metal, once import duty, VAT and the local tejabi-gold market are counted. If the premium narrows, local gold can fall even while the world price holds.</p>
        <h3>A sensible place in a portfolio</h3>
        <ul>
          <li>Most planners suggest 5–15% of savings in gold — enough to matter in a bad year, not so much that a 20% dip hurts.</li>
          <li>Buy in instalments (monthly, by ana or by gram) rather than one lump; the 2026 chart shows why timing is a coin toss.</li>
          <li>Prefer hallmarked 916 coins or bars for pure investment; buy jewellery for wearing, and treat it as savings with a wide spread.</li>
          <li>Keep the cash memo: weight, karat and the day's rate on paper protects you at sale time.</li>
          <li>Zakat is due on gold above the nisab of 7.5 vori (87.48 g) at 2.5% a year — factor it into holding costs.</li>
        </ul>
        <p className="note">This page is information, not advice. It cannot tell you what next month holds, and neither can anyone else.</p>
      </div>
      <div>
        <div className="panel">
          <h2>Monthly gold saving planner<span className="bn">মাসিক সঞ্চয়</span></h2>
          <div className="fields2">
            <div className="field"><label htmlFor="p-amt">Amount each month, Taka</label><input id="p-amt" type="number" inputmode="numeric" min="0" step="500" value="5000" /></div>
            <div className="field"><label htmlFor="p-years">For how many years</label><input id="p-years" type="number" inputmode="numeric" min="1" max="40" step="1" value="5" /></div>
          </div>
          <div className="result">
            <div className="r"><div className="l">Gold bought each month at today's 22K rate</div><div className="v" id="p-month">—</div></div>
            <div className="r"><div className="l">After the period, at a flat rate</div><div className="v" id="p-total">—</div><div className="s" id="p-total-s"></div></div>
            <div className="r hero"><div className="l">If the last five years repeat</div><div className="v" id="p-proj">—</div><div className="s">Purely illustrative: the BAJUS rate rose <span id="p-5y">—</span> over the past five years (2020–2026). Past growth is not a forecast.</div></div>
          </div>
        </div>
        <div className="panel" style={{marginTop: "18px"}}>
          <h3>Before you buy<span className="bn">কেনার আগে</span></h3>
          <ul className="prose" style={{margin: "0", paddingLeft: "20px"}}>
            <li>Check today's BAJUS rate here or at bajus.org; shops must sell at it.</li>
            <li>Look for the hallmark stamp (916 / 875 / 750) and a certification card.</li>
            <li>Weigh the piece in front of you; deduct stones from the gold weight.</li>
            <li>Ask the making charge as a percentage before agreeing.</li>
            <li>Insist on a cash memo with weight, karat, rate and making charge.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</section>

{/* ================= FAQ ================= */}
<section className="sec" id="faq">
  <div className="wrap">
    <div className="sec-head"><h2>Questions people ask</h2><span className="bn">সাধারণ প্রশ্ন</span></div>
    <details className="faq"><summary>How many grams is a vori, an ana and a roti?</summary><div className="a"><p>One vori (also written bhori, and the same as a tola) is 11.664 grams. It divides into 16 ana of 0.729 g, each ana into 6 roti of 0.1215 g, and each roti into 10 point. So 1 vori = 16 ana = 96 roti = 960 point.</p></div></details>
    <details className="faq"><summary>Why is gold more expensive in Bangladesh than the world price?</summary><div className="a"><p>BAJUS sets its rate from the local tejabi (pure gold) market, not directly from London. Import duty, 5% VAT and the cost of bringing metal in mean a vori of 22K here costs a third more than the same weight at the international spot price converted to Taka. The premium moves; when it narrows, local prices fall even if world gold is flat.</p></div></details>
    <details className="faq"><summary>How often does the BAJUS rate change?</summary><div className="a"><p>Constantly. The association has adjusted gold 118 times so far in 2026 — 58 rises, 59 cuts and one VAT restructuring — usually announced in the morning and effective from 10 am at every member shop.</p></div></details>
    <details className="faq"><summary>Is there a 24 karat rate?</summary><div className="a"><p>BAJUS does not publish one because 99.9% gold is too soft for ornaments. The 24K figure on this page is the 22K rate divided by 22⁄24 — the equivalent local price per gram of pure metal, useful for comparing with bars sold abroad.</p></div></details>
    <details className="faq"><summary>What do I get back when I sell old gold?</summary><div className="a"><p>Under BAJUS rules a jeweller deducts 18% from the day's rate when buying old jewellery outright and 12% when you exchange it for a new piece. Making charges and stone costs are not returned. Use the selling calculator above to see the net amount.</p></div></details>
    <details className="faq"><summary>Is this a good time to buy?</summary><div className="a"><p>Nobody knows, and it is worth distrusting anyone who says they do. What the history section gives you is context: where today's rate sits against the past one, five and ten years, and how far it is below the January 2026 record. Most families buy for a wedding or as long-term savings, where the direction over a decade has mattered more than the week you chose.</p></div></details>
    <details className="faq"><summary>Where do these numbers come from?</summary><div className="a"><p>BAJUS rates and the 2007–2026 archive come from bajus.org via Al-Amin Jewellers' daily feed; the world spot price from Kitco and Trading Economics with 2026 daily closes from exchange-rates.org; the exchange rate is the mid-market USD/BDT rate; coin and bar details from Gold Kinen and Diamond World. All figures are as of the date shown at the top of the page.</p></div></details>
  </div>
</section>

{/* ================= UPDATE PANEL ================= */}
<section className="sec" id="update">
  <div className="wrap">
    <details className="upd" id="upd">
      <summary>Update today's rates on this page</summary>
      <p className="note" style={{marginTop: "8px"}}>Enter the latest figures from bajus.org, kitco.com and your exchange rate. Saving stores them in this browser only; <span id="upd-pub-note">publishing (page editors only) bakes them into the page for every visitor.</span></p>
      <div className="fields">
        <div className="field"><label htmlFor="u-date">Rate date</label><input id="u-date" type="text" placeholder="e.g. 29 September 2026" /></div>
        <div className="field"><label htmlFor="u-spot">Spot gold, USD per oz</label><input id="u-spot" type="number" inputmode="decimal" step="any" /></div>
        <div className="field"><label htmlFor="u-prev">Previous close, USD</label><input id="u-prev" type="number" inputmode="decimal" step="any" /></div>
        <div className="field"><label htmlFor="u-fx">USD to BDT</label><input id="u-fx" type="number" inputmode="decimal" step="any" /></div>
        <div className="field"><label htmlFor="u-k22">22K per vori, ৳</label><input id="u-k22" type="number" inputmode="numeric" step="1" /></div>
        <div className="field"><label htmlFor="u-k21">21K per vori, ৳</label><input id="u-k21" type="number" inputmode="numeric" step="1" /></div>
        <div className="field"><label htmlFor="u-k18">18K per vori, ৳</label><input id="u-k18" type="number" inputmode="numeric" step="1" /></div>
        <div className="field"><label htmlFor="u-trad">Sanatan per vori, ৳</label><input id="u-trad" type="number" inputmode="numeric" step="1" /></div>
        <div className="field"><label htmlFor="u-s22">22K silver per gram, ৳</label><input id="u-s22" type="number" inputmode="numeric" step="1" /></div>
        <div className="field"><label htmlFor="u-s21">21K silver per gram, ৳</label><input id="u-s21" type="number" inputmode="numeric" step="1" /></div>
        <div className="field"><label htmlFor="u-s18">18K silver per gram, ৳</label><input id="u-s18" type="number" inputmode="numeric" step="1" /></div>
        <div className="field"><label htmlFor="u-strad">Sanatan silver per gram, ৳</label><input id="u-strad" type="number" inputmode="numeric" step="1" /></div>
      </div>
      <div className="btnrow">
        <button className="btn" id="u-save">Save on this device</button>
        <button className="btn ghost" id="u-reset">Reset to published rates</button>
        <button className="btn" id="u-publish" hidden>Publish for everyone</button>
        <span className="msg" id="u-msg"></span>
      </div>
    </details>
  </div>
</section>

</main>

<footer>
  <div className="wrap">
    <div className="cols">
      <div>
        <div className="fbrand">Bangla Invest <span className="bn" style={{fontSize: "16px", color: "var(--gold-2)"}}>বাংলা ইনভেস্ট</span></div>
        <p style={{maxWidth: "60ch", margin: "8px 0 0"}}>A reference for gold buyers and savers in Bangladesh: the BAJUS rate in every local unit, the world price in dollars and Taka, nineteen years of history and the calculators you need before you buy or sell. Figures are as of <span id="foot-date">—</span>. Nothing here is investment advice; gold can fall as well as rise.
        <button className="theme-btn" id="theme-btn" type="button">Dark mode</button></p>
      </div>
      <div>
        <div style={{color: "var(--band-ink)", fontWeight: "500"}}>Sources</div>
        <ul>
          <li><a href="https://www.bajus.org/" target="_blank" rel="noopener">Bangladesh Jewellers Association (BAJUS)</a></li>
          <li><a href="https://www.alaminjewellers.com/gold-price/" target="_blank" rel="noopener">Al-Amin Jewellers — daily rate &amp; history</a></li>
          <li><a href="https://www.kitco.com/charts/gold" target="_blank" rel="noopener">Kitco — live gold chart</a></li>
          <li><a href="https://tradingeconomics.com/commodity/gold" target="_blank" rel="noopener">Trading Economics — gold</a></li>
          <li><a href="https://instabuy.goldkinen.com/" target="_blank" rel="noopener">Gold Kinen — bars &amp; coins</a></li>
          <li><a href="https://www.diamondworldltd.com/gold/gold-coin" target="_blank" rel="noopener">Diamond World — gold coins</a></li>
        </ul>
      </div>
    </div>
  </div>
</footer>


    </>
  );
}

export default App;
