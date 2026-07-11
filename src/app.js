// App-Start: Service Worker registrieren (Offline + Auto Update), Bildschirme starten,
// auf dem iPhone einen kleinen Hinweis zum Installieren aufs Handy zeigen.
import { boot } from "./ui/screens.js";

// Service Worker: relativer Pfad, damit es auch im Unterordner von GitHub Pages laeuft.
// Mit ?nosw laesst er sich zum Testen ueberspringen.
if ("serviceWorker" in navigator && !location.search.includes("nosw")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
  // Neue Version aktiv geworden -> einmalig neu laden.
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function maybeShowInstallHint() {
  if (!isIos() || isStandalone()) return;
  if (localStorage.getItem("installHintDismissed") === "1") return;
  const bar = document.createElement("div");
  bar.className = "install-hint";
  bar.innerHTML =
    'Aufs Handy legen: unten <b>Teilen</b> antippen, dann <b>Zum Home-Bildschirm</b>.';
  const x = document.createElement("button");
  x.textContent = "✕";
  x.addEventListener("click", () => {
    localStorage.setItem("installHintDismissed", "1");
    bar.remove();
  });
  bar.appendChild(x);
  document.body.appendChild(bar);
}

boot().catch((err) => {
  const app = document.getElementById("app");
  if (app) app.innerHTML = '<div class="view"><p class="method-hint">Fehler beim Start: ' + (err && err.message) + "</p></div>";
});
window.addEventListener("error", (e) => {
  const app = document.getElementById("app");
  if (app && !app.children.length) app.innerHTML = '<div class="view"><p class="method-hint">Fehler: ' + e.message + "</p></div>";
});
maybeShowInstallHint();
