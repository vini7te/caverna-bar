// Botão de chamar atendente no cardápio. Só ativa com ?mesa=N no endereço (cada QR de mesa leva o seu número).
import { db, configurado } from "./firebase.js";
import { MESAS, TIPOS } from "./mesas.js";
import { doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const n = parseInt(new URLSearchParams(location.search).get("mesa"), 10);
const root = document.getElementById("chamar");

if (n && MESAS.some((m) => m.n === n)) {
  document.body.classList.add("na-mesa");
  root.hidden = false;
  const ref = configurado ? doc(db, "chamados", "mesa-" + n) : null;
  let chamado = null, aberto = false, enviando = false, tick = null;

  const ago = (d) => {
    if (!d) return "agora";
    const s = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
    return s < 60 ? "agora" : Math.floor(s / 60) + " min";
  };
  const toast = (msg) => {
    const t = document.createElement("div");
    t.className = "cb-toast"; t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  };

  function render() {
    let h = '<div class="chamar-bar"><div class="in"><div class="mesa"><small>MESA</small>' + n + "</div>";
    if (!configurado) {
      h += '<div class="msg"><b>Chame no balcão</b><span>O botão ainda não foi ativado.</span></div>';
    } else if (chamado) {
      const indo = chamado.status === "a-caminho";
      const desde = chamado.desde && chamado.desde.toDate ? chamado.desde.toDate() : null;
      h += '<div class="msg ' + chamado.status + '"><b>' + (indo ? "Atendente a caminho" : "Chamado enviado") + "</b><span>" +
        (TIPOS[chamado.tipo] || "Chamado") + " · " + ago(desde) + "</span></div>";
      if (!indo) h += '<button class="cb-btn" data-a="cancelar" type="button">Cancelar</button>';
    } else {
      h += '<div class="msg"><b>Precisa de algo?</b><span>A gente vai até a sua mesa.</span></div>' +
        '<button class="cb-btn main" data-a="abrir" type="button">Chamar</button>';
    }
    h += "</div></div>";
    if (aberto) {
      h += '<div class="cb-bg" data-a="fechar"></div><div class="cb-sheet" role="dialog" aria-label="Chamar atendente"><div class="in">' +
        "<h3>Mesa " + n + "</h3>" +
        '<button class="cb-btn main" data-t="atendente" type="button">Chamar atendente</button>' +
        '<button class="cb-btn" data-t="conta" type="button">Pedir a conta</button>' +
        '<button class="cb-btn" data-t="gelo" type="button">Gelo / copos</button>' +
        '<button class="cb-btn ghost" data-a="fechar" type="button">Voltar</button></div></div>';
    }
    root.innerHTML = h;
  }

  root.addEventListener("click", async (e) => {
    const el = e.target.closest("[data-a],[data-t]");
    if (!el) return;
    const a = el.dataset.a, t = el.dataset.t;
    if (a === "abrir") { aberto = true; render(); return; }
    if (a === "fechar") { aberto = false; render(); return; }
    if (enviando || !ref) return;
    enviando = true;
    try {
      if (t) { await setDoc(ref, { mesa: n, tipo: t, status: "chamando", desde: serverTimestamp() }); aberto = false; }
      if (a === "cancelar") await deleteDoc(ref);
    } catch (err) {
      toast("Não deu para enviar. Confira a internet ou chame no balcão.");
    }
    enviando = false; render();
  });

  if (ref) {
    onSnapshot(ref, { includeMetadataChanges: false }, (snap) => {
      chamado = snap.exists() ? snap.data({ serverTimestamps: "estimate" }) : null;
      render();
    }, () => { toast("Sem conexão com o bar. Chame no balcão."); });
    tick = setInterval(() => { if (chamado) render(); }, 30000);
  }
  render();
}
