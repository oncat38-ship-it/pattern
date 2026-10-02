const KEY = "numberAnalysisDataV2";
const digits = [...Array(10).keys()];
const patterns = {
  a:[1,2,3], b:[4,5,6], c:[7,8,9],
  d:[1,4,7], e:[2,5,8], f:[3,6,9]
};
const theoretical = [1,4,4,4,4,4,4,4,4,4];
const totalWeight = 37;

let history = JSON.parse(localStorage.getItem(KEY) || "[]");
const $ = id => document.getElementById(id);

function save(){ localStorage.setItem(KEY, JSON.stringify(history)); }
function countDigits(){
  const c=Array(10).fill(0);
  history.forEach(n=>{ if(Number.isInteger(n)&&n>=0&&n<=9)c[n]++; });
  return c;
}
function rate(n,total=history.length){ return total ? n/total*100 : 0; }
function patternOf(n){
  return Object.entries(patterns).filter(([_,arr])=>arr.includes(n)).map(([k])=>k);
}

function addDigit(n){
  history.push(n); save(); render();
}
function undo(){
  if(!history.length)return;
  history.pop(); save(); render();
}
function resetAll(){
  if(!history.length)return;
  if(confirm("記録をすべてリセットしますか？")){
    history=[]; save(); render();
  }
}

function renderButtons(){
  $("digitButtons").innerHTML = digits.map(n =>
    `<button class="digit-btn" data-digit="${n}">${n}</button>`).join("");
  document.querySelectorAll(".digit-btn").forEach(btn=>{
    btn.addEventListener("click",()=>addDigit(Number(btn.dataset.digit)));
  });
}

function renderSummary(){
  const c=countDigits();
  const total=history.length;
  const most = total ? c.indexOf(Math.max(...c)) : null;
  $("summary").innerHTML = `
    <div class="stat"><div class="label">総記録数</div><div class="value">${total}</div></div>
    <div class="stat"><div class="label">最多出現</div><div class="value">${most===null?"—":most}</div></div>
    <div class="stat"><div class="label">0の出現率</div><div class="value">${rate(c[0]).toFixed(2)}%</div></div>
    <div class="stat"><div class="label">1〜9の理論率</div><div class="value">10.81%</div></div>
    <div class="stat"><div class="label">0の理論率</div><div class="value">2.70%</div></div>
    <div class="stat"><div class="label">最終記録</div><div class="value">${total?history[total-1]:"—"}</div></div>`;
}

function renderRates(){
  const c=countDigits(), total=history.length;
  $("rateTable").innerHTML = `
  <tr><th>数字</th><th>回数</th><th>実測率</th><th>理論率</th><th>差</th></tr>` +
  digits.map(n=>{
    const actual=rate(c[n]), theo=theoretical[n]/totalWeight*100, diff=actual-theo;
    return `<tr><td><b>${n}</b></td><td>${c[n]}</td><td>${actual.toFixed(2)}%</td>
      <td>${theo.toFixed(2)}%</td><td>${diff>=0?"+":""}${diff.toFixed(2)}pt</td></tr>`;
  }).join("");
}

function renderPatterns(){
  const c=countDigits(), total=history.length;
  const rows = Object.entries(patterns).map(([p,arr])=>{
    const cnt=arr.reduce((s,n)=>s+c[n],0);
    return `<tr><td><b>${p}</b></td><td>${arr.join(", ")}</td><td>${cnt}</td><td>${rate(cnt)}</td></tr>`;
  }).join("");
  $("patternTable").innerHTML =
    `<tr><th>パターン</th><th>対象数字</th><th>回数</th><th>出現率</th></tr>${rows}`;
}

function transitionCounts(from){
  const c=Array(10).fill(0), totalByFrom = history.reduce((s,n,i)=>{
    if(i>0 && history[i-1]===from) s++; return s;
  },0);
  for(let i=1;i<history.length;i++){
    if(history[i-1]===from)c[history[i]]++;
  }
  return {c,total:totalByFrom};
}

function renderTransition(){
  const sel=$("fromDigit");
  if(!sel.options.length) sel.innerHTML=digits.map(n=>`<option value="${n}">${n}</option>`).join("");
  const from=Number(sel.value);
  const {c,total}=transitionCounts(from);
  const ranked=digits.map(n=>({n,count:c[n],rate:rate(c[n],total)}))
    .sort((a,b)=>b.count-a.count || a.n-b.n);
  const best=ranked.filter(x=>x.count>0).slice(0,3);

  $("transitionSummary").innerHTML = total
    ? `<p>「${from}」の次に記録されたデータ：<b>${total}回</b></p>
       <div class="candidate-list">${best.map((x,i)=>
       `<div class="candidate-item"><strong>${i+1}位 ${x.n}</strong>${x.count}回（${x.rate.toFixed(2)}%）</div>`).join("")}</div>`
    : `<div class="empty">「${from}」の次のデータはまだありません。</div>`;

  $("transitionTable").innerHTML =
    `<tr><th>次の数字</th><th>回数</th><th>割合</th></tr>` +
    ranked.map(x=>`<tr><td><b>${x.n}</b></td><td>${x.count}</td><td>${x.rate.toFixed(2)}%</td></tr>`).join("");
}

function renderCandidate(){
  const c=countDigits(), total=history.length;
  if(!total){$("candidate").innerHTML='<div class="empty">まだデータがありません。</div>';return;}
  const scored=digits.map(n=>{
    const actual=c[n]/total;
    const theo=theoretical[n]/totalWeight;
    return {n,score:actual-theo,actual,theo,count:c[n]};
  }).sort((a,b)=>a.score-b.score);
  $("candidate").innerHTML =
    `<div class="candidate-list">${scored.slice(0,3).map((x,i)=>
      `<div class="candidate-item"><strong>${i+1}位 ${x.n}</strong>
       実測 ${rate(x.actual*total).toFixed(2)}% ／ 理論 ${rate(x.theo*total).toFixed(2)}%
       <br><span class="small">理論値との差 ${x.score>=0?"+":""}${(x.score*100).toFixed(2)}pt</span></div>`
    ).join("")}</div>`;
}

function renderHistory(){
  $("history").innerHTML = history.length
    ? history.map(n=>`<span>${n}</span>`).join("")
    : '<div class="empty">まだ記録がありません。</div>';
}

function renderChart(){
  const canvas=$("trendChart"), ctx=canvas.getContext("2d");
  const dpr=window.devicePixelRatio||1;
  const rect=canvas.getBoundingClientRect();
  canvas.width=rect.width*dpr; canvas.height=240*dpr; ctx.scale(dpr,dpr);
  const w=rect.width,h=240;
  ctx.clearRect(0,0,w,h);
  const recent=history.slice(-50);
  ctx.strokeStyle="#ddd"; ctx.lineWidth=1;
  for(let i=0;i<=10;i++){
    const y=20+i*(h-45)/10;
    ctx.beginPath();ctx.moveTo(35,y);ctx.lineTo(w-10,y);ctx.stroke();
  }
  if(recent.length<2){
    ctx.fillStyle="#777";ctx.font="14px sans-serif";ctx.fillText("2件以上記録すると推移を表示します。",45,120);return;
  }
  const xstep=(w-55)/(recent.length-1);
  ctx.strokeStyle="#555";ctx.lineWidth=2;ctx.beginPath();
  recent.forEach((n,i)=>{
    const x=35+i*xstep, y=20+(9-n)*(h-45)/9;
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  });
  ctx.stroke();
  ctx.fillStyle="#333";ctx.font="12px sans-serif";
  ctx.fillText("9",8,28);ctx.fillText("0",8,h-22);
}

function render(){
  renderButtons(); renderSummary(); renderRates(); renderPatterns();
  renderTransition(); renderCandidate(); renderHistory(); renderChart();
}
$("undoBtn").addEventListener("click",undo);
$("resetBtn").addEventListener("click",resetAll);
$("fromDigit").addEventListener("change",renderTransition);
window.addEventListener("resize",renderChart);
render();
