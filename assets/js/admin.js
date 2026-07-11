/* =========================================================
   ARROW IT — admin.js
   Minimal Admin Panel: Projekte um +1 erhöhen / auf 0 resetten.
   Auth basiert auf Firebase Auth.

   Security Hinweis:
   Dieses Frontend prüft einen Admin-Flag in RTDB: admins/{uid}=true.
   (Die echte Sicherheit muss über Firebase Rules erfolgen.)
   ========================================================= */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const msg = (t, c) => {
    const el = $("adminMsg");
    if (!el) return;
    el.textContent = t;
    el.style.color = c || "var(--pink)";
  };

  const btnReset = $("btnReset");
  const btnPlus1 = $("btnPlus1");
  const curProjects = $("curProjects");
  const curUsers = $("curUsers");

  if (!btnReset || !btnPlus1) return;
  if (!window.firebase || !firebase.database || !firebase.auth) {
    msg("Firebase nicht geladen ✦", "var(--pink)");
    return;
  }

  const auth = firebase.auth();
  const rtdb = firebase.database();

  // Hardcoded admin UID (for local demo).
  // If you want RTDB-based admins again, re-enable isAdmin() with Firebase Rules.
  const ADMIN_UID = "FZa8noRcaNVY5m59Hs8Z5mP5ezO2";

  function isAdmin(uid) {
    return Promise.resolve(uid === ADMIN_UID);
  }


  function setProjects(val) {
    return rtdb.ref("stats/projects").set(val);
  }

  function plusOneProjects() {
    const ref = rtdb.ref("stats/projects");
    return ref.transaction((cur) => {
      const n = typeof cur === "number" ? cur : parseInt(cur, 10);
      const safe = Number.isFinite(n) ? n : 0;
      return safe + 1;
    });
  }

  // Live read
  rtdb.ref("stats/projects").on("value", (s) => {
    const v = s.val();
    curProjects.textContent = (v == null ? 0 : v);
  });
  rtdb.ref("users").on("value", (s) => {
    curUsers.textContent = (s.numChildren ? s.numChildren() : (s.val() ? Object.keys(s.val()).length : 0));
  });

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      msg("Bitte zuerst im Portal einloggen ✦", "var(--pink)");
      btnReset.disabled = true;
      btnPlus1.disabled = true;
      return;
    }

    const admin = await isAdmin(user.uid);
    if (!admin) {
      msg("Nicht berechtigt (ADMIN Flag fehlt) ✦", "var(--pink)");
      btnReset.disabled = true;
      btnPlus1.disabled = true;
      return;
    }

    msg("ADMIN aktiv ✦", "var(--teal)");
    btnReset.disabled = false;
    btnPlus1.disabled = false;

    btnPlus1.onclick = async () => {
      try {
        msg("Projekte +1…", "var(--teal)");
        await plusOneProjects();
        msg("Projekte erhöht ✦", "var(--teal)");
      } catch (e) {
        msg("Fehler beim Erhöhen ✦", "var(--pink)");
      }
    };

    btnReset.onclick = async () => {
      try {
        msg("Reset…", "var(--teal)");
        await setProjects(0);
        msg("Projekte auf 0 gesetzt ✦", "var(--teal)");
      } catch (e) {
        msg("Fehler beim Reset ✦", "var(--pink)");
      }
    };
  });
})();

