/* =========================================================
   ARROW IT — main.js  (shared chrome + animations)
   Injects nav / footer / consent / cursor on every page.
   ========================================================= */
(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover)").matches;
  const path = location.pathname.split("/").pop() || "index.html";

  /* ---------- festival intro loader (home only) ---------- */
  const loader = document.getElementById("loader");
  const heroLogo = document.getElementById("heroLogo");
  const heroTag = document.querySelector(".hero-tag");
  const heroLead = document.querySelector(".hero-lead");
  const heroBtn = document.querySelector(".hero-content .btn-main");
  function revealHero() {
    if (!loader || loader.classList.contains("done")) return;
    loader.classList.add("done");
    [heroLogo, heroTag, heroLead, heroBtn].forEach((el) => el && el.classList.add("in"));
  }
  if (loader) {
    addEventListener("load", () => setTimeout(revealHero, 1900));
    setTimeout(revealHero, 3600);
  }

  /* ---------- inject shared chrome ---------- */
  const NAV = `
  <header class="nav-wrap">
    <nav class="nav" aria-label="Hauptnavigation">
      <a href="index.html" class="nav-brand"><img class="logo-mark nav-logo" src="assets/img/logo.svg" alt="Arrow IT" /> ARROW IT</a>
      <ul class="nav-links">
        <li><a href="index.html" data-nav="index.html">HOME</a></li>
        <li><a href="services.html" data-nav="services.html">SERVICES</a></li>
        <li><a href="projects.html" data-nav="projects.html">PROJECTS</a></li>
        <li><a href="contact.html" data-nav="contact.html">CONTACT</a></li>
        <li><a href="login.html" id="navLogin">LOGIN</a></li>
      </ul>
    </nav>
  </header>`;

  const FOOTER = `
  <footer class="footer">
    <div class="footer-inner">
      <span class="footer-brand"><img class="logo-mark foot-logo" src="assets/img/logo.svg" alt="Arrow IT" /> ARROW IT</span>
      <span class="footer-tag">IT made easy ✦ Y2K Digital Future</span>
      <span class="footer-links">
        <a href="impressum.html">IMPRESSUM</a> ·
        <a href="agb.html">AGB</a> ·
        <a href="datenschutz.html">DATENSCHUTZ</a>
      </span>
      <span class="footer-copy">© 2026 Arrow IT — Web · Software · Tech Support</span>
    </div>
  </footer>`;

  const OVERLAYS = `
  <div class="grain" aria-hidden="true"></div>
  <div class="vignette" aria-hidden="true"></div>
  <div class="blobs" aria-hidden="true">
    <span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span>
  </div>
  <div class="floaters" aria-hidden="true" id="floaters">
    <span class="f-sphere"></span><span class="f-sphere sm"></span><span class="f-sphere teal"></span>
    <span class="f-star">✦</span><span class="f-star sm">✦</span><span class="f-star pink">✦</span>
    <span class="f-chrome">◈</span><span class="f-arrow">➤</span><span class="f-arrow pink">➤</span><span class="f-ring"></span>
  </div>
  <div class="cursor" id="cursor" aria-hidden="true"></div>
  <div class="cursor-dot" id="cursorDot" aria-hidden="true"></div>
  <div class="progress" id="progress" aria-hidden="true"></div>
  <button class="to-top" id="toTop" aria-label="Back to top">↑</button>`;

  const CONSENT = `
  <div class="consent-overlay" id="consent">
    <div class="consent-box">
      <h2>WILLKOMMEN ✦</h2>
      <p>Bevor du ARROW IT betrittst, bestätige bitte die rechtlichen Hinweise.</p>
      <div class="consent-checks">
        <label><input type="checkbox" id="ckImpressum" /><span>Ich habe das <a href="impressum.html" target="_blank" rel="noopener">Impressum</a> gelesen.</span></label>
        <label><input type="checkbox" id="ckAgb" /><span>Ich akzeptiere die <a href="agb.html" target="_blank" rel="noopener">AGB</a>.</span></label>
      </div>
      <button class="btn-main full" id="consentEnter" disabled>ENTER SITE ➤</button>
      <p class="consent-note">🔒 Deine Daten liegen nur auf Firebase. Kein Verkauf an Dritte.</p>
    </div>
  </div>`;

  document.body.insertAdjacentHTML("afterbegin", OVERLAYS + NAV);
  document.body.insertAdjacentHTML("beforeend", FOOTER + CONSENT);

  // active nav state
  document.querySelectorAll(".nav-links a[data-nav]").forEach((a) => {
    if (a.dataset.nav === path) a.classList.add("active");
  });

  /* ---------- consent gate ---------- */
  const consent = document.getElementById("consent");
  const cImp = document.getElementById("ckImpressum");
  const cAgb = document.getElementById("ckAgb");
  const cEnter = document.getElementById("consentEnter");
  const CONSENT_KEY = "arrow_consent";

  if (localStorage.getItem(CONSENT_KEY)) {
    consent.classList.add("hide");
  } else {
    document.body.classList.add("locked");
    const sync = () => { cEnter.disabled = !(cImp.checked && cAgb.checked); };
    cImp.addEventListener("change", sync);
    cAgb.addEventListener("change", sync);
    cEnter.addEventListener("click", () => {
      localStorage.setItem(CONSENT_KEY, String(Date.now()));
      consent.classList.add("hide");
      document.body.classList.remove("locked");
      window.dispatchEvent(new CustomEvent("arrow:consent"));
    });
  }

  /* ---------- auth-aware nav (set by firebase.js) ---------- */
  // placeholder; firebase.js replaces #navLogin with ACCOUNT/LOGOUT when signed in

  /* ---------- scroll reveal ---------- */
  const revealEls = document.querySelectorAll(
    ".section-head, .poster, .lineup-row, .about-inner, .portal-card, .hero-scroll, .page-hero, .detail-card, .legal article, .contact-wrap, .auth-card"
  );
  revealEls.forEach((el) => el.classList.add("reveal"));

  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("show"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("show"));
  }

  /* ---------- count-up stats ---------- */
  const stats = document.querySelectorAll(".stat-num");
  function countUp(el) {
    const target = parseInt(el.dataset.count, 10) || 0;
    if (reduce) { el.textContent = target; return; }
    const dur = 1400, start = performance.now();
    (function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
      if (p < 1) requestAnimationFrame(tick);
    })(performance.now());
  }
  if (stats.length) {
    if ("IntersectionObserver" in window && !reduce) {
      const so = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { countUp(e.target); so.unobserve(e.target); } });
      }, { threshold: 0.6 });
      stats.forEach((s) => so.observe(s));
    } else stats.forEach(countUp);
  }

  /* ---------- floaters parallax ---------- */
  const floaters = document.querySelectorAll(".floaters > *");
  if (!reduce) {
    window.addEventListener("pointermove", (ev) => {
      const x = (ev.clientX / window.innerWidth - 0.5) * 2;
      const y = (ev.clientY / window.innerHeight - 0.5) * 2;
      floaters.forEach((el, i) => {
        const d = ((i % 5) + 1) * 6;
        el.style.translate = `${x * d}px ${y * d}px`;
      });
    });
  }

  /* ---------- custom cursor ---------- */
  if (canHover && !reduce) {
    const cursor = document.getElementById("cursor");
    const dot = document.getElementById("cursorDot");
    let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
    document.body.classList.add("cursor-on");
    addEventListener("pointermove", (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    });
    (function loop() {
      cx += (mx - cx) * 0.18; cy += (my - cy) * 0.18;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    })();
    document.querySelectorAll("a, button, input, .poster, .lineup-row, label").forEach((el) => {
      el.addEventListener("pointerenter", () => cursor.classList.add("hover"));
      el.addEventListener("pointerleave", () => cursor.classList.remove("hover"));
    });
  }

  /* ---------- progress / nav auto-hide / back-to-top ---------- */
  const progress = document.getElementById("progress");
  const navWrap = document.querySelector(".nav-wrap");
  const toTop = document.getElementById("toTop");
  let lastY = 0;
  function onScroll() {
    const y = scrollY;
    const h = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    if (navWrap) {
      if (y > lastY && y > 120) navWrap.classList.add("hide");
      else navWrap.classList.remove("hide");
    }
    if (toTop) toTop.classList.toggle("show", y > 600);
    lastY = y;
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener("click", () => scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }));

  /* ---------- hero tilt + glitch (only on home) ---------- */
  const hero = document.getElementById("hero");
  const heroContent = document.querySelector(".hero-content");
  if (hero && heroContent && canHover && !reduce) {
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      heroContent.style.transform = `perspective(900px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg)`;
    });
    hero.addEventListener("pointerleave", () => {
      heroContent.style.transform = "perspective(900px) rotateX(0) rotateY(0)";
    });
    const hl = document.getElementById("heroLogo");
    setInterval(() => {
      if (hl && Math.random() > 0.55) {
        hl.classList.add("glitch");
        setTimeout(() => hl.classList.remove("glitch"), 420);
      }
    }, 3200);
  }

  /* ---------- poster 3D tilt ---------- */
  if (canHover && !reduce) {
    document.querySelectorAll(".poster").forEach((poster) => {
      const frame = poster.querySelector(".poster-frame");
      poster.addEventListener("pointermove", (e) => {
        const r = poster.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        frame.style.transform = `perspective(700px) rotateY(${px * 12}deg) rotateX(${-py * 12}deg) translateY(-8px)`;
      });
      poster.addEventListener("pointerleave", () => {
        frame.style.transform = "perspective(700px) rotateX(0) rotateY(0)";
      });
    });
  }

  /* ---------- magnetic buttons ---------- */
  if (canHover && !reduce) {
    document.querySelectorAll(".btn-main, .poster-enter, .ptab, .lineup-view").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * 0.25}px, ${(e.clientY - (r.top + r.height / 2)) * 0.35}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ---------- nav login -> portal (home only) ---------- */
  const navLogin = document.getElementById("navLogin");
  if (navLogin && document.getElementById("portal")) {
    navLogin.setAttribute("href", "#portal");
    navLogin.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("portal").scrollIntoView({ behavior: "smooth" });
    });
  }

  /* ---------- sign-up link on home portal ---------- */
  const toSignup = document.getElementById("toSignup");
  if (toSignup) toSignup.addEventListener("click", () => (location.href = "login.html"));
})();
