/* Acceso Portal — ingreso con Google y permisos por app (los administra la Torre de control).
   Uso, después de los scripts firebase-app/auth/firestore compat:
     <script src="https://fabriziovischi10-a11y.github.io/ecommerceportal/acceso-portal.js" data-app="tms"></script>
   Tapa la página hasta que el usuario entra con Google y tiene permiso para esa app.
   Las apps que guardan en Firebase ecommerce-e7ab2 usan `await PortalAcceso.listo` y `PortalAcceso.db()`
   para leer y escribir como el usuario que entró (las reglas de Firestore lo exigen).
   Los usuarios están en Firestore torre_usuarios/{mail}: {nombre, apps:[ids], activo}. */
(function () {
  var script = document.currentScript;
  var APP = (script && script.dataset.app) || "";
  var CFG = { apiKey: "AIzaSyCLP890Q5hyuqSs82vyF0rk9VhEg0pBlCA", authDomain: "ecommerce-e7ab2.firebaseapp.com", projectId: "ecommerce-e7ab2", storageBucket: "ecommerce-e7ab2.firebasestorage.app", messagingSenderId: "237845351422", appId: "1:237845351422:web:6350a5c3e103b088cf4eaf" };
  var ADMINS = ["fabriziovischi10@gmail.com", "fabriziovischi@distribuidoraportal.com"];
  var TORRE = "https://fabriziovischi10-a11y.github.io/ecommerceportal/escritorio.html";
  var APPS = [
    ["parte", "Parte Diario"], ["tms", "TMS Portal"], ["ecommerce", "Ecommerce"], ["gestientrega", "GestiEntrega"],
    ["monitoreo", "Monitoreo"], ["asistencia", "Asistencia"], ["premio", "Premio del mes"], ["depositos3d", "Depósitos 3D"],
    ["conteo", "Ajustes / Conteo de stock"]
  ];
  var nombreApp = function (id) { var a = APPS.filter(function (x) { return x[0] === id; })[0]; return a ? a[1] : id; };

  var app; try { app = firebase.app("torre"); } catch (e) { app = firebase.initializeApp(CFG, "torre"); }
  var auth = app.auth();
  var fs = null;
  function db() {
    if (!fs) {
      var modular = app._delegate.container.getProvider("firestore").getImmediate({ identifier: "default" });
      fs = new firebase.firestore.Firestore(app, modular);
      try { fs.settings({ experimentalAutoDetectLongPolling: true, ignoreUndefinedProperties: true, merge: true }); } catch (e) {}
    }
    return fs;
  }
  var mailDe = function (u) { return String((u && u.email) || "").trim().toLowerCase(); };
  var esAdmin = function (u) { return !!u && u.emailVerified !== false && ADMINS.indexOf(mailDe(u)) >= 0; };

  /* ---------- pantalla que tapa la app ---------- */
  var css = "#pa-velo{position:fixed;inset:0;z-index:2147483600;background:radial-gradient(900px 500px at 100% 0,rgba(254,212,3,.16),transparent 60%),linear-gradient(160deg,#0e2756,#16326b 60%,#0b1d42);display:grid;place-items:center;padding:20px;font:16px/1.45 'Segoe UI',system-ui,-apple-system,sans-serif;color:#fff}"
    + "#pa-velo[hidden]{display:none!important}"
    + "#pa-velo .pa-c{width:min(420px,100%);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:24px;padding:28px 24px;text-align:center;box-shadow:0 30px 70px rgba(0,0,0,.35)}"
    + "#pa-velo .pa-m{font-weight:900;font-size:30px;letter-spacing:.04em;color:#fed403;margin:0}#pa-velo .pa-s{font-size:11px;letter-spacing:.32em;font-weight:800;color:#ff6b5b;margin:2px 0 18px}"
    + "#pa-velo h2{margin:0 0 6px;font-size:20px}#pa-velo p{margin:0 0 16px;color:rgba(255,255,255,.8)}"
    + "#pa-velo button,#pa-velo a.pa-b{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;border:0;border-radius:14px;padding:13px 16px;font:700 16px 'Segoe UI',system-ui,sans-serif;cursor:pointer;margin-top:10px;text-decoration:none}"
    + "#pa-velo .pa-g{background:#fff;color:#1f2937}#pa-velo .pa-g svg{width:20px;height:20px}#pa-velo .pa-y{background:#fed403;color:#0e2756}#pa-velo .pa-o{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.3)!important}"
    + "#pa-velo .pa-e{color:#ffb4ae;font-weight:700;min-height:1.3em;margin:10px 0 0;font-size:14px}#pa-velo .pa-u{display:inline-block;background:rgba(255,255,255,.1);border-radius:999px;padding:4px 12px;font-size:14px;margin-bottom:12px}"
    + "#pa-velo .pa-sp{width:38px;height:38px;border-radius:50%;border:4px solid rgba(255,255,255,.2);border-top-color:#fed403;margin:8px auto;animation:pa-g .8s linear infinite}@keyframes pa-g{to{transform:rotate(360deg)}}";
  var st = document.createElement("style"); st.textContent = css; (document.head || document.documentElement).appendChild(st);
  var velo = document.createElement("div"); velo.id = "pa-velo"; velo.setAttribute("role", "dialog"); velo.setAttribute("aria-modal", "true");
  var poner = function () { (document.body || document.documentElement).appendChild(velo); };
  if (document.body) poner(); else document.addEventListener("DOMContentLoaded", poner);
  var G = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var marca = '<p class="pa-m">PORTAL</p><p class="pa-s">DISTRIBUIDORA</p>';
  var donde = APP === "torre" ? "la Torre de control" : nombreApp(APP);
  function pintar(html) { velo.innerHTML = '<div class="pa-c">' + marca + html + "</div>"; velo.hidden = false; }
  function cargando() { pintar('<div class="pa-sp"></div><p>Verificando el acceso…</p>'); }
  function pedirIngreso(err) {
    pintar("<h2>Ingresá con tu cuenta de Google</h2><p>Para usar " + esc(donde) + " tenés que entrar con el mail que te habilitó el administrador.</p>"
      + '<button class="pa-g" id="pa-google">' + G + "Ingresar con Google</button>" + '<p class="pa-e" id="pa-err">' + esc(err || "") + "</p>");
    document.getElementById("pa-google").onclick = ingresar;
  }
  function sinPermiso(u, motivo) {
    pintar('<span class="pa-u">' + esc(mailDe(u)) + "</span><h2>" + esc(motivo.t) + "</h2><p>" + esc(motivo.d) + "</p>"
      + (APP !== "torre" ? '<a class="pa-b pa-y" href="' + TORRE + '">Volver a la Torre de control</a>' : "")
      + '<button class="pa-o" id="pa-otra">Entrar con otra cuenta</button>');
    document.getElementById("pa-otra").onclick = function () { auth.signOut().then(function () { pedirIngreso(); }); };
  }
  function ingresar() {
    var p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
    var e = document.getElementById("pa-err"); if (e) e.textContent = "";
    auth.signInWithPopup(p).catch(function (err) {
      var c = err && err.code;
      if (c === "auth/popup-blocked" || c === "auth/operation-not-supported-in-this-environment") return auth.signInWithRedirect(p);
      if (c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request") return;
      var e2 = document.getElementById("pa-err"); if (e2) e2.textContent = "No se pudo entrar: " + (err.message || c);
    });
  }

  /* ---------- verificación ---------- */
  var resolver, rechazar;
  var listo = new Promise(function (ok, no) { resolver = ok; rechazar = no; });
  var resuelto = false;
  async function verificar(u) {
    if (!u || u.isAnonymous) { pedirIngreso(); return; }
    cargando();
    var mail = mailDe(u), admin = esAdmin(u), perfil = null;
    try { var s = await db().collection("torre_usuarios").doc(mail).get(); perfil = s.exists ? s.data() : null; }
    catch (err) { if (!admin) { pintar('<h2>No se pudo verificar el acceso</h2><p>' + esc(err.message || err.code) + '</p><button class="pa-y" onclick="location.reload()">Reintentar</button>'); return; } }
    var apps = admin ? APPS.map(function (a) { return a[0]; }) : ((perfil && perfil.activo !== false && perfil.apps) || []);
    if (!admin) {
      if (!perfil) { sinPermiso(u, { t: "Tu cuenta no está habilitada", d: "Pedile al administrador que te agregue en la Torre de control." }); return; }
      if (perfil.activo === false) { sinPermiso(u, { t: "Tu usuario está desactivado", d: "Hablá con el administrador para volver a tener acceso." }); return; }
      if (APP && APP !== "torre" && apps.indexOf(APP) < 0) { sinPermiso(u, { t: "No tenés acceso a " + nombreApp(APP), d: "El administrador no te habilitó esta aplicación." }); return; }
      try { db().collection("torre_usuarios").doc(mail).set({ ultimoIngreso: new Date().toISOString() }, { merge: true }); } catch (e) {}
    }
    velo.hidden = true;
    var datos = { app: app, db: db(), usuario: u, mail: mail, nombre: (perfil && perfil.nombre) || u.displayName || mail, perfil: perfil, admin: admin, apps: apps };
    PortalAcceso.actual = datos;
    if (!resuelto) { resuelto = true; resolver(datos); }
    else if (typeof PortalAcceso.alCambiar === "function") PortalAcceso.alCambiar(datos);
  }
  cargando();
  auth.getRedirectResult().catch(function (err) { pedirIngreso("No se pudo entrar: " + (err.message || err.code)); });
  var anterior;
  auth.onAuthStateChanged(function (u) {
    var m = u ? mailDe(u) : "";
    if (resuelto && m !== anterior) { location.reload(); return; } // cambió la cuenta: arrancar de cero
    anterior = m; verificar(u);
  });

  window.PortalAcceso = {
    APP: APP, APPS: APPS, ADMINS: ADMINS, TORRE: TORRE, nombreApp: nombreApp,
    listo: listo, app: app, auth: auth, db: db, esAdmin: esAdmin, actual: null, alCambiar: null,
    salir: function () { return auth.signOut().then(function () { location.reload(); }); }
  };
})();
