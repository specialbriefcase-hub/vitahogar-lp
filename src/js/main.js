(function () {
    var btn = document.getElementById('burger');
    var menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;

    var iconOpen = btn.querySelector('[data-icon-menu]');
    var iconClose = btn.querySelector('[data-icon-close]');
    var links = menu.querySelectorAll('[data-menu-link]');
    var firstLink = links[0];
    var mqDesktop = window.matchMedia('(min-width: 768px)');

    function setOpen(open) {
      if (open) {
        menu.hidden = false;
        // Force a reflow so the CSS transition plays from the closed state.
        menu.offsetHeight;
        menu.classList.add('is-open');
        menu.setAttribute('aria-hidden', 'false');
        btn.setAttribute('aria-expanded', 'true');
        btn.setAttribute('aria-label', 'Cerrar menú');
        if (iconOpen) iconOpen.classList.add('hidden');
        if (iconClose) iconClose.classList.remove('hidden');
        if (firstLink) firstLink.focus({ preventScroll: true });
      } else {
        menu.classList.remove('is-open');
        menu.setAttribute('aria-hidden', 'true');
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-label', 'Abrir menú');
        if (iconOpen) iconOpen.classList.remove('hidden');
        if (iconClose) iconClose.classList.add('hidden');
        setTimeout(function () {
          if (!menu.classList.contains('is-open')) menu.hidden = true;
        }, 220);
      }
    }
    var isOpen = function () { return menu.classList.contains('is-open'); };

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!isOpen());
    });

    links.forEach(function (link) {
      link.addEventListener('click', function () { setOpen(false); });
    });

    document.addEventListener('click', function (e) {
      if (!isOpen()) return;
      if (menu.contains(e.target) || btn.contains(e.target)) return;
      setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) { setOpen(false); btn.focus(); }
    });

    // Auto-close if the viewport grows past the md breakpoint while open.
    function onMq(e) { if (e.matches && isOpen()) setOpen(false); }
    if (mqDesktop.addEventListener) mqDesktop.addEventListener('change', onMq);
    else mqDesktop.addListener(onMq);
  })();

  /* TopNavBar link animation — FLIP morph + IntersectionObserver scroll spy.
     Mirrors the burger-menu IIFE style (line 811). Respects
     prefers-reduced-motion. See docs/superpowers/specs/2026-07-13-topnavbar-link-animation-design.md. */
  (function () {
    var row = document.querySelector('[data-nav-row]');
    var underline = document.getElementById('nav-underline');
    var desktopLinks = row ? Array.prototype.slice.call(row.querySelectorAll('[data-nav-link]')) : [];
    var mobileLinks = Array.prototype.slice.call(document.querySelectorAll('#mobile-menu [data-nav-link]'));
    var burger = document.getElementById('burger');
    var nav = document.querySelector('nav[aria-label="Principal"]');

    if (!row || !underline || desktopLinks.length === 0) return;

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
    var MORPH_MS = reduced ? 0 : 350;
    var CLICK_FLASH_MS = reduced ? 0 : 180;
    var GROW_MS = reduced ? 0 : 200;
    var PULSE_MS = 200;

    var currentTarget = ''; // current active data-target value ('' = Inicio)
    var rafPending = false;
    var pendingTarget = null;
    var clickLock = false;

    function targetOf(link) {
      return link ? (link.getAttribute('data-target') || '') : '';
    }

    function setMobileActive(target) {
      for (var i = 0; i < mobileLinks.length; i++) {
        var link = mobileLinks[i];
        if (targetOf(link) === target) link.classList.add('is-active');
        else link.classList.remove('is-active');
      }
    }

    function pulseBurger() {
      if (!burger || reduced) return;
      burger.classList.add('is-pulsing');
      setTimeout(function () { burger.classList.remove('is-pulsing'); }, PULSE_MS);
    }

    function placeUnderline(link, animate) {
      var r = link.getBoundingClientRect();
      var rr = row.getBoundingClientRect();
      var x = r.left - rr.left;
      underline.style.width = r.width + 'px';
      underline.style.transform = 'translateX(' + x + 'px)';
      if (animate) {
        underline.style.transition = 'transform ' + MORPH_MS + 'ms ' + EASE + ', width ' + MORPH_MS + 'ms ' + EASE;
      } else {
        underline.style.transition = 'none';
        // Force a reflow so the no-transition position is committed
        // before we re-enable transitions.
        void underline.offsetWidth;
        underline.style.transition = 'transform ' + MORPH_MS + 'ms ' + EASE + ', width ' + MORPH_MS + 'ms ' + EASE;
      }
    }

    function morphToTarget(target) {
      if (target === currentTarget) return;
      currentTarget = target;
      var link = null;
      for (var i = 0; i < desktopLinks.length; i++) {
        if (targetOf(desktopLinks[i]) === target) { link = desktopLinks[i]; break; }
      }
      if (link) placeUnderline(link, true);
      setMobileActive(target);
    }

    function scheduleMorph(target) {
      if (target === currentTarget) return;
      pendingTarget = target;
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(function () {
        rafPending = false;
        if (pendingTarget !== null) {
          var t = pendingTarget;
          pendingTarget = null;
          morphToTarget(t);
        }
      });
    }

    function scrollToTarget(target) {
      if (target === '') {
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
        return;
      }
      var el = document.getElementById(target);
      if (!el) return;
      var offset = nav ? nav.offsetHeight : 80;
      var top = el.getBoundingClientRect().top + window.pageYOffset - offset + 1;
      window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
    }

    // Click handler
    function onClick(e) {
      var link = e.currentTarget;
      var target = targetOf(link);
      if (target === currentTarget) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      clickLock = true;
      // Color flash on clicked link
      link.classList.add('is-clicking');
      setTimeout(function () { link.classList.remove('is-clicking'); }, CLICK_FLASH_MS);
      // Grow underline under clicked link (no morph, no translate).
      var r = link.getBoundingClientRect();
      var rr = row.getBoundingClientRect();
      var x = r.left - rr.left;
      underline.style.transition = 'transform ' + GROW_MS + 'ms ' + EASE + ', width ' + GROW_MS + 'ms ' + EASE;
      underline.style.width = r.width + 'px';
      underline.style.transform = 'translateX(' + x + 'px) scaleX(1)';
      // After the grow, scroll + morph
      setTimeout(function () {
        scrollToTarget(target);
        // The IntersectionObserver will pick up the new section and
        // schedule a morph. As a safety net, also schedule one here.
        scheduleMorph(target);
        setTimeout(function () { clickLock = false; }, 600);
      }, GROW_MS);
    }

    for (var i = 0; i < desktopLinks.length; i++) {
      desktopLinks[i].addEventListener('click', onClick);
    }

    // Scroll spy via IntersectionObserver
    var sectionIds = ['proceso', 'requisitos', 'testimonios', 'contacto'];
    var sections = sectionIds
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);

    function dominantSection() {
      // Among sections currently in the band, pick the one whose top
      // is closest to the trigger line. If none, fall back to the
      // last one if we're near the bottom of the document.
      if (sections.length === 0) return '';
      var inBand = [];
      var vh = window.innerHeight;
      for (var i = 0; i < sections.length; i++) {
        var s = sections[i];
        var rect = s.getBoundingClientRect();
        // "in band" means the section's top has crossed below the upper 30% mark
        // and the section is still in view.
        if (rect.top <= vh * 0.35 && rect.bottom > 0) {
          inBand.push({ id: s.id, top: rect.top });
        }
      }
      if (inBand.length > 0) {
        // Pick the section whose top is the largest (closest to trigger line from above).
        inBand.sort(function (a, b) { return b.top - a.top; });
        return inBand[0].id;
      }
      // Fallback: near bottom of document -> activate the last link.
      var atBottom = (window.innerHeight + window.pageYOffset) >= (document.documentElement.scrollHeight - 4);
      if (atBottom) return 'contacto';
      return '';
    }

    function onScroll() {
      if (clickLock) return;
      var t = dominantSection();
      scheduleMorph(t);
    }

    if ('IntersectionObserver' in window && sections.length > 0) {
      var io = new IntersectionObserver(function () {
        onScroll();
      }, {
        root: null,
        rootMargin: '-30% 0px -65% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1]
      });
      for (var j = 0; j < sections.length; j++) io.observe(sections[j]);
      window.addEventListener('scroll', onScroll, { passive: true });
    } else {
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    // Re-measure on resize and after fonts load (link widths can change).
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var link = null;
        for (var i = 0; i < desktopLinks.length; i++) {
          if (targetOf(desktopLinks[i]) === currentTarget) { link = desktopLinks[i]; break; }
        }
        if (link) placeUnderline(link, false);
      }, 100);
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        var link = null;
        for (var i = 0; i < desktopLinks.length; i++) {
          if (targetOf(desktopLinks[i]) === currentTarget) { link = desktopLinks[i]; break; }
        }
        if (link) placeUnderline(link, false);
      });
    }

    // Burger pulse on scroll-driven section changes (independent of
    // morph — the morph is a visual continuity cue; the pulse is a
    // subtle confirmation that something changed).
    var lastDominant = '';
    var io2 = ('IntersectionObserver' in window)
      ? new IntersectionObserver(function () {
          var t = dominantSection();
          if (t !== lastDominant) {
            lastDominant = t;
            pulseBurger();
          }
        }, { root: null, rootMargin: '-30% 0px -65% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] })
      : null;
    if (io2) {
      for (var k = 0; k < sections.length; k++) io2.observe(sections[k]);
    }

    // Boot: place the underline under the initial active link with no animation.
    placeUnderline(desktopLinks[0], false);
  })();

   /* Hover-border gradient controller (Proceso / Requisitos cards).
     Mirrors the Aceternity HoverBorderGradient 4-direction sweep:
     on mouseenter, cycle --ring-angle 0 -> 90 -> 180 -> 270 every STEP_MS.
     On mouseleave, stop and reset. Respects prefers-reduced-motion. */
  (function () {
    var STEP_MS = 1500;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var timers = new WeakMap();

    function start(el) {
      if (reduced) { el.style.setProperty('--ring-angle', '0deg'); return; }
      if (timers.has(el)) return;
      var angle = 0;
      el.style.setProperty('--ring-angle', angle + 'deg');
      var id = setInterval(function () {
        angle = (angle + 90) % 360;
        el.style.setProperty('--ring-angle', angle + 'deg');
      }, STEP_MS);
      timers.set(el, id);
    }

    function stop(el) {
      var id = timers.get(el);
      if (id != null) { clearInterval(id); timers.delete(el); }
      el.style.setProperty('--ring-angle', '0deg');
    }

    document.addEventListener('mouseenter', function (e) {
      var el = e.target.closest && e.target.closest('.card-hover-ring');
      if (el) start(el);
    }, true);
    document.addEventListener('mouseleave', function (e) {
      var el = e.target.closest && e.target.closest('.card-hover-ring');
      if (el) stop(el);
    }, true);
    document.addEventListener('focusin', function (e) {
      var el = e.target.closest && e.target.closest('.card-hover-ring');
      if (el) start(el);
    });
    document.addEventListener('focusout', function (e) {
      var el = e.target.closest && e.target.closest('.card-hover-ring');
      if (el) stop(el);
    });
  })();

  (function(){
  "use strict";

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ⚠️ PEGAR AQUÍ la URL terminada en /exec que te da Apps Script al desplegar
  // (ver instrucciones de despliegue más abajo).
  var SHEETS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxj7M4WnXppLWMjgOVM0fFzGgd_qTp0oxBdwi1sk1F0RpPOX_OtitEfTVtLxn-jwmu6/exec';

  /* ════════════════════════════════════════════════════════════════════
     PARÁMETROS MEJORAVIT (verificados julio 2026)
     ════════════════════════════════════════════════════════════════════ */
  var P = {
    MIN: 10698.67,
    MAX: 169039.02,
    UMBRAL: 42794.69,
    T10: 0.10,
    T11: 0.11,
    PL5: 5,
    PL10: 10
  };
  var SALARIO_MINIMO = 9582.47; // Zona General 2026 (incluye CDMX), verificado
  var SALDO_MINIMO = 12000; // P.MIN / 0.9 = $11,887.41 redondeado (sin techo máximo)

  /* ════════════════════════════════════════════════════════════════════
     FUNCIONES FINANCIERAS — idénticas al simulador (simulador_mejoravit_15)
     ════════════════════════════════════════════════════════════════════ */
  function PMT(rate, nper, pv){
    if (rate === 0) return pv / nper;
    return pv * rate / (1 - Math.pow(1 + rate, -nper));
  }

  /* ════════════════════════════════════════════════════════════════════
     TABLA DE AMORTIZACIÓN (resumen) — misma lógica mes a mes que "genTabla"
     del simulador completo; solo se conservan los totales que este módulo
     necesita (meses reales para liquidar y aportación patronal total).
     ════════════════════════════════════════════════════════════════════ */
  function calcularAmortizacionResumen(monto, tasaM, retM, aport){
    var saldo = monto;
    var mes = 1;
    var mesesCount = 0;
    var totalPatron = 0;
    while (saldo > 0.005 && mes <= 120){
      var interes = saldo * tasaM;
      var si = saldo + interes;
      var pagoProg = retM + aport;
      var k = Math.min(si, pagoProg);
      var apEf = k < aport ? k : aport;
      var sf = Math.max(0, si - k);
      totalPatron += apEf;
      mesesCount++;
      saldo = sf;
      mes++;
      if (saldo < 0.005) break;
    }
    return { meses: mesesCount, totalPatron: totalPatron };
  }

  /* ════════════════════════════════════════════════════════════════════
     MOTOR DE PRECALIFICACIÓN
     - Usa siempre el PLAZO MÁXIMO permitido
     - saldoRef viene directamente del campo numérico de la Vista 3
     ════════════════════════════════════════════════════════════════════ */
  function calcularPrecalificacion(saldoRef, salario){
    var aport = salario * 0.05;
    var mc = saldoRef * 0.9;
    if (mc < P.MIN){
      return { ok:false };
    }
    var monto = Math.min(mc, P.MAX);
    var tasa  = monto <= P.UMBRAL ? P.T10 : P.T11;
    var tasaM = tasa / 12;
    var plMax = monto < P.UMBRAL ? P.PL5 : P.PL10;
    var plazoM = plMax * 12;
    var retM = PMT(tasaM, plazoM, monto);
    var pagoM = retM + aport;
    var amort = calcularAmortizacionResumen(monto, tasaM, retM, aport);
    return { ok:true, monto:monto, tasa:tasa, plMax:plMax, retM:retM, aport:aport, pagoM:pagoM, mesesLiq:amort.meses, totPatron:amort.totalPatron };
  }

  var MXN = function(v){
    return new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN', minimumFractionDigits:0, maximumFractionDigits:0 }).format(v);
  };

  /* ════════════════════════════════════════════════════════════════════
     NAVEGACIÓN DEL WIZARD
     ════════════════════════════════════════════════════════════════════ */
  var root = document.getElementById('precal-mejoravit');
  var STEP_INFO = {
    v2: { n:1, label:'Elegibilidad' },
    v3: { n:2, label:'Tus datos' },
    v4: { n:3, label:'Resultado' }
  };

  function updateProgress(id){
    var wrap = document.getElementById('progressWrap');
    var info = STEP_INFO[id];
    if (!info){ wrap.classList.add('hidden'); return; }
    wrap.classList.remove('hidden');
    document.getElementById('progressLabel').textContent = 'Paso ' + info.n + ' de 3 · ' + info.label;
    var pct = Math.round(info.n/3*100);
    document.getElementById('progressPct').textContent = pct + '%';
    document.getElementById('progressBar').style.width = pct + '%';
    document.getElementById('progressBarTrack').setAttribute('aria-valuenow', pct);
  }

  function ensureModuleVisible(){
    var rect = root.getBoundingClientRect();
    if (rect.top < 0 || rect.top > window.innerHeight * 0.25){
      root.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block:'start' });
    }
  }

  function showView(id){
    var current = root.querySelector('.precal-view.active');
    var next = root.querySelector('.precal-view[data-view="' + id + '"]');
    if (!next || current === next) return;
    if (current){
      current.classList.add('leaving');
      window.setTimeout(function(){
        current.classList.remove('active');
        current.classList.remove('leaving');
        next.classList.add('active');
        updateProgress(id);
        ensureModuleVisible();
      }, reducedMotion ? 0 : 180);
    } else {
      next.classList.add('active');
      updateProgress(id);
    }
  }

  document.getElementById('btnGoStart').addEventListener('click', function(){
    showView('v2');
  });

  /* ════════════════════════════════════════════════════════════════════
     VISTA 2 — Elegibilidad
     ════════════════════════════════════════════════════════════════════ */
  var respCredito = null;
  var respIMSS = null;
  var v2Section = root.querySelector('[data-view="v2"]');

  v2Section.querySelectorAll('[data-q]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var q = btn.getAttribute('data-q');
      var val = btn.getAttribute('data-val');
      v2Section.querySelectorAll('[data-q="' + q + '"]').forEach(function(b){ b.classList.remove('selected'); });
      btn.classList.add('selected');
      if (q === 'credito') respCredito = val;
      if (q === 'imss') respIMSS = val;
      document.getElementById('btnContinuarElegibilidad').disabled = !(respCredito && respIMSS);
    });
  });

  document.getElementById('btnContinuarElegibilidad').addEventListener('click', function(){
    if (respCredito === 'si' || respIMSS === 'no'){
      var motivo = respCredito === 'si'
        ? 'Detectamos que actualmente cuentas con un crédito Infonavit vigente. Mejoravit solo aplica si no tienes otro crédito de este tipo activo.'
        : 'Para acceder a Mejoravit necesitas tener una relación laboral vigente y estar cotizando activamente en el IMSS.';
      document.getElementById('vxMotivo').textContent = motivo;
      showView('vx');
    } else {
      showView('v3');
    }
  });

  /* ════════════════════════════════════════════════════════════════════
     VISTA 3 — Datos (salario + saldo)
     ════════════════════════════════════════════════════════════════════ */
  var inSalario = document.getElementById('inSalario');
  var salarioError = document.getElementById('salarioError');
  var salarioErrorText = document.getElementById('salarioErrorText');
  var inSaldo = document.getElementById('inSaldo');
  var saldoError = document.getElementById('saldoError');
  var saldoErrorText = document.getElementById('saldoErrorText');
  var btnVerResultado = document.getElementById('btnVerResultado');

  function salarioEsValido(){
    var val = parseFloat(inSalario.value);
    return !isNaN(val) && val >= SALARIO_MINIMO;
  }

  function onSalarioInput(){
    var val = parseFloat(inSalario.value);
    if (inSalario.value !== '' && !isNaN(val) && val > 0 && val < SALARIO_MINIMO){
      salarioErrorText.textContent = 'El salario debe ser de al menos ' + MXN(SALARIO_MINIMO) + ' (salario mínimo mensual vigente) para continuar.';
      salarioError.classList.remove('hidden');
    } else {
      salarioError.classList.add('hidden');
    }
    refreshBtnVerResultado();
  }
  inSalario.addEventListener('input', onSalarioInput);

  function saldoEsValido(){
    var val = parseFloat(inSaldo.value);
    return !isNaN(val) && val >= SALDO_MINIMO;
  }

  function onSaldoInput(){
    var val = parseFloat(inSaldo.value);
    if (inSaldo.value !== '' && !isNaN(val) && val > 0 && val < SALDO_MINIMO){
      saldoErrorText.textContent = 'Para calificar a Mejoravit, el saldo debe ser de al menos ' + MXN(SALDO_MINIMO) + '.';
      saldoError.classList.remove('hidden');
    } else {
      saldoError.classList.add('hidden');
    }
    refreshBtnVerResultado();
  }
  inSaldo.addEventListener('input', onSaldoInput);

  function refreshBtnVerResultado(){
    btnVerResultado.disabled = !(salarioEsValido() && saldoEsValido());
  }

  /* ════════════════════════════════════════════════════════════════════
     VISTA 3 → VISTA 4 (cálculo + animación de números)
     ════════════════════════════════════════════════════════════════════ */
  var ultimoResultado = null; // se usa al enviar el lead (monto mostrado en resMonto)

  function animateNumber(el, target, opts){
    opts = opts || {};
    var duration = opts.duration || 1100;
    if (reducedMotion){
      el.textContent = MXN(target);
      return;
    }
    var startTime = null;
    function tick(now){
      if (startTime === null) startTime = now;
      var p = Math.min(1, (now - startTime) / duration);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = Math.round(target * eased);
      el.textContent = MXN(val);
      if (p < 1) window.requestAnimationFrame(tick);
      else el.textContent = MXN(target);
    }
    window.requestAnimationFrame(tick);
  }

  btnVerResultado.addEventListener('click', function(){
    var salario = parseFloat(inSalario.value);
    var saldo = parseFloat(inSaldo.value);
    var r = calcularPrecalificacion(saldo, salario);

    if (!r.ok){
      document.getElementById('vxMotivo').textContent = 'Con los datos proporcionados, el monto estimado de tu Subcuenta de Vivienda es menor al mínimo requerido por Infonavit para este crédito.';
      showView('vx');
      return;
    }

    ultimoResultado = r;

    document.getElementById('v4Main').classList.remove('hidden');
    document.getElementById('v4Thanks').classList.add('hidden');
    showView('v4');

    window.setTimeout(function(){
      animateNumber(document.getElementById('resMonto'), Math.round(r.monto));
      animateNumber(document.getElementById('resPago'), Math.round(r.retM));
      animateNumber(document.getElementById('resPatron'), Math.round(r.totPatron));
      var mesesEl = document.getElementById('resMeses');
      if (reducedMotion){
        mesesEl.textContent = r.mesesLiq + ' meses';
      } else {
        var startTime = null;
        var duration = 1100;
        function tickMeses(now){
          if (startTime === null) startTime = now;
          var p = Math.min(1, (now - startTime) / duration);
          var eased = 1 - Math.pow(1 - p, 3);
          var val = Math.round(r.mesesLiq * eased);
          mesesEl.textContent = val + ' meses';
          if (p < 1) window.requestAnimationFrame(tickMeses);
          else mesesEl.textContent = r.mesesLiq + ' meses';
        }
        window.requestAnimationFrame(tickMeses);
      }
    }, reducedMotion ? 0 : 220);
  });

  document.getElementById('btnEditarV4').addEventListener('click', function(){
    showView('v3');
  });

  /* ════════════════════════════════════════════════════════════════════
     FORMULARIO DE CONTACTO — solo Vista 4
     ════════════════════════════════════════════════════════════════════ */
  var inNombreV4 = document.getElementById('inNombreV4');
  var inTelV4 = document.getElementById('inTelV4');
  var chkConsentV4 = document.getElementById('chkConsentV4');
  var btnEnviarV4 = document.getElementById('btnEnviarV4');

  function checkLeadFormV4(){
    var okNombre = inNombreV4.value.trim().length >= 3;
    var okTel = /^\d{10}$/.test(inTelV4.value.replace(/\D/g, ''));
    btnEnviarV4.disabled = !(okNombre && okTel && chkConsentV4.checked);
  }
  inNombreV4.addEventListener('input', checkLeadFormV4);
  inTelV4.addEventListener('input', function(){
    inTelV4.value = inTelV4.value.replace(/\D/g, '').slice(0, 10);
    checkLeadFormV4();
  });
  chkConsentV4.addEventListener('change', checkLeadFormV4);

  btnEnviarV4.addEventListener('click', function(){
    submitLead(inNombreV4.value.trim());
  });

  function submitLead(nombre){
    var telefono = inTelV4.value.replace(/\D/g, '');
    var montoResultado = ultimoResultado ? Math.round(ultimoResultado.monto) : null;

    var payload = {
      nombre: nombre,
      telefono: telefono,
      resultadoSimulacion: montoResultado
    };

    // Envío a Google Sheets vía Apps Script Web App. "text/plain" evita el
    // preflight CORS (comportamiento confirmado y documentado de Apps
    // Script). Es "fire and forget": no bloquea la confirmación visual
    // del usuario aunque la red tarde o falle.
    fetch(SHEETS_WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    })
      .then(function(res){ return res.json(); })
      .then(function(json){
        if (!json.ok){
          console.warn('[Sheets] El servidor respondió con un error:', json.error);
        } else {
          console.info('[Sheets] Lead guardado correctamente, id=' + json.id);
        }
      })
      .catch(function(err){
        console.warn('[Sheets] No se pudo contactar el Web App (revisar SHEETS_WEBAPP_URL o la conexión):', err);
      });

    var mainBlock = document.getElementById('v4Main');
    var thanksBlock = document.getElementById('v4Thanks');
    var thanksTitle = document.getElementById('v4ThanksTitle');
    var primerNombre = nombre.split(' ')[0];
    thanksTitle.textContent = '¡Listo, ' + primerNombre + '!';
    mainBlock.classList.add('hidden');
    thanksBlock.classList.remove('hidden');

    // Requisito nuevo: reiniciar todo el módulo y volver a la Vista 1,
    // tras mostrar la confirmación 5 segundos.
    window.setTimeout(function(){
      resetModulo();
    }, 5000);
  }

  /* ════════════════════════════════════════════════════════════════════
     REINICIO COMPLETO DEL MÓDULO (tras enviar la solicitud)
     ════════════════════════════════════════════════════════════════════ */
  function resetModulo(){
    // Vista 2 — elegibilidad
    respCredito = null;
    respIMSS = null;
    v2Section.querySelectorAll('[data-q]').forEach(function(b){ b.classList.remove('selected'); });
    document.getElementById('btnContinuarElegibilidad').disabled = true;

    // Vista 3 — datos
    inSalario.value = '';
    inSaldo.value = '';
    salarioError.classList.add('hidden');
    saldoError.classList.add('hidden');
    btnVerResultado.disabled = true;

    // Vista 4 — resultado y formulario
    ultimoResultado = null;
    document.getElementById('resMonto').textContent = '$0';
    document.getElementById('resPago').textContent = '$0';
    document.getElementById('resMeses').textContent = '0 meses';
    document.getElementById('resPatron').textContent = '$0';
    inNombreV4.value = '';
    inTelV4.value = '';
    chkConsentV4.checked = false;
    btnEnviarV4.disabled = true;
    document.getElementById('v4Main').classList.remove('hidden');
    document.getElementById('v4Thanks').classList.add('hidden');

    // Vista Extra
    document.getElementById('vxMotivo').textContent = '';

    // Volver a la Vista 1
    showView('v1');
  }

})();