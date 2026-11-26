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
  // data-modo="suave": no tapa la página; solo aplica las restricciones si el usuario ya entró (antes de activar el bloqueo)
  var SUAVE = !!(script && script.dataset.modo === "suave");
  var CFG = { apiKey: "AIzaSyCLP890Q5hyuqSs82vyF0rk9VhEg0pBlCA", authDomain: "ecommerce-e7ab2.firebaseapp.com", projectId: "ecommerce-e7ab2", storageBucket: "ecommerce-e7ab2.firebasestorage.app", messagingSenderId: "237845351422", appId: "1:237845351422:web:6350a5c3e103b088cf4eaf" };
  var ADMINS = ["fabriziovischi10@gmail.com", "fabriziovischi@distribuidoraportal.com"];
  var TORRE = "https://fabriziovischi10-a11y.github.io/ecommerceportal/escritorio.html";
  var APPS = [
    ["parte", "Parte Diario"], ["tms", "TMS Portal"], ["ecommerce", "Ecommerce"], ["gestientrega", "GestiEntrega"],
    ["monitoreo", "Monitoreo"], ["asistencia", "Asistencia"], ["premio", "Premio del mes"], ["depositos3d", "Depósitos 3D"],
    ["conteo", "Ajustes / Conteo de stock"], ["vehiculos", "Recepción de vehículos"], ["picking", "Picking"]  ];
  var nombreApp = function (id) { var a = APPS.filter(function (x) { return x[0] === id; })[0]; return a ? a[1] : id; };

  var app; try { app = firebase.app("torre"); } catch (e) { app = firebase.initializeApp(CFG, "torre"); }
  var auth = app.auth();
  var fs = null;
  /* ---------- 2026-11-26 · Seguridad pasos 2 y 3: otros proyectos Firebase ----------
     La RTDB del Parte diario/Picking (portal-logistica-2c88c) y GestiEntrega (gestientrega-portal) son otros proyectos:
     la sesión de la Torre no vale ahí. Cada usuario los «conecta» UNA vez por equipo (popup de Google en ese proyecto;
     queda guardado en el navegador). data-conecta="logistica,entregas" en el <script> indica qué necesita la página. */
  var EXTRA = {
    logistica: { nombre: "Parte diario y Picking", cfg: { apiKey: "AIzaSyAEbyF_utj5FRL2X9_BlMjpL4fiPCdXXOU", authDomain: "portal-logistica-2c88c.firebaseapp.com", databaseURL: "https://portal-logistica-2c88c-default-rtdb.firebaseio.com", projectId: "portal-logistica-2c88c", storageBucket: "portal-logistica-2c88c.firebasestorage.app", messagingSenderId: "97670600668", appId: "1:97670600668:web:697176824219e2b58b6119" } },
    entregas: { nombre: "GestiEntrega", cfg: { apiKey: "AIzaSyCbz7XLb9jLjlvwEz-NG_jyEPdFwWob7SM", authDomain: "gestientrega-portal.firebaseapp.com", projectId: "gestientrega-portal", storageBucket: "gestientrega-portal.firebasestorage.app", messagingSenderId: "639729899204", appId: "1:639729899204:web:3609e16c548801e1821b91" } }
  };
  var NECESITA = String((script && script.dataset.conecta) || "").split(",").map(function (x) { return x.trim(); }).filter(function (x) { return EXTRA[x]; });
  var NECESITA_ADMIN = String((script && script.dataset.conectaAdmin) || "").split(",").map(function (x) { return x.trim(); }).filter(function (x) { return EXTRA[x]; });
  Object.keys(EXTRA).forEach(function (k) {
    var X = EXTRA[k]; try { X.app = firebase.app("pa-" + k); } catch (e) { X.app = firebase.initializeApp(X.cfg, "pa-" + k); }
    X.auth = X.app.auth();
    X.listo = new Promise(function (ok) { var off = X.auth.onAuthStateChanged(function () { off(); ok(); }); });
  });
  var RTDB = EXTRA.logistica.cfg.databaseURL.replace(/^https?:\/\//, "");
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
  if (SUAVE) { window.PortalAcceso_SUAVE = true; }
  // Nov. 2026: mismo fondo azul y logo que la intro animada (intro-portal.js): P y DISTRIBUIDORA rojas, PORTAL blanco;
  // el «cargando» es la P roja dibujándose
  var LOGO = ((script && script.src) || "").replace(/[^\/]*$/, "") + "logo-portal.png";
  var css = "#pa-velo{position:fixed;inset:0;z-index:2147483600;background:radial-gradient(900px 460px at 50% 42%,#22336A,#17214A 70%,#111A3C);display:grid;place-items:center;padding:20px;font:16px/1.45 'Segoe UI',system-ui,-apple-system,sans-serif;color:#fff}"
    + "#pa-velo[hidden]{display:none!important}"
    + "#pa-velo .pa-c{width:min(440px,100%);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:24px;padding:28px 24px;text-align:center;box-shadow:0 30px 70px rgba(0,0,0,.35)}"
    + "#pa-velo .pa-logo{position:relative;width:min(300px,78%);aspect-ratio:1670/531;margin:0 auto 18px;background:url('" + LOGO + "') center/100% 100% no-repeat}"
    + "#pa-velo .pa-logo i{position:absolute;inset:0;background:#FFFFFF;clip-path:inset(0 1.5% 34% 26.5%);-webkit-mask:url('" + LOGO + "') center/100% 100% no-repeat;mask:url('" + LOGO + "') center/100% 100% no-repeat}"
    + "#pa-velo h2{margin:0 0 6px;font-size:20px}#pa-velo p{margin:0 0 16px;color:rgba(255,255,255,.8)}"
    + "#pa-velo button,#pa-velo a.pa-b{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;border:0;border-radius:14px;padding:13px 16px;font:700 16px 'Segoe UI',system-ui,sans-serif;cursor:pointer;margin-top:10px;text-decoration:none}"
    + "#pa-velo .pa-g{background:#fff;color:#1f2937}#pa-velo .pa-g svg{width:20px;height:20px}#pa-velo .pa-y{background:#FED501;color:#293B72}#pa-velo .pa-o{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.3)!important}"
    + "#pa-velo .pa-e{color:#ffb4ae;font-weight:700;min-height:1.3em;margin:10px 0 0;font-size:14px}#pa-velo .pa-u{display:inline-block;background:rgba(255,255,255,.1);border-radius:999px;padding:4px 12px;font-size:14px;margin-bottom:12px}"
    + "#pa-velo .pa-sp{display:block;width:54px;height:auto;margin:4px auto 10px;overflow:visible}"
    + "#pa-velo .pa-solo{text-align:center}#pa-velo .pa-solo .pa-sp{width:88px;margin:0 auto 14px}#pa-velo .pa-solo p{margin:0;font-size:15px;color:rgba(255,255,255,.75);letter-spacing:.02em}"
    + "#pa-velo .pa-sp .pa-tr{stroke-dasharray:1 1;stroke-dashoffset:1;animation:pa-tr 1.8s cubic-bezier(.55,0,.25,1) infinite}"
    + "@keyframes pa-tr{0%{stroke-dashoffset:1}55%{stroke-dashoffset:0}80%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:0;opacity:0}}"
    + "@media (prefers-reduced-motion:reduce){#pa-velo .pa-sp .pa-tr{animation:none;stroke-dashoffset:0}}";
  // la P del logo (recortada de la imagen original) que se pinta siguiendo su recorrido, una y otra vez
  var RUEDA = '<svg class="pa-sp" viewBox="40 60 380 440" role="img" aria-label="Cargando"><defs>'
    + '<mask id="pa-mk" maskUnits="userSpaceOnUse" x="0" y="0" width="430" height="531"><path class="pa-tr" d="M82 480V250C82 150 140 103 228 103C320 103 376 160 376 241C376 330 315 381 228 381L130 381" fill="none" stroke="#fff" stroke-width="110" stroke-linejoin="round" pathLength="1"/></mask>'
    + '<clipPath id="pa-ck"><rect width="430" height="531"/></clipPath></defs>'
    + '<image href="' + LOGO + '" width="1670" height="531" clip-path="url(#pa-ck)" opacity=".18"/>'
    + '<image href="' + LOGO + '" width="1670" height="531" clip-path="url(#pa-ck)" mask="url(#pa-mk)"/></svg>';
  var st = document.createElement("style"); st.textContent = css; (document.head || document.documentElement).appendChild(st);
  var velo = document.createElement("div"); velo.id = "pa-velo"; velo.setAttribute("role", "dialog"); velo.setAttribute("aria-modal", "true");
  var poner = function () { (document.body || document.documentElement).appendChild(velo); };
  if (document.body) poner(); else document.addEventListener("DOMContentLoaded", poner);
  var G = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var marca = '<div class="pa-logo" role="img" aria-label="Portal Distribuidora"><i></i></div>';
  var donde = APP === "torre" ? "la Torre de control" : nombreApp(APP);
  function pintar(html, solo) { if (SUAVE) { velo.hidden = true; return; } velo.innerHTML = solo ? '<div class="pa-solo">' + html + "</div>" : '<div class="pa-c">' + marca + html + "</div>"; velo.hidden = false; }
  // mientras carga: solo la P roja animada, sin tarjeta ni logo completo
  function cargando() { pintar(RUEDA + '<p>Verificando el acceso…</p>', true); }
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
  /* Conecta la cuenta de Google en un proyecto extra (una vez por equipo). Devuelve true si ya quedó conectado. */
  async function conectarExtra(k, mail) {
    var X = EXTRA[k]; await X.listo;
    var u = X.auth.currentUser; if (u && !u.isAnonymous && u.email) return true;
    return new Promise(function (ok) {
      pintar("<h2>Un paso más</h2><p>Conectá tu cuenta con <b>" + esc(X.nombre) + "</b>. Se hace una sola vez en este equipo.</p>"
        + '<button class="pa-g" id="pa-x">' + G + "Conectar con Google</button>" + '<p class="pa-e" id="pa-xe"></p>');
      document.getElementById("pa-x").onclick = function () {
        var p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account", login_hint: mail || "" });
        X.auth.signInWithPopup(p).then(function () { cargando(); barrer(); ok(true); }).catch(function (err) {
          var c = err && err.code; if (c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request") return;
          var e = document.getElementById("pa-xe"); if (e) e.textContent = "No se pudo conectar: " + (err.message || c);
        });
      };
    });
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
  function sinDatos() { velo.hidden = true; if (!resuelto) { resuelto = true; resolver(null); } }
  async function verificar(u) {
    if (!u || u.isAnonymous) { if (SUAVE) return sinDatos(); pedirIngreso(); return; }
    cargando();
    var mail = mailDe(u), admin = esAdmin(u), perfil = null;
    try { var s = await db().collection("torre_usuarios").doc(mail).get(); perfil = s.exists ? s.data() : null; }
    catch (err) { if (SUAVE && !admin) return sinDatos(); if (!admin) { pintar('<h2>No se pudo verificar el acceso</h2><p>' + esc(err.message || err.code) + '</p><button class="pa-y" onclick="location.reload()">Reintentar</button>'); return; } }
    var apps = admin ? APPS.map(function (a) { return a[0]; }) : ((perfil && perfil.activo !== false && perfil.apps) || []);
    if (SUAVE && !admin && (!perfil || perfil.activo === false || apps.indexOf(APP) < 0)) return sinDatos();
    if (!admin) {
      if (!perfil) { sinPermiso(u, { t: "Tu cuenta no está habilitada", d: "Pedile al administrador que te agregue en la Torre de control." }); return; }
      if (perfil.activo === false) { sinPermiso(u, { t: "Tu usuario está desactivado", d: "Hablá con el administrador para volver a tener acceso." }); return; }
      if (APP && APP !== "torre" && apps.indexOf(APP) < 0) { sinPermiso(u, { t: "No tenés acceso a " + nombreApp(APP), d: "El administrador no te habilitó esta aplicación." }); return; }
      try { db().collection("torre_usuarios").doc(mail).set({ ultimoIngreso: new Date().toISOString() }, { merge: true }); } catch (e) {}
    }
    if (!SUAVE) { var pedir = NECESITA.concat(admin ? NECESITA_ADMIN : []); for (var i = 0; i < pedir.length; i++) { var okX = await conectarExtra(pedir[i], mail); if (!okX) return; } }
    velo.hidden = true;
    var datos = { app: app, db: db(), usuario: u, mail: mail, nombre: (perfil && perfil.nombre) || u.displayName || mail, perfil: perfil, admin: admin, apps: apps,
      secciones: (!admin && perfil && perfil.secciones && perfil.secciones[APP] && perfil.secciones[APP].length) ? perfil.secciones[APP] : null };
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

  /* ---------- 2026-11-26 · Seguridad (fase 2): las apps del mismo proyecto Firebase que todavía entran anónimas ----------
     Cualquier Auth del proyecto ecommerce-e7ab2 (TMS, Ecommerce, Monitoreo, Premio, Asistencia, Vehículos, la conexión «tms»
     del Parte diario…) toma la sesión de Google de la Torre en lugar de una anónima: se reemplaza signInAnonymously() y se
     «barren» las sesiones anónimas ya guardadas (updateCurrentUser). Así cada app solo suma este script y las reglas de
     Firestore pueden exigir un usuario habilitado. En modo suave, si nadie entró con Google, todo sigue anónimo como antes. */
  // proyecto → Auth «gestora» que tiene la sesión de Google (Torre para ecommerce-e7ab2; pa-logistica / pa-entregas para los otros)
  var GESTOR = {}; GESTOR[CFG.projectId] = auth; Object.keys(EXTRA).forEach(function (k) { GESTOR[EXTRA[k].cfg.projectId] = EXTRA[k].auth; });
  var gestorDe = function (a) { try { var g = GESTOR[a.app.options.projectId]; return g && g !== a ? g : null; } catch (e) { return null; } };
  var usuarioGoogle = function (g) { var u = (g || auth).currentUser; return u && !u.isAnonymous ? u : null; };
  var mismaBase = function (a) { return !!gestorDe(a); };
  function pasarSesion(a) {
    var g = gestorDe(a), u = g && usuarioGoogle(g); if (!u) return Promise.resolve(null);
    var cur = a.currentUser; if (cur && !cur.isAnonymous) return Promise.resolve(cur); // nunca pisar una sesión de Google existente (p. ej. supervisión de Picking)
    return a.updateCurrentUser(u).then(function () { return a.currentUser; }).catch(function (e) { console.warn("PortalAcceso: no se pudo pasar la sesión", e); return null; });
  }
  function barrer() { firebase.apps.forEach(function (ap) { try { var a = ap.auth(); if (gestorDe(a)) pasarSesion(a); } catch (e) {} }); }
  try {
    var AP = firebase.auth.Auth.prototype;
    if (AP && !AP.__paParche) {
      AP.__paParche = true;
      var origAnon = AP.signInAnonymously;
      AP.signInAnonymously = function () {
        var a = this, args = arguments;
        if (!mismaBase(a)) return origAnon.apply(a, args);
        var esperar = gestorDe(a) === auth ? listo : Promise.all([listo, (Object.keys(EXTRA).map(function (k) { return EXTRA[k]; }).filter(function (X) { return X.auth === gestorDe(a); })[0] || {}).listo]);
        return esperar.then(function () {
          if (!usuarioGoogle(gestorDe(a))) return origAnon.apply(a, args);
          return pasarSesion(a).then(function (u) { return u ? { user: u, additionalUserInfo: null, credential: null, operationType: "signIn" } : origAnon.apply(a, args); });
        });
      };
    }
  } catch (e) { console.warn("PortalAcceso: sin parche de sesión", e); }
  try {
    var fetchOrig = window.fetch;
    if (fetchOrig && !fetchOrig.__pa) {
      var fx = function (input, init) {
        var url = typeof input === "string" ? input : (input && input.url) || "";
        if (url.indexOf(RTDB) < 0 || /[?&](auth|access_token)=/.test(url)) return fetchOrig.apply(this, arguments);
        var self = this, args = arguments;
        return EXTRA.logistica.listo.then(function () {
          var u = usuarioGoogle(EXTRA.logistica.auth); if (!u) return fetchOrig.apply(self, args);
          return u.getIdToken().then(function (t) {
            var nuevo = url + (url.indexOf("?") < 0 ? "?" : "&") + "auth=" + encodeURIComponent(t);
            return typeof input === "string" ? fetchOrig.call(self, nuevo, init) : fetchOrig.call(self, new Request(nuevo, input), init);
          }, function () { return fetchOrig.apply(self, args); });
        });
      };
      fx.__pa = true; window.fetch = fx;
    }
  } catch (e) { console.warn("PortalAcceso: sin token para la RTDB", e); }

  /* Torre (administrador): copia la lista de mails habilitados a las otras dos bases, que es lo que miran sus reglas.
     RTDB acceso/mails/<mail con , en vez de .> = true · GestiEntrega entregas/config.usuarios = [mails] */
  var clave = function (m) { return String(m).toLowerCase().replace(/\./g, ","); };
  function sincronizarListas() {
    var d = PortalAcceso.actual; if (!d || !d.admin) return;
    db().collection("torre_usuarios").get().then(function (sn) {
      var mails = ADMINS.slice(); sn.docs.forEach(function (x) { var v = x.data() || {}; if (v.activo !== false && x.id.indexOf("@") > 0) mails.push(x.id.toLowerCase()); });
      mails = mails.filter(function (m, i) { return mails.indexOf(m) === i; });
      var L = usuarioGoogle(EXTRA.logistica.auth);
      if (L) L.getIdToken().then(function (t) { var o = {}; mails.forEach(function (m) { o[clave(m)] = true; });
        return fetchOrig.call(window, "https://" + RTDB + "/acceso/mails.json?auth=" + encodeURIComponent(t), { method: "PUT", body: JSON.stringify(o) }); })
        .catch(function (e) { console.warn("PortalAcceso: lista RTDB", e); });
      var E = usuarioGoogle(EXTRA.entregas.auth);
      if (E) EXTRA.entregas.app.firestore().collection("entregas").doc("config").set({ usuarios: mails, usuariosAt: new Date().toISOString() }, { merge: true })
        .catch(function (e) { console.warn("PortalAcceso: lista GestiEntrega", e); });
    }).catch(function () {});
  }
  listo.then(function (d) { if (d && d.admin && APP === "torre") { sincronizarListas(); try { db().collection("torre_usuarios").onSnapshot(function () { sincronizarListas(); }); } catch (e) {} } });

  listo.then(function (d) { if (!d) return; barrer(); var n = 0, t = setInterval(function () { barrer(); if (++n > 40) clearInterval(t); }, 1500); });
  Object.keys(EXTRA).forEach(function (k) { EXTRA[k].auth.onAuthStateChanged(function () { barrer(); }); });

  window.PortalAcceso = {
    APP: APP, APPS: APPS, ADMINS: ADMINS, TORRE: TORRE, nombreApp: nombreApp,
    listo: listo, app: app, auth: auth, db: db, esAdmin: esAdmin, actual: null, alCambiar: null,
    salir: function () { return auth.signOut().then(function () { location.reload(); }); }, pasarSesion: pasarSesion, conectar: conectarExtra, extra: EXTRA
  };
})();
