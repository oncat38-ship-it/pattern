const STORAGE_KEY = "numberAnalysisDataV1";

const patternMap = {
  1: ["a", "d"], 2: ["a", "e"], 3: ["a", "f"],
  4: ["b", "d"], 5: ["b", "e"], 6: ["b", "f"],
  7: ["c", "d"], 8: ["c", "e"], 9: ["c", "f"],
  0: []
};

let history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

const $ = id => document.getElementById(id);

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function addNumber(n) {
  history.push(n);
  save();
  render();
}

function undo() {
  if (!history.length) return;
  history.pop();
  save();
  render();
}

function resetAll() {
  if (!history.length) return;
  if (!confirm("記録したデータをすべて削除しますか？")) return;
  history = [];
  save();
  render();
}

function countsFor(list) {
  const counts = {};
  list.forEach(x => counts[x] = (counts[x] || 0) + 1);
  return counts;
}

function theoreticalRate(n) {
  return n === 0 ? 100 / 37 : 400 / 37;
}

function patternFor(n) {
  // 数字1つに対して、横グループと縦グループを持つ
  return patternMap[n] || [];
}

function renderStats() {
  const counts = countsFor(history);
  const total = history.length;
  const body = $("statsBody");
  body.innerHTML = "";

  for (let n = 0; n <= 9; n++) {
    const count = counts[n] || 0;
    const actual = total ? count / total * 100 : 0;
    const theoretical = theoreticalRate(n);
    const diff = actual - theoretical;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${n}</td>
      <td>${count}</td>
      <td>${actual.toFixed(2)}%</td>
      <td>${theoretical.toFixed(2)}%</td>
      <td>${diff >= 0 ? "+" : ""}${diff.toFixed(2)}pt</td>
    `;
    body.appendChild(tr);
  }

  if (!total) {
    $("topNumber").textContent = "-";
    $("candidateNumber").textContent = "-";
    return;
  }

  const sorted = [...Array(10).keys()].sort((a,b) => {
    return (counts[b] || 0) - (counts[a] || 0);
  });
  $("topNumber").textContent = sorted[0];

  // 第1版の暫定候補：
  // 「理論率に対して現在もっとも不足している数字」を候補とする。
  const candidates = [...Array(10).keys()].sort((a,b) => {
    const da = (counts[a] || 0) / total - theoreticalRate(a) / 100;
    const db = (counts[b] || 0) / total - theoreticalRate(b) / 100;
    return da - db;
  });
  $("candidateNumber").textContent = candidates[0];
}

function renderPatterns() {
  const total = history.length;
  const patternCounts = {a:0,b:0,c:0,d:0,e:0,f:0};

  history.forEach(n => {
    patternFor(n).forEach(p => patternCounts[p]++);
  });

  const body = $("patternBody");
  body.innerHTML = "";

  for (const p of ["a","b","c","d","e","f"]) {
    // 各数字は横・縦の2パターンに属するため、ここでの分母は
    // 「数字記録数」ではなく「パターン所属数」として表示する。
    const count = patternCounts[p];
    const rate = total ? count / total * 100 : 0;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${p}</td><td>${count}</td><td>${rate.toFixed(2)}%</td>`;
    body.appendChild(tr);
  }

  $("numberHistory").textContent =
    history.length ? history.join(" → ") : "まだありません";

  const patternHistory = history.map(n => {
    const p = patternFor(n);
    return p.length ? p.join("/") : "0";
  });
  $("patternHistory").textContent =
    patternHistory.length ? patternHistory.join(" → ") : "まだありません";
}

function drawChart() {
  const canvas = $("trendChart");
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const w = rect.width;
  const h = rect.height;
  ctx.clearRect(0,0,w,h);

  if (!history.length) {
    ctx.fillStyle = "#6b7280";
    ctx.font = "14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("データを入力すると推移が表示されます", w/2, h/2);
    return;
  }

  const values = history.slice(-50);
  const pad = {l:30,r:15,t:20,b:30};
  const cw = w-pad.l-pad.r;
  const ch = h-pad.t-pad.b;

  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 1;
  for (let i=0; i<=9; i++) {
    const y = pad.t + ch - (i/9)*ch;
    ctx.beginPath();
    ctx.moveTo(pad.l,y);
    ctx.lineTo(w-pad.r,y);
    ctx.stroke();
    ctx.fillStyle = "#6b7280";
    ctx.font = "10px system-ui";
    ctx.textAlign = "right";
    ctx.fillText(String(i), pad.l-5, y+3);
  }

  ctx.strokeStyle = "#374151";
  ctx.lineWidth = 2;
  ctx.beginPath();
  values.forEach((v,i) => {
    const x = values.length === 1 ? pad.l + cw/2 :
      pad.l + (i/(values.length-1))*cw;
    const y = pad.t + ch - (v/9)*ch;
    if (i === 0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  });
  ctx.stroke();

  ctx.fillStyle = "#374151";
  values.forEach((v,i) => {
    const x = values.length === 1 ? pad.l + cw/2 :
      pad.l + (i/(values.length-1))*cw;
    const y = pad.t + ch - (v/9)*ch;
    ctx.beginPath();
    ctx.arc(x,y,3,0,Math.PI*2);
    ctx.fill();
  });

  ctx.fillStyle = "#6b7280";
  ctx.font = "10px system-ui";
  ctx.textAlign = "left";
  ctx.fillText(`直近${values.length}件`, pad.l, h-8);
}

function render() {
  $("recordCount").textContent = history.length;
  renderStats();
  renderPatterns();
  drawChart();
}

for (let n=0; n<=9; n++) {
  const btn = document.createElement("button");
  btn.className = "number-btn" + (n === 0 ? " zero" : "");
  btn.textContent = n;
  btn.addEventListener("click", () => addNumber(n));
  $("numberGrid").appendChild(btn);
}

$("undoBtn").addEventListener("click", undo);
$("resetBtn").addEventListener("click", resetAll);
window.addEventListener("resize", drawChart);

render();
