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

  /* ---- 3D board: rotates as it travels through the viewport ---- */
  var boardWrap = document.getElementById("board3d");
  var boardStage = document.getElementById("boardStage");
  if (boardWrap && boardStage && !reduce) {
    var boardTicking = false;
    var boardVisible = false;
    var lastRot = null;

    function drawBoard() {
      boardTicking = false;
      if (!boardVisible) return;               // never touch the scene off-screen
      var r = boardWrap.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var travel = vh - r.top;                 // grows steadily as you scroll down
      var rotY = -20 + travel * 0.62;          // ~360° per 580px of scroll
      // skip sub-degree updates: a repaint of this scene is expensive
      if (lastRot !== null && Math.abs(rotY - lastRot) < 0.6) return;
      lastRot = rotY;
      boardStage.style.setProperty("--ry", rotY.toFixed(1) + "deg");
    }
    function onScrollBoard() {
      if (!boardTicking) { boardTicking = true; requestAnimationFrame(drawBoard); }
    }

    // only run — and only animate — while the rig is actually on screen
    var vizObs = new IntersectionObserver(function (entries) {
      boardVisible = entries[0].isIntersecting;
      boardWrap.classList.toggle("idle", !boardVisible);
      if (boardVisible) onScrollBoard();
    }, { rootMargin: "120px 0px" });
    vizObs.observe(boardWrap);

    window.addEventListener("scroll", onScrollBoard, { passive: true });
    window.addEventListener("resize", onScrollBoard);
    drawBoard();
  } else if (boardStage) {
    boardStage.style.setProperty("--ry", "-24deg");
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
