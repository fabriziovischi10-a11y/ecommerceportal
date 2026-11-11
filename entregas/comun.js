/* comun.js — base compartida de Portal Entregas (réplica de GestiEntrega).
   Va después de los scripts firebase-app/auth/firestore compat 10.13.0.
   Expone window.GE. Lo usan index.html, chofer.html, admin.html y logistica.html.

   DATOS: Firestore del proyecto gestientrega-portal, en entregas/datos/<coleccion>/<id>.
   - Cada documento tiene un campo numérico `id` y el ID del documento es String(id).
   - Las referencias (routeId, driverId, clientId, zoneId, invoiceId, …) son NÚMEROS.
   - Los registros nuevos se crean con GE.nuevoId() (también numérico).
   - Con ?prueba=1 en la URL se usa entregas_prueba/datos: copia de ensayo de los últimos 8 días.
     Ahí cualquier usuario firmado lee y escribe. Siempre probar ahí.
   - Archivos (PDF y fotos): campo fileUrl = 'archivo:<id>' → documento archivos/<id> con {data(base64), mime, nombre, tipo}.
*/
(function () {
  var cfg = {
    apiKey: "AIzaSyCbz7XLb9jLjlvwEz-NG_jyEPdFwWob7SM",
    authDomain: "gestientrega-portal.firebaseapp.com",
    projectId: "gestientrega-portal",
    storageBucket: "gestientrega-portal.firebasestorage.app",
    messagingSenderId: "639729899204",
    appId: "1:639729899204:web:3609e16c548801e1821b91"
  };
  // App con nombre propio para no chocar con otras apps de Firebase de la página (por ejemplo acceso-portal.js).
  var app = firebase.apps.filter(function (a) { return a.name === "entregas"; })[0] || firebase.initializeApp(cfg, "entregas");
  var auth = app.auth();
  var db = app.firestore();

  var params = new URLSearchParams(location.search);
  var PRUEBA = params.get("prueba") === "1" || sessionStorage.getItem("ge_prueba") === "1";
  if (params.get("prueba") === "1") sessionStorage.setItem("ge_prueba", "1");
  if (params.get("prueba") === "0") { sessionStorage.removeItem("ge_prueba"); PRUEBA = false; }
  var BASE = PRUEBA ? "entregas_prueba" : "entregas";
  var RAIZ = db.collection(BASE).doc("datos");

  function col(nombre) { return RAIZ.collection(nombre); }
  function ref(nombre, id) { return col(nombre).doc(String(id)); }
  function configRef() { return db.collection(BASE).doc("config"); }

  // ---------- Sesión ----------
  // Chofer: anónimo. Admin/Logística: Google + mail en config.admins (en modo prueba alcanza con anónimo).
  var _anon = null;
  function anonimo() {
    if (_anon) return _anon;
    _anon = new Promise(function (ok, no) {
      var off = auth.onAuthStateChanged(function (u) {
        if (u) { off(); ok(u); }
        else auth.signInAnonymously().catch(function (e) { off(); no(e); });
      });
    });
    return _anon;
  }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* requerirAdmin({titulo, texto, volver:{href,label}}) → Promise<user>.
     Tapa la página con la pantalla de ingreso hasta que entra un admin. */
  function requerirAdmin(op) {
    op = op || {};
    var velo = document.createElement("div");
    velo.className = "ge-velo";
    document.body.appendChild(velo);
    function pantalla(msg, error) {
      velo.innerHTML = '<div class="ge-login card">' +
        '<img src="logo.png" alt="" class="ge-login-logo">' +
        '<h1>' + esc(op.titulo || "Administración de Portal") + '</h1>' +
        '<p class="muted">' + esc(op.texto || "Ingresá con tu cuenta de Google autorizada.") + '</p>' +
        (error ? '<p class="ge-error">' + esc(error) + '</p>' : '') +
        (msg ? '<p class="muted">' + esc(msg) + '</p>' : '<button class="btn btn-primary btn-lg ge-g">Ingresar con Google</button>') +
        (op.volver ? '<a class="btn btn-outline" href="' + esc(op.volver.href) + '">' + esc(op.volver.label) + '</a>' : '') +
        (auth.currentUser && !auth.currentUser.isAnonymous ? '<button class="btn btn-ghost ge-otra">Usar otra cuenta</button>' : '') +
        '</div>';
      var b = velo.querySelector(".ge-g");
      if (b) b.onclick = function () {
        var p = new firebase.auth.GoogleAuthProvider();
        p.setCustomParameters({ prompt: "select_account" });
        auth.signInWithPopup(p).catch(function (e) {
          if (e && (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment")) auth.signInWithRedirect(p);
          else pantalla(null, "No se pudo entrar: " + (e.message || e.code));
        });
      };
      var o = velo.querySelector(".ge-otra");
      if (o) o.onclick = function () { auth.signOut(); };
    }
    pantalla("Verificando el acceso…");
    return new Promise(function (ok) {
      if (PRUEBA) {
        anonimo().then(function (u) { velo.remove(); ok(u); });
        return;
      }
      auth.getRedirectResult().catch(function (e) { pantalla(null, "No se pudo entrar: " + (e.message || e.code)); });
      auth.onAuthStateChanged(function (u) {
        if (!u || u.isAnonymous) { pantalla(null); return; }
        pantalla("Verificando el acceso…");
        configRef().get().then(function (s) {
          var admins = ((s.exists && s.data().admins) || []).map(function (m) { return String(m).toLowerCase(); });
          if (admins.indexOf(String(u.email || "").toLowerCase()) >= 0) { velo.remove(); ok(u); }
          else pantalla(null, (u.email || "Esta cuenta") + " no está autorizada. Pedí acceso al administrador.");
        }).catch(function (e) { pantalla(null, "No se pudo verificar: " + (e.message || e.code)); });
      });
    });
  }

  function salir() { return auth.signOut().then(function () { location.reload(); }); }

  // ---------- IDs y lectura ----------
  var _ult = 0;
  function nuevoId() { var n = Date.now() * 1000 + Math.floor(Math.random() * 1000); if (n <= _ult) n = _ult + 1; _ult = n; return n; }
  function datos(snap) { return snap.docs.map(function (d) { return d.data(); }); }
  /* donde('invoices', [['routeId','==',5],['status','==','pending']]) → Promise<array>
     Usar solo filtros de igualdad o 'in' para no necesitar índices compuestos; ordenar en el cliente. */
  function donde(nombre, filtros) {
    var q = col(nombre);
    (filtros || []).forEach(function (f) { q = q.where(f[0], f[1], f[2]); });
    return q.get().then(datos);
  }
  /* Para 'in' con más de 30 valores: parte en tandas. */
  function dondeEn(nombre, campo, valores, extra) {
    valores = Array.from(new Set(valores)).filter(function (v) { return v != null; });
    var tandas = [];
    for (var i = 0; i < valores.length; i += 30) tandas.push(valores.slice(i, i + 30));
    return Promise.all(tandas.map(function (t) { return donde(nombre, [[campo, "in", t]].concat(extra || [])); }))
      .then(function (r) { return [].concat.apply([], r); });
  }
  function todos(nombre) { return col(nombre).get().then(datos); }
  function uno(nombre, id) { return ref(nombre, id).get().then(function (s) { return s.exists ? s.data() : null; }); }
  function guardar(nombre, obj) { if (obj.id == null) obj.id = nuevoId(); return ref(nombre, obj.id).set(obj, { merge: true }).then(function () { return obj; }); }
  function actualizar(nombre, id, cambios) { return ref(nombre, id).update(cambios); }
  function borrar(nombre, id) { return ref(nombre, id).delete(); }

  // ---------- Archivos ----------
  function aBase64(blob) { return new Promise(function (ok) { var f = new FileReader(); f.onload = function () { ok(String(f.result).split(",")[1]); }; f.readAsDataURL(blob); }); }
  function achicarImagen(blob) {
    return createImageBitmap(blob).then(function (bmp) {
      var s = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
      function intento(q) {
        var c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
        c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
        return new Promise(function (ok) { c.toBlob(ok, "image/jpeg", q); }).then(function (b) {
          if (b.size < 680000 || q <= 0.45) return b; s *= 0.85; return intento(q - 0.1);
        });
      }
      return intento(0.8);
    });
  }
  /* guardarArchivo(blob, tipo, nombre) → Promise<'archivo:<id>'>. tipo: recibos|cajas|cheques|transferencias|cuentas-clientes|hojas-ruta */
  function guardarArchivo(blob, tipo, nombre) {
    var p = /^image\//.test(blob.type) && blob.size > 680000 ? achicarImagen(blob) : Promise.resolve(blob);
    return p.then(function (b) {
      if (b.size > 700000) throw new Error("El archivo es demasiado grande (máx. 700 KB).");
      return aBase64(b).then(function (data) {
        var id = String(nuevoId());
        return ref("archivos", id).set({ id: Number(id), tipo: tipo || "", nombre: nombre || "", mime: b.type || "application/octet-stream", bytes: b.size, data: data, createdAt: Date.now() })
          .then(function () { return "archivo:" + id; });
      });
    });
  }
  var _urls = {};
  /* urlArchivo(fileUrl) → Promise<url para abrir/descargar>. Acepta 'archivo:<id>', data: o http. */
  function urlArchivo(fileUrl) {
    if (!fileUrl) return Promise.resolve(null);
    if (!/^archivo:/.test(fileUrl)) return Promise.resolve(fileUrl);
    var id = fileUrl.slice(8);
    if (_urls[id]) return Promise.resolve(_urls[id]);
    return ref("archivos", id).get().then(function (s) {
      if (!s.exists) return null;
      var d = s.data(), bin = atob(d.data), arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return (_urls[id] = URL.createObjectURL(new Blob([arr], { type: d.mime })));
    });
  }
  function abrirArchivo(fileUrl, nombre) {
    var w = window.open("", "_blank");
    return urlArchivo(fileUrl).then(function (u) {
      if (!u) { if (w) w.close(); toast("No se encontró el archivo.", "error"); return; }
      if (w) w.location.href = u; else { var a = document.createElement("a"); a.href = u; a.download = nombre || "archivo"; a.click(); }
    });
  }

  // ---------- Formatos (§2 de ESPEC.md) ----------
  var fMoney = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var fNum = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
  function money(v) { return fMoney.format(Number(v) || 0); }
  function num(v) { return fNum.format(Number(v) || 0); }
  function aFecha(d) { return d instanceof Date ? d : (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + "T12:00:00") : new Date(d)); }
  function fechaCorta(d) { return d ? aFecha(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }) : "—"; }
  function fechaLarga(d) { return d ? aFecha(d).toLocaleDateString("es-AR", { dateStyle: "long" }) : "—"; }
  function fechaChofer(d) { if (!d) return "—"; var x = aFecha(d); return pad(x.getDate()) + "/" + pad(x.getMonth() + 1) + "/" + x.getFullYear(); }
  function fechaHora(d) { return d ? aFecha(d).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "—"; }
  function hora(d) { return d ? aFecha(d).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "—"; }
  function mes(d) { return aFecha(d).toLocaleDateString("es-AR", { month: "long", year: "numeric" }); }
  function fechaPdf(s) { return s ? String(s).split("-").reverse().join("/") : ""; }
  function pad(n) { return String(n).padStart(2, "0"); }
  function iso(d) { d = d || new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function hoy() { return iso(new Date()); }
  function sumarDias(s, n) { var d = aFecha(s); d.setDate(d.getDate() + n); return iso(d); }
  function round2(x) { return Math.round(((Number(x) || 0) + Number.EPSILON) * 100) / 100; }
  function cheques(v) {
    if (v == null || v === "") return [];
    if (typeof v === "string") { try { v = JSON.parse(v); } catch (e) { return []; } }
    return (Array.isArray(v) ? v : []).map(Number).filter(isFinite);
  }
  function sumaCheques(v) { return cheques(v).reduce(function (a, b) { return a + b; }, 0); }
  // Derivados de factura (§10)
  function neto(f) { return round2((Number(f.amount) || 0) - (Number(f.discountAmount) || 0)); }
  function ctaOriginal(f) { return (f.paymentMethod === "account" && !Number(f.accountAmount)) ? neto(f) : (Number(f.accountAmount) || 0); }
  function saldo(f) { return Math.max(0, round2(ctaOriginal(f) - (Number(f.accountPaidAmount) || 0))); }
  function cobradoAlEntregar(f) { return round2((Number(f.cashAmount) || 0) + (Number(f.transferAmount) || 0) + sumaCheques(f.checkAmounts)); }

  // ---------- UI chica ----------
  var caja;
  function toast(msg, tipo) {
    if (!caja) { caja = document.createElement("div"); caja.className = "ge-toasts"; document.body.appendChild(caja); }
    var t = document.createElement("div"); t.className = "ge-toast " + (tipo === "error" ? "err" : tipo === "info" ? "info" : "ok");
    t.textContent = msg; caja.appendChild(t);
    setTimeout(function () { t.classList.add("fuera"); setTimeout(function () { t.remove(); }, 300); }, tipo === "error" ? 5000 : 3000);
  }
  function h(html) { var t = document.createElement("template"); t.innerHTML = String(html).trim(); return t.content.firstElementChild; }
  /* modal({titulo, html, onAbrir(el), ancho}) → {el, cerrar} */
  function modal(op) {
    var fondo = h('<div class="ge-modal-fondo"><div class="ge-modal card" role="dialog" aria-modal="true" style="' + (op.ancho ? "max-width:" + op.ancho : "") + '">' +
      '<div class="ge-modal-cab"><h2>' + esc(op.titulo || "") + '</h2><button class="btn btn-ghost btn-icon ge-x" aria-label="Cerrar">✕</button></div>' +
      '<div class="ge-modal-cuerpo"></div></div></div>');
    var cuerpo = fondo.querySelector(".ge-modal-cuerpo");
    if (typeof op.html === "string") cuerpo.innerHTML = op.html; else if (op.html) cuerpo.appendChild(op.html);
    function cerrar() { fondo.remove(); document.removeEventListener("keydown", tecla); if (op.onCerrar) op.onCerrar(); }
    function tecla(e) { if (e.key === "Escape") cerrar(); }
    fondo.querySelector(".ge-x").onclick = cerrar;
    fondo.addEventListener("mousedown", function (e) { if (e.target === fondo) cerrar(); });
    document.addEventListener("keydown", tecla);
    document.body.appendChild(fondo);
    if (op.onAbrir) op.onAbrir(cuerpo);
    return { el: cuerpo, cerrar: cerrar };
  }
  function confirmar(texto, si) {
    return new Promise(function (ok) {
      var m = modal({ titulo: "Confirmar", html: '<p>' + esc(texto) + '</p><div class="ge-acciones"><button class="btn btn-outline ge-no">Cancelar</button><button class="btn btn-primary ge-si">' + esc(si || "Confirmar") + '</button></div>', onCerrar: function () { ok(false); } });
      m.el.querySelector(".ge-no").onclick = function () { m.cerrar(); };
      m.el.querySelector(".ge-si").onclick = function () { ok(true); m.cerrar(); };
    });
  }
  function bandaPrueba() {
    if (!PRUEBA) return;
    var b = h('<div class="ge-banda-prueba">MODO PRUEBA · datos de ensayo (entregas_prueba) · <a href="?prueba=0">salir</a></div>');
    document.body.prepend(b);
  }
  document.addEventListener("DOMContentLoaded", bandaPrueba);

  // Logo como dataURL (para jsPDF)
  var _logo;
  function logoDataUrl() {
    if (_logo) return _logo;
    _logo = fetch("logo.png").then(function (r) { return r.blob(); }).then(function (b) {
      return new Promise(function (ok) { var f = new FileReader(); f.onload = function () { ok(f.result); }; f.readAsDataURL(b); });
    }).catch(function () { return null; });
    return _logo;
  }

  window.GE = {
    app: app, auth: auth, db: db, firebase: firebase, PRUEBA: PRUEBA, BASE: BASE, RAIZ: RAIZ,
    col: col, ref: ref, configRef: configRef, anonimo: anonimo, requerirAdmin: requerirAdmin, salir: salir,
    nuevoId: nuevoId, donde: donde, dondeEn: dondeEn, todos: todos, uno: uno, guardar: guardar, actualizar: actualizar, borrar: borrar, datos: datos,
    guardarArchivo: guardarArchivo, urlArchivo: urlArchivo, abrirArchivo: abrirArchivo,
    money: money, num: num, fechaCorta: fechaCorta, fechaLarga: fechaLarga, fechaChofer: fechaChofer, fechaHora: fechaHora, hora: hora, mes: mes, fechaPdf: fechaPdf,
    iso: iso, hoy: hoy, sumarDias: sumarDias, round2: round2, cheques: cheques, sumaCheques: sumaCheques,
    neto: neto, ctaOriginal: ctaOriginal, saldo: saldo, cobradoAlEntregar: cobradoAlEntregar,
    esc: esc, h: h, toast: toast, modal: modal, confirmar: confirmar, logoDataUrl: logoDataUrl,
    // Los timestamps se guardan como string ISO (así vinieron de Manus): deliveredAt, spentAt, closedAt, createdAt, paidAt, issuedAt…
    ahora: function () { return new Date().toISOString(); }
  };
})();
