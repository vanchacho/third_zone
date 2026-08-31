/* ================= THIRD ZONE — shared behaviour ================= */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Mobile nav toggle ---- */
  var hamb = document.getElementById("hamb");
  var panel = document.getElementById("mobilePanel");
  if (hamb && panel) {
    hamb.addEventListener("click", function () {
      var open = panel.classList.toggle("open");
      hamb.classList.toggle("open", open);
      hamb.setAttribute("aria-expanded", open ? "true" : "false");
    });
    panel.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        panel.classList.remove("open");
        hamb.classList.remove("open");
      });
    });
  }

  /* ---- Count-up numbers (HUD + stat band) ---- */
  function countUp(el) {
    var target = parseFloat(el.dataset.count);
    var dp = (el.dataset.count.split(".")[1] || "").length;
    if (reduce) { el.textContent = target.toFixed(dp); return; }
    var dur = 1400, start = null;
    function tick(now) {
      if (start === null) start = now;
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(dp);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target.toFixed(dp);
    }
    requestAnimationFrame(tick);
  }
  document.querySelectorAll("[data-countgroup]").forEach(function (group) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          group.querySelectorAll("[data-count]").forEach(countUp);
          obs.disconnect();
        }
      });
    }, { threshold: 0.35 });
    obs.observe(group);
  });

  /* ---- Scroll reveal ---- */
  var revObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); revObs.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll(".reveal").forEach(function (el) { revObs.observe(el); });

  /* ---- Games filter ---- */
  var filters = document.querySelectorAll("[data-filter]");
  if (filters.length) {
    filters.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cat = btn.dataset.filter;
        filters.forEach(function (b) { b.classList.toggle("active", b === btn); });
        document.querySelectorAll("[data-cat]").forEach(function (card) {
          var show = cat === "all" || card.dataset.cat.indexOf(cat) !== -1;
          card.style.display = show ? "" : "none";
        });
      });
    });
  }

  /* ---- Interactive power meter ---- */
  var meter = document.getElementById("meter");
  if (meter) {
    var fill = document.getElementById("meterFill");
    var read = document.getElementById("meterRead");
    var grade = document.getElementById("meterGrade");
    var swingBtn = document.getElementById("meterSwing");
    var resetBtn = document.getElementById("meterReset");
    var raf = null;

    function setValue(mph) {
      var pct = Math.max(0, Math.min(100, (mph / 130) * 100));
      fill.style.width = pct + "%";
      read.childNodes[0].nodeValue = String(Math.round(mph));
      var g = "WARM UP";
      if (mph > 118) g = "★ ELITE — TOP 1% SWING";
      else if (mph > 100) g = "PRO LEVEL — NEW HIGH SCORE";
      else if (mph > 80) g = "STRONG — LEADERBOARD READY";
      else if (mph > 55) g = "SOLID CONTACT";
      else if (mph > 20) g = "NICE — KEEP GOING";
      grade.textContent = g;
    }

    function swing() {
      if (raf) cancelAnimationFrame(raf);
      // random-ish target so every swing differs, without Math.random dependency issues
      var target = 60 + (performance.now() % 65);
      var start = null, dur = 900;
      grade.textContent = "READING SWING…";
      function tick(now) {
        if (start === null) start = now;
        var p = Math.min((now - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        // overshoot then settle for a springy feel
        var over = Math.sin(p * Math.PI) * 12 * (1 - p);
        setValue(target * eased + over);
        if (p < 1) raf = requestAnimationFrame(tick);
        else setValue(target);
      }
      raf = requestAnimationFrame(tick);
    }

    function reset() {
      if (raf) cancelAnimationFrame(raf);
      setValue(0);
      grade.textContent = "READY";
    }

    swingBtn.addEventListener("click", swing);
    if (resetBtn) resetBtn.addEventListener("click", reset);
    reset();
  }

  /* ---- Pipeline rig: stages light up one by one as you scroll ---- */
  var boardWrap = document.getElementById("board3d");
  var boardStage = document.getElementById("boardStage");
  if (boardWrap && boardStage) {
    var stages = boardWrap.querySelectorAll(".stage");
    var cables = boardWrap.querySelectorAll(".cable");
    var ticking = false;
    var visible = false;
    var lastRot = null;
    var lastLit = -1;
    var spin = true;

    // how far the rig has travelled through the viewport, 0 -> 1
    function progress(r, vh) {
      return Math.max(0, Math.min(1, (vh * 0.85 - r.top) / (vh * 0.62 + r.height * 0.5)));
    }

    function draw() {
      ticking = false;
      if (!visible) return;
      var r = boardWrap.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;

      // 1. boards keep spinning with the scroll
      if (spin) {
        var rotY = -20 + (vh - r.top) * 0.5;
        if (lastRot === null || Math.abs(rotY - lastRot) >= 1.4) {
          lastRot = rotY;
          boardStage.style.setProperty("--ry", rotY.toFixed(1) + "deg");
        }
      }

      // 2. light the stages in order: sensor -> edge -> AI -> score
      var p = progress(r, vh);
      var lit = Math.floor(p * (stages.length + 0.6));
      if (lit === lastLit) return;
      lastLit = lit;
      for (var i = 0; i < stages.length; i++) {
        stages[i].classList.toggle("on", i < lit);
      }
      for (var j = 0; j < cables.length; j++) {
        cables[j].classList.toggle("on", j < lit - 1);
      }
      boardWrap.classList.toggle("complete", lit >= stages.length);
    }

    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(draw); }
    }

    if (reduce) {
      for (var k = 0; k < stages.length; k++) stages[k].classList.add("on");
      for (var m = 0; m < cables.length; m++) cables[m].classList.add("on");
      boardWrap.classList.add("complete");
      boardStage.style.setProperty("--ry", "-24deg");
    } else {
      // weak devices: keep the pipeline, drop the continuous 3D spin
      var cores = navigator.hardwareConcurrency || 8;
      if (cores <= 4) {
        boardWrap.classList.add("lite");
        boardStage.style.setProperty("--ry", "-22deg");
      }
      spin = cores > 4;
      var vizObs = new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        boardWrap.classList.toggle("idle", !visible);
        if (visible) onScroll();
      }, { rootMargin: "140px 0px" });
      vizObs.observe(boardWrap);
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      draw();
    }
  }

  /* ---- Contact form ---- */
  // Submits to Netlify (when hosted there) via AJAX so the inline
  // "thanks" message still shows; degrades gracefully anywhere else.
  var form = document.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = document.getElementById("formOk");
      var body = new URLSearchParams(new FormData(form)).toString();
      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body
      }).catch(function () {}).then(function () {
        if (ok) ok.classList.add("show");
        form.reset();
      });
    });
  }
})();
