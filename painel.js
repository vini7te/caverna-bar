// Painel do bar: fila de chamados + planta do salão. Exige login de alguém cadastrado em "equipe".
import { app, db, configurado } from "./firebase.js";
import { MESAS, TIPOS } from "./mesas.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, doc, getDoc, onSnapshot, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const LOGO = "logo.webp";
const root = document.getElementById("app");
let calls = {}, known = null, open = null, soundOn = false, audioCtx = null, unsub = null, state = "loading", user = null;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ms = (c) => (c.desde && c.desde.toMillis ? c.desde.toMillis() : Date.now());
function ago(t) {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return s + "s";
  const m = Math.floor(s / 60);
  return m < 60 ? m + " min" : Math.floor(m / 60) + "h" + String(m % 60).padStart(2, "0");
}

function beep() {
  if (!soundOn || !audioCtx) return;
  [0, 0.22].forEach((t) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = "triangle"; o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
    const s = audioCtx.currentTime + t;
    g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.5, s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.18);
    o.start(s); o.stop(s + 0.2);
  });
  try { navigator.vibrate && navigator.vibrate([120, 60, 120]); } catch (e) {}
}

// ---------- telas ----------
function loginView(msg) {
  root.innerHTML = '<main class="wrap"><div class="login"><img src="' + LOGO + '" alt="Caverna"><h1>Painel do bar</h1>' +
    '<form id="f"><label>E-mail<input id="email" type="email" autocomplete="username" required></label>' +
    '<label>Senha<input id="senha" type="password" autocomplete="current-password" required></label>' +
    '<button class="btn primary" type="submit">Entrar</button><p class="err" id="err">' + esc(msg || "") + '</p></form></div></main>';
  document.getElementById("f").addEventListener("submit", async (e) => {
    e.preventDefault();
    document.getElementById("err").textContent = "Entrando…";
    try { await signInWithEmailAndPassword(getAuth(app), document.getElementById("email").value.trim(), document.getElementById("senha").value); }
    catch (err) { document.getElementById("err").textContent = "E-mail ou senha incorretos."; }
  });
}
function semAcesso() {
  root.innerHTML = '<main class="wrap"><div class="login"><img src="' + LOGO + '" alt=""><h1>Quase lá</h1>' +
    '<p>Esta conta ainda não está na equipe. No Console do Firebase, crie em Firestore um documento na coleção <b>equipe</b> com este ID:</p>' +
    '<div class="uid">' + esc(user.uid) + '</div><button class="btn" id="re" type="button">Já cadastrei, tentar de novo</button>' +
    '<button class="out" id="sair" type="button">Sair</button></div></main>';
}
function naoConfigurado() {
  root.innerHTML = '<main class="wrap"><div class="login"><img src="' + LOGO + '" alt=""><h1>Falta configurar</h1>' +
    '<p>Cole a configuração do Firebase no arquivo <b>firebase-config.js</b> (veja o README).</p></div></main>';
}

function mapSvg() {
  let s = '<svg class="map" viewBox="0 0 720 1200" role="img" aria-label="Planta do salão com as mesas">';
  s += '<rect x="0" y="0" width="720" height="60" fill="#0a0807"/><text class="label" x="360" y="38" text-anchor="middle">FRENTE · PORTAS</text>';
  s += '<path d="M610 430H720V830H500V770H610Z" fill="#5a4330" stroke="#9c7448" stroke-width="3"/><text class="label" x="665" y="640" text-anchor="middle" transform="rotate(90 665 640)">BALCÃO</text>';
  s += '<rect x="0" y="1050" width="150" height="150" fill="#14100c" stroke="#33261b" stroke-width="3"/><rect x="155" y="1050" width="150" height="150" fill="#14100c" stroke="#33261b" stroke-width="3"/>';
  s += '<text class="label" x="75" y="1132" text-anchor="middle">WC</text><text class="label" x="230" y="1132" text-anchor="middle">WC</text>';
  s += '<rect x="320" y="960" width="400" height="240" fill="#14100c" stroke="#33261b" stroke-width="3"/><text class="label" x="520" y="1088" text-anchor="middle">COZINHA</text>';
  MESAS.forEach((t) => {
    const c = calls["mesa-" + t.n], cls = c ? (c.status === "a-caminho" ? " going" : " calling") : "";
    const cx = t.cx != null ? t.cx : t.x + t.w / 2, cy = t.cy != null ? t.cy : t.y + t.h / 2;
    s += '<g class="tbl' + cls + '" data-n="' + t.n + '" tabindex="0" role="button" aria-label="Mesa ' + t.n + (c ? ", chamando" : "") + '">';
    if (t.kind === "barrel") {
      s += '<circle class="ring" cx="' + cx + '" cy="' + cy + '" r="' + t.r + '"/><circle class="shape" cx="' + cx + '" cy="' + cy + '" r="' + t.r + '"/>';
    } else {
      const rx = t.kind === "pool" ? 14 : t.kind === "booth" ? 10 : 6;
      const extra = t.kind === "pool" && !c ? ' style="fill:var(--felt)"' : "";
      s += '<rect class="ring" x="' + t.x + '" y="' + t.y + '" width="' + t.w + '" height="' + t.h + '" rx="' + rx + '"/><rect class="shape" x="' + t.x + '" y="' + t.y + '" width="' + t.w + '" height="' + t.h + '" rx="' + rx + '"' + extra + "/>";
      if (t.kind === "booth") s += '<rect x="' + t.x + '" y="' + t.y + '" width="22" height="' + t.h + '" fill="#9c7448" opacity=".55" pointer-events="none"/>';
    }
    s += '<text class="tnum" x="' + (cx + (t.kind === "booth" ? 10 : 0)) + '" y="' + (cy + 11) + '" text-anchor="middle">' + t.n + "</text></g>";
  });
  return s + "</svg>";
}

function painel() {
  const list = Object.values(calls).sort((a, b) => ms(a) - ms(b));
  const waiting = list.filter((c) => c.status === "chamando").length;
  let h = '<header class="top"><div class="wrap"><img src="' + LOGO + '" alt=""><h1>Chamados</h1>' +
    '<button class="btn sound" id="sound" type="button">' + (soundOn ? "🔔 Som ligado" : "🔕 Ligar som") + "</button>" +
    '<span class="count' + (waiting ? " alert" : "") + '">' + list.length + "</span></div></header><main class=\"wrap\">";
  if (state === "erro") h += '<div class="offline" style="margin-top:14px">Sem conexão com o banco. Confira a internet; a lista volta sozinha.</div>';
  h += '<section class="queue"><h2>Fila · mais antigo primeiro</h2>';
  if (!list.length) h += '<div class="empty">Nenhuma mesa chamando agora. Quando um cliente tocar em Chamar, a mesa pisca em vermelho na planta e aparece aqui.</div>';
  list.forEach((c) => {
    const late = c.status === "chamando" && Date.now() - ms(c) > 3 * 60000;
    h += '<button class="call' + (c.status === "a-caminho" ? " going" : "") + '" data-n="' + c.mesa + '" type="button"><span class="m">' + c.mesa + "</span>" +
      '<span><span class="what">' + esc(TIPOS[c.tipo] || "Chamado") + '</span><br><span class="st">' + (c.status === "a-caminho" ? "Atendente a caminho" : "Aguardando") + "</span></span>" +
      '<span class="t' + (late ? " late" : "") + '">' + ago(ms(c)) + "</span></button>";
  });
  h += '</section><section class="map-wrap"><h2 class="map-h">Planta do salão</h2>' + mapSvg() +
    '<div class="legend"><span><i style="background:var(--ember)"></i>Chamando</span><span><i style="background:var(--torch)"></i>A caminho</span><span><i style="background:#3a2a1c;border:1px solid var(--pine)"></i>Livre</span></div>' +
    '<p class="status-line">Toque numa mesa para marcar "A caminho" ou "Atendido".</p>' +
    '<button class="out" id="sair" type="button">Sair do painel</button></section></main>';
  if (open) {
    const c = calls["mesa-" + open];
    h += '<div class="sheet-bg" id="close"></div><div class="sheet" role="dialog" aria-label="Mesa ' + open + '"><div class="wrap"><h3>Mesa ' + open + "</h3>" +
      '<div class="status-line">' + (c ? esc(TIPOS[c.tipo] || "Chamado") + " · há " + ago(ms(c)) : "Sem chamado aberto") + '</div><div class="acts">' +
      (c ? '<button class="btn" id="going" type="button"' + (c.status === "a-caminho" ? " disabled" : "") + '>A caminho</button><button class="btn primary" id="done" type="button">Atendido</button>'
         : '<button class="btn ghost" id="close2" type="button" style="grid-column:1/-1">Fechar</button>') +
      "</div></div></div>";
  }
  root.innerHTML = h;
}

function render() {
  if (!configurado) return naoConfigurado();
  if (state === "loading") return;
  if (!user) return loginView();
  if (state === "sem-acesso") return semAcesso();
  painel();
}

function watch() {
  if (unsub) return;
  unsub = onSnapshot(collection(db, "chamados"), (snap) => {
    const next = {};
    snap.docs.forEach((d) => { next[d.id] = d.data({ serverTimestamps: "estimate" }); });
    if (known) Object.keys(next).forEach((id) => { if (!known[id] && next[id].status === "chamando") beep(); });
    known = next; calls = next; state = "ok"; render();
  }, () => { state = "erro"; render(); });
}

async function checarEquipe() {
  try {
    const d = await getDoc(doc(db, "equipe", user.uid));
    if (d.exists()) { state = "ok"; watch(); } else state = "sem-acesso";
  } catch (e) { state = "sem-acesso"; }
  render();
}

// ---------- eventos ----------
root.addEventListener("click", async (e) => {
  const t = e.target.closest("button, g.tbl, #close");
  if (!t) return;
  if (t.id === "sound") {
    soundOn = !soundOn;
    if (soundOn && !audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (err) {} }
    if (soundOn) beep();
    return render();
  }
  if (t.id === "sair") { if (unsub) { unsub(); unsub = null; } known = null; calls = {}; return signOut(getAuth(app)); }
  if (t.id === "re") return checarEquipe();
  if (t.id === "close" || t.id === "close2") { open = null; return render(); }
  const ref = open ? doc(db, "chamados", "mesa-" + open) : null;
  try {
    if (t.id === "going" && ref) { open = null; render(); return await updateDoc(ref, { status: "a-caminho" }); }
    if (t.id === "done" && ref) { open = null; render(); return await deleteDoc(ref); }
  } catch (err) { alert("Não foi possível salvar. Tente de novo."); return; }
  if (t.dataset && t.dataset.n) { open = +t.dataset.n; render(); }
});
root.addEventListener("keydown", (e) => {
  const g = e.target.closest && e.target.closest("g.tbl");
  if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open = +g.dataset.n; render(); }
});
setInterval(() => { if (state === "ok" && Object.keys(calls).length && !open) render(); }, 15000);

if (!configurado) render();
else {
  onAuthStateChanged(getAuth(app), (u) => {
    user = u;
    if (!u) { state = "anon"; if (unsub) { unsub(); unsub = null; } return render(); }
    state = "loading"; checarEquipe();
  });
}
