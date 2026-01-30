const WRONG_KEY = "qb_wrong_v1"; // { [id]: {count:number, last:number} }

let ALL = [];
let POOL = [];
let current = null;
let locked = false;
let mode = "ALL"; // ALL | WRONG

const el = (id) => document.getElementById(id);

function loadWrongMap(){
  try { return JSON.parse(localStorage.getItem(WRONG_KEY) || "{}"); }
  catch { return {}; }
}
function saveWrongMap(map){
  localStorage.setItem(WRONG_KEY, JSON.stringify(map));
}
function markWrong(id){
  const map = loadWrongMap();
  if(!map[id]) map[id] = {count:0, last:0};
  map[id].count += 1;
  map[id].last = Date.now();
  saveWrongMap(map);
}
function clearWrong(){
  localStorage.removeItem(WRONG_KEY);
}

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}

function setPool(){
  if(mode === "WRONG"){
    const map = loadWrongMap();
    const wrongIds = new Set(Object.keys(map));
    POOL = ALL.filter(q => wrongIds.has(q.id));
  }else{
    POOL = [...ALL];
  }
  shuffle(POOL);
}

function updateStatus(){
  const map = loadWrongMap();
  const wrongCount = Object.keys(map).length;
  el("mode").textContent = `模式：${mode === "WRONG" ? "只練錯題" : "全部題目"}（錯題庫：${wrongCount}）`;
  el("progress").textContent = current ? `目前題號：${current.id}` : "";
}

// ✅ 新增：格式化題目來源顯示（衍生/原題 + 來源）
function formatSourceLine(q){
  const isDerived = (q.qtype === "derived");
  const tag = isDerived ? "【衍生題】" : "【原題】";
  const src = (q.origin || q.reference || "").trim();
  if(!src) return tag;                 // 沒有來源時至少顯示標籤
  return `${tag} 參考：${src}`;        // 有來源就顯示
}

function renderQuestion(q){
  current = q;
  locked = false;

  el("qid").textContent = `ID: ${q.id}`;

  // ✅ 改這裡：ref 顯示「原題/衍生題」+ 來源（origin 優先，沒有就用 reference）
  el("ref").textContent = formatSourceLine(q);

  el("stem").textContent = q.stem;

  const box = el("options");
  box.innerHTML = "";
  el("result").textContent = "";
  el("result").className = "result";
  el("explain").textContent = q.explanation || "（此題尚未提供詳解）";
  el("explainBox").open = false;

  q.options.forEach((opt) => {
    const btn = document.createElement("div");
    btn.className = "option";
    btn.dataset.key = opt.key;
    btn.innerHTML = `<strong>${opt.key}</strong>. ${opt.text}`;
    btn.addEventListener("click", () => onChoose(opt.key));
    box.appendChild(btn);
  });

  updateStatus();
}

function lockOptions(){
  locked = true;
  document.querySelectorAll(".option").forEach(x => x.classList.add("disabled"));
}

function highlight(correctKey, chosenKey){
  document.querySelectorAll(".option").forEach(node => {
    const k = node.dataset.key;
    if(k === correctKey) node.classList.add("correct");
    if(chosenKey && k === chosenKey && chosenKey !== correctKey) node.classList.add("wrong");
  });
}

function onChoose(key){
  if(!current || locked) return;
  lockOptions();

  const correct = current.answer;
  const ok = (key === correct);

  if(ok){
    el("result").textContent = `✅ 正確（${correct}）`;
    el("result").classList.add("ok");
  }else{
    el("result").textContent = `❌ 錯誤。正確答案是 ${correct}`;
    el("result").classList.add("bad");
    markWrong(current.id);
  }

  highlight(correct, key);
  el("explainBox").open = true;
  updateStatus();
}

function nextQuestion(){
  if(!POOL.length){
    el("stem").textContent = (mode === "WRONG")
      ? "目前沒有錯題可練（或尚未作答累積錯題）。"
      : "題庫載入失敗或沒有題目。";
    el("options").innerHTML = "";
    el("result").textContent = "";
    el("explain").textContent = "";
    el("qid").textContent = "";
    el("ref").textContent = "";
    return;
  }
  const q = POOL.pop();
  renderQuestion(q);
}

async function init(){
  const res = await fetch("data/questions.json", {cache:"no-store"});
  ALL = await res.json();

  setPool();
  nextQuestion();

  el("btn-random").addEventListener("click", () => {
    if(!POOL.length) setPool();
    nextQuestion();
  });

  el("btn-wrong").addEventListener("click", () => {
    mode = "WRONG";
    setPool();
    nextQuestion();
  });

  el("btn-all").addEventListener("click", () => {
    mode = "ALL";
    setPool();
    nextQuestion();
  });

  el("btn-clear").addEventListener("click", () => {
    clearWrong();
    if(mode === "WRONG"){
      setPool();
      nextQuestion();
    }else{
      updateStatus();
    }
  });
}

init().catch(err => {
  console.error(err);
  el("stem").textContent = "載入題庫失敗：請確認 data/questions.json 路徑與 GitHub Pages 設定。";
});
