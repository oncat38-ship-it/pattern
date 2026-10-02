const KEY = "numberAnalysisDataV2";
const digits = [...Array(10).keys()];
const patterns = {
  a:[1,2,3], b:[4,5,6], c:[7,8,9],
  d:[1,4,7], e:[2,5,8], f:[3,6,9]
};
const theoretical = [1,4,4,4,4,4,4,4,4,4];
const totalWeight = 37;

let history = [];
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
  if (Array.isArray(saved)) history = saved.filter(n => Number.isInteger(n) && n >= 0 && n <= 9);
} catch(e) {
  history = [];
}
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
  document.querySelectorAll(".digit-btn").forEach(btn=>{
    btn.onclick = () => addDigit(Number(btn.dataset.digit));
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

function recentRateForDigit(n, windowSize=20, offset=0){
  const end = history.length - offset;
  const start = Math.max(0, end-windowSize);
  const arr = history.slice(start,end);
  if(!arr.length) return 0;
  return arr.filter(x=>x===n).length/arr.length*100;
}

function trendForDigit(n){
  if(history.length < 6) return {symbol:"→", diff:0, label:"データ不足"};
  const recent = recentRateForDigit(n,20,0);
  const previous = recentRateForDigit(n,20,20);
  const diff = recent-previous;
  if(diff >= 3) return {symbol:"↗",diff,label:"最近増加"};
  if(diff <= -3) return {symbol:"↘",diff,label:"最近減少"};
  return {symbol:"→",diff,label:"変化小"};
}

function renderNumberMap(){
  const c=countDigits(), total=history.length;
  const expected=10.8108108108;
  const cells=digits.slice(1).map(n=>{
    const actual=rate(c[n]);
    const delta=actual-expected;
    const t=trendForDigit(n);
    // Visual intensity based on difference from theoretical rate.
    const intensity=Math.min(0.55, Math.abs(delta)/12);
    const bg=delta>=0
      ? `rgba(80,80,80,${0.06+intensity})`
      : `rgba(170,170,170,${0.06+intensity})`;
    return `<button class="number-cell" data-map-digit="${n}" style="background:${bg}">
      <span class="num">${n}</span>
      <span class="trend" title="${t.label}">${t.symbol}</span>
      <div class="count">${c[n]}回</div>
      <div class="actual">${actual.toFixed(2)}%</div>
      <div class="expected">期待 ${expected.toFixed(2)}%</div>
      <div class="delta">差 ${delta>=0?"+":""}${delta.toFixed(2)}pt</div>
    </button>`;
  }).join("");
  $("numberMap").innerHTML=cells;

  document.querySelectorAll("[data-map-digit]").forEach(btn=>{
    btn.onclick=()=>renderMapDetail(Number(btn.dataset.mapDigit));
  });

  if(total) renderMapDetail(1);
  else $("mapDetail").innerHTML='<div class="empty">数字を記録すると、選択したマスの詳細が表示されます。</div>';
}

function renderMapDetail(n){
  const c=countDigits(), total=history.length;
  const actual=rate(c[n]), expected=10.8108108108;
  const t=trendForDigit(n);
  const recent20=recentRateForDigit(n,20,0);
  const prev20=recentRateForDigit(n,20,20);
  const next=history.length>0 ? transitionCounts(n) : {c:Array(10).fill(0),total:0};
  const nextRank=digits.map(d=>({d,count:next.c[d]}))
    .filter(x=>x.count>0).sort((a,b)=>b.count-a.count).slice(0,3);
  $("mapDetail").innerHTML=`
    <div><b>${n} の詳細</b></div>
    <div class="detail-grid">
      <div class="detail-item"><b>累計出現率</b><span>${actual.toFixed(2)}%</span></div>
      <div class="detail-item"><b>期待率</b><span>${expected.toFixed(2)}%</span></div>
      <div class="detail-item"><b>期待値との差</b><span>${actual-expected>=0?"+":""}${(actual-expected).toFixed(2)}pt</span></div>
      <div class="detail-item"><b>最近の変化</b><span>${t.symbol} ${t.diff>=0?"+":""}${t.diff.toFixed(2)}pt</span></div>
      <div class="detail-item"><b>直近20回</b><span>${recent20.toFixed(2)}%</span></div>
      <div class="detail-item"><b>その前の20回</b><span>${prev20.toFixed(2)}%</span></div>
    </div>
    <p class="small">「${n}」の次に出た数字：${next.total}回</p>
    ${nextRank.length ? `<p class="small">主な遷移：${nextRank.map(x=>`${x.d}（${x.count}回）`).join("　")}</p>` : ""}
  `;
}

function intervalData(n){
  const positions=[];
  history.forEach((x,i)=>{if(x===n)positions.push(i);});
  const gaps=[];
  for(let i=1;i<positions.length;i++) gaps.push(positions[i]-positions[i-1]-1);
  return {positions,gaps};
}

function renderIntervals(){
  const sel=$("intervalDigit");
  if(!sel.options.length) sel.innerHTML=digits.map(n=>`<option value="${n}">${n}</option>`).join("");
  const n=Number(sel.value);
  const {positions,gaps}=intervalData(n);
  if(!positions.length){
    $("intervalSummary").innerHTML=`<div class="empty">「${n}」はまだ出現していません。</div>`;
    $("intervalList").innerHTML="";
    return;
  }
  const lastGap=positions.length>=2 ? gaps[gaps.length-1] : null;
  const avg=gaps.length ? gaps.reduce((a,b)=>a+b,0)/gaps.length : null;
  const min=gaps.length ? Math.min(...gaps) : null;
  const max=gaps.length ? Math.max(...gaps) : null;
  $("intervalSummary").innerHTML=`
    <div class="stats">
      <div class="stat"><div class="label">出現回数</div><div class="value">${positions.length}</div></div>
      <div class="stat"><div class="label">直近の間隔</div><div class="value">${lastGap===null?"—":lastGap+"回"}</div></div>
      <div class="stat"><div class="label">平均間隔</div><div class="value">${avg===null?"—":avg.toFixed(1)+"回"}</div></div>
      <div class="stat"><div class="label">最短</div><div class="value">${min===null?"—":min+"回"}</div></div>
      <div class="stat"><div class="label">最長</div><div class="value">${max===null?"—":max+"回"}</div></div>
      <div class="stat"><div class="label">現在からの経過</div><div class="value">${history.length-1-positions[positions.length-1]}回</div></div>
    </div>`;
  if(gaps.length){
    const maxGap=Math.max(...gaps,1);
    $("intervalList").innerHTML=`<table class="interval-table">
      <tr><th>順番</th><th>間隔</th><th>簡易表示</th></tr>
      ${gaps.slice().reverse().slice(0,20).map((g,i)=>
        `<tr><td>${gaps.length-i}回目</td><td>${g}回</td><td><div class="interval-bar"><span style="width:${Math.min(100,g/maxGap*100)}%"></span></div></td></tr>`
      ).join("")}
    </table>`;
  } else $("intervalList").innerHTML='<div class="empty">2回以上出現すると間隔を計算できます。</div>';
}


function transitionProbability(from,to){
  const {c,total}=transitionCounts(from);
  return {count:c[to], total, rate:total?c[to]/total*100:0};
}

function sequenceMatchScore(to, maxLen=5){
  // Find historical occurrences where the recent suffix matches a prior suffix.
  const L=Math.min(maxLen,history.length-1);
  if(L<2) return {score:0,count:0,matched:0};
  const recent=history.slice(-L);
  let hits=0, total=0;
  for(let i=L;i<history.length-0;i++){
    if(i+1>=history.length) break;
    const start=i-L;
    if(start<0) continue;
    const seq=history.slice(start,i);
    if(seq.length===L && seq.every((v,j)=>v===recent[j])){
      total++;
      if(history[i]===to) hits++;
    }
  }
  return {score:total?hits/total:0,count:total,matched:hits};
}

function intervalSignal(to){
  const {positions,gaps}=intervalData(to);
  if(!positions.length || !gaps.length) return {score:0,label:"間隔データ不足"};
  const current=history.length-1-positions[positions.length-1];
  const avg=gaps.reduce((a,b)=>a+b,0)/gaps.length;
  if(avg<=0) return {score:0,label:""};
  const ratio=current/avg;
  return {
    score:Math.max(-1,Math.min(1,(ratio-1))),
    label:`現在${current}回経過 / 平均${avg.toFixed(1)}回`
  };
}

function candidateScores(){
  const total=history.length;
  if(total<3) return [];
  const c=countDigits();
  const last=history[history.length-1];

  // Separate components. Later versions can learn/calibrate these weights from actual results.
  const rows=digits.map(n=>{
    const expected=theoretical[n]/totalWeight*100;
    const actual=rate(c[n]);
    const balance=Math.max(-1,Math.min(1,(expected-actual)/Math.max(expected,1)));
    const trans=transitionProbability(last,n);
    const transScore=trans.total ? Math.min(1,trans.rate/Math.max(1,100/10)) : 0;

    const seqs=[];
    for(let len=2;len<=Math.min(5,total-1);len++){
      const s=sequenceMatchScore(n,len);
      if(s.count) seqs.push({len,...s});
    }
    const bestSeq=seqs.length ? seqs.reduce((a,b)=>b.score>a.score?b:a) : {score:0,count:0,len:0};
    const interval=intervalSignal(n);

    // Recent change: compare last 20 and previous 20.
    const recent=recentRateForDigit(n,20,0);
    const previous=recentRateForDigit(n,20,20);
    const recentSignal=Math.max(-1,Math.min(1,(recent-previous)/20));

    // Base weights are intentionally transparent.
    const score =
      balance*25 +
      transScore*35 +
      bestSeq.score*25 +
      recentSignal*10 +
      interval.score*5;

    return {
      n,score,balance,actual,expected,
      transRate:trans.rate,transCount:trans.count,transTotal:trans.total,
      seq:bestSeq,recent,previous,recentSignal,interval:interval.label
    };
  });
  return rows.sort((a,b)=>b.score-a.score);
}

function renderTransitionMap(){
  const sel=$("transitionMapDigit");
  if(!sel.options.length) sel.innerHTML=digits.map(n=>`<option value="${n}">${n}</option>`).join("");
  const from=Number(sel.value);
  const {c,total}=transitionCounts(from);
  const ranked=digits.slice(1).map(n=>({n,count:c[n]})).sort((a,b)=>b.count-a.count);
  const top=ranked.filter(x=>x.count>0).slice(0,3);
  const topNums=top.map(x=>x.n);

  $("transitionMap").innerHTML=digits.slice(1).map(n=>{
    const count=c[n], pct=total?count/total*100:0;
    const intensity=Math.min(.55,count?0.06+count/Math.max(1,total)*2:0);
    const bg=`rgba(80,80,80,${intensity})`;
    const arrow=topNums.indexOf(n);
    return `<button class="number-cell transition-map-cell" data-tmap="${n}" style="background:${bg}">
      <span class="num">${n}</span>
      ${arrow>=0?`<span class="arrow">${arrow===0?"↗":arrow===1?"→":"·"}</span>`:""}
      <div class="count">${count}回</div>
      <div class="actual">${pct.toFixed(1)}%</div>
      <div class="expected">「${from}」→${n}</div>
    </button>`;
  }).join("");

  document.querySelectorAll("[data-tmap]").forEach(btn=>{
    btn.onclick=()=>renderTransitionMapDetail(from,Number(btn.dataset.tmap));
  });
  renderTransitionMapDetail(from,top.length?top[0].n:1);
}

function renderTransitionMapDetail(from,to){
  const p=transitionProbability(from,to);
  $("transitionMapDetail").innerHTML=`
    <div><b>${from} → ${to}</b></div>
    <div class="detail-grid">
      <div class="detail-item"><b>遷移回数</b><span>${p.count}回</span></div>
      <div class="detail-item"><b>遷移率</b><span>${p.rate.toFixed(2)}%</span></div>
      <div class="detail-item"><b>直前の数字</b><span>${from}</span></div>
      <div class="detail-item"><b>次の数字</b><span>${to}</span></div>
    </div>`;
}

function renderAdvancedCandidates(){
  const rows=candidateScores();
  if(!rows.length){
    $("advancedCandidates").innerHTML='<div class="empty">3件以上のデータを入力すると候補分析を表示します。</div>';
    return;
  }
  const top=rows.slice(0,5);
  const max=Math.max(...top.map(x=>x.score),1);
  $("advancedCandidates").innerHTML=top.map((x,i)=>{
    const seqText=x.seq.count
      ? `${x.seq.len}連続一致：${x.seq.matched}/${x.seq.count}回`
      : "過去の連続パターンなし";
    return `<div class="candidate-score">
      <div class="head"><span>${i+1}位　${x.n}</span><span>${x.score.toFixed(1)}</span></div>
      <div class="scorebar"><span style="width:${Math.max(0,Math.min(100,x.score/max*100))}%"></span></div>
      <ul class="reason-list">
        <li>直前の${history[history.length-1]}→${x.n}：${x.transCount}回 / ${x.transRate.toFixed(1)}%</li>
        <li>${seqText}</li>
        <li>累計：${x.actual.toFixed(1)}%（期待 ${x.expected.toFixed(1)}%）</li>
        <li>最近：${x.recent.toFixed(1)}%（その前 ${x.previous.toFixed(1)}%）</li>
        <li>間隔：${x.interval}</li>
      </ul>
    </div>`;
  }).join("")+
  `<p class="weight-note">現在の試験版は、遷移35・連続パターン25・期待値差25・最近の変化10・間隔5の重みです。今後、過去データを使った検証で重みを調整できます。</p>`;
}

function render(){
  renderButtons(); renderSummary(); renderRates(); renderPatterns();
  renderNumberMap(); renderIntervals(); renderTransition();
  renderTransitionMap(); renderAdvancedCandidates();
  renderCandidate(); renderHistory(); renderChart();
}
$("undoBtn").addEventListener("click",undo);
$("resetBtn").addEventListener("click",resetAll);
$("fromDigit").addEventListener("change",renderTransition);
$("intervalDigit").addEventListener("change",renderIntervals);
$("transitionMapDigit").addEventListener("change",renderTransitionMap);
window.addEventListener("resize",renderChart);
render();
