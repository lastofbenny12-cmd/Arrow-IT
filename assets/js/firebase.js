/* =========================================================
   ARROW IT — firebase.js (Auth + FormSubmit Email)
   Email/Password + Phone auth, Sign-Up, Contact Email Delivery.
   ========================================================= */
import { initializeApp } from "https://gstatic.com";
import { getAnalytics } from "https://gstatic.com";
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  RecaptchaVerifier,
} from "https://gstatic.com";
import {
  getFirestore,
  doc,
  setDoc,
} from "https://gstatic.com";

const firebaseConfig = {
  apiKey: "AIzaSyAT20uUB6t2Wpkh0zvcBVacx9uM_A1f2w8",
  authDomain: "://firebaseapp.com",
  projectId: "arrow-it-6b942",
  storageBucket: "arrow-it-6b942.firebasestorage.app",
  messagingSenderId: "783659580320",
  appId: "1:783659580320:web:83fa43c06d79a49ccf02c5",
  measurementId: "G-EFH5RNZFPD",
};

const app = initializeApp(firebaseConfig);
getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);
const setMsg = (text, color) => {
  const m = $("portalMsg");
  if (m) { m.textContent = text; m.style.color = color || "var(--pink)"; }
};
function mapError(err) {
  const c = err?.code || "";
  if (c.includes("invalid-credential") || c.includes("wrong-password")) return "wrong email or password ✦";
  if (c.includes("user-not-found")) return "no account found ✦";
  if (c.includes("email-already-in-use")) return "email already registered ✦";
  if (c.includes("weak-password")) return "password too weak (min 6) ✦";
  if (c.includes("invalid-phone-number")) return "invalid phone number ✦";
  if (c.includes("invalid-verification-code")) return "wrong code ✦";
  if (c.includes("too-many-requests")) return "too many tries — wait a bit ✦";
  if (c.includes("auth")) return "auth error ✦ check Firebase console";
  return err?.message || "something went wrong ✦";
}

/* ---------- form/tab switching (EMAIL / PHONE / SIGNUP) ---------- */
function showForm(name) {
  ["emailForm", "phoneForm", "signupForm"].forEach((id) => {
    const el = $(id);
    if (el) el.classList.toggle("hidden", id !== name);
  });
  document.querySelectorAll(".ptab").forEach((t) =>
    t.classList.toggle("active", (t.dataset.tab === "email" && name === "email") || (t.dataset.tab === "phone" && name === "phone"))
  );
  const s2s = $("switchToSignup"), s2l = $("switchToLogin");
  if (s2s) s2s.classList.toggle("hidden", name === "signupForm");
  if (s2l) s2l.classList.toggle("hidden", name !== "signupForm");
  setMsg("");
}
document.querySelectorAll(".ptab").forEach((tab) => {
  tab.addEventListener("click", () => showForm(tab.dataset.tab));
});
const toSignup = $("toSignup");
if (toSignup) {
  toSignup.addEventListener("click", (e) => {
    e.preventDefault();
    if ($("signupForm")) {
      showForm("signupForm");
    } else {
      location.href = "login.html?signup=true";
    }
  });
}
const toLogin = $("toLogin");
if (toLogin) {
  toLogin.addEventListener("click", (e) => {
    e.preventDefault();
    if ($("emailForm")) {
      showForm("emailForm");
    } else {
      location.href = "login.html";
    }
  });
}

// Check query param or hash on load to pre-select signup
if (window.location.search.includes("signup=true") || window.location.hash === "#signup") {
  showForm("signupForm");
}

/* ---------- auth-aware nav + contact gate ---------- */
onAuthStateChanged(auth, (user) => {
  const nl = $("navLogin");
  if (nl) {
    if (user) {
      nl.textContent = "LOGOUT";
      nl.onclick = (e) => { e.preventDefault(); signOut(auth); };
    } else {
      nl.textContent = "LOGIN";
      nl.onclick = null;
    }
  }
  const gate = $("gateView");
  const form = $("formView");

  if (gate && form) {
    if (user) {
      gate.classList.add("hidden");
      form.classList.remove("hidden");
      
      const userIdentifier = user.email || user.phoneNumber || "";
      const who = $("contactUser");
      if (who) who.textContent = userIdentifier;
      
      // Übergibt die Account-Daten an das versteckte Feld im Kontaktformular
      const hiddenField = $("hiddenUserField");
      if (hiddenField) hiddenField.value = userIdentifier;
    } else {
      gate.classList.remove("hidden");
      form.classList.add("hidden");
    }
  }
});

/* ---------- consent -> store per user (if signed in) ---------- */
window.addEventListener("arrow:consent", async () => {
  const u = auth.currentUser;
  if (u) {
    try {
      await setDoc(doc(db, "users", u.uid), { consent: Date.now() }, { merge: true });
    } catch (_) {}
  }
});

/* ---------- EMAIL / PASSWORD login ---------- */
const emailForm = $("emailForm");
if (emailForm) {
  emailForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg("connecting to Arrow Portal…", "var(--teal)");
    try {
      await signInWithEmailAndPassword(auth, emailForm.email.value.trim(), emailForm.password.value);
      setMsg("welcome back ✦", "var(--teal)");
      if (!location.pathname.includes("contact.html")) {
        setTimeout(() => (location.href = "contact.html"), 700);
      }
    } catch (err) { setMsg(mapError(err), "var(--pink)"); }
  });
}

/* ---------- SIGN UP ---------- */
const signupForm = $("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg("creating account…", "var(--teal)");
    try {
      await createUserWithEmailAndPassword(auth, signupForm.email.value.trim(), signupForm.password.value);
      setMsg("account created ✦", "var(--teal)");
      setTimeout(() => (location.href = "contact.html"), 700);
    } catch (err) { setMsg(mapError(err), "var(--pink)"); }
  });
}

/* ---------- PHONE login (reCAPTCHA) ---------- */
let confirmationResult = null;
let verifier = null;
const phoneForm = $("phoneForm");
const sendCode = $("sendCode");
const verifyCode = $("verifyCode");
const codeField = $("codeField");

function getVerifier() {
  if (!verifier) {
    verifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
  }
  return verifier;
}
if (sendCode) {
  sendCode.addEventListener("click", async () => {
    const phone = phoneForm.phone.value.trim();
    if (!phone) { setMsg("enter your phone number ✦"); return; }
    setMsg("sending code…", "var(--teal)");
    try {
      confirmationResult = await signInWithPhoneNumber(auth, phone, getVerifier());
      codeField.classList.remove("hidden");
      verifyCode.classList.remove("hidden");
      setMsg("code sent ✦", "var(--teal)");
    } catch (err) { setMsg(mapError(err), "var(--pink)"); }
  });
}
if (phoneForm) {
  phoneForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = phoneForm.code.value.trim();
    if (!code || !confirmationResult) { setMsg("enter the code ✦"); return; }
    try {
      await confirmationResult.confirm(code);
      setMsg("welcome back ✦", "var(--teal)");
      if (!location.pathname.includes("contact.html")) {
        setTimeout(() => (location.href = "contact.html"), 700);
      }
    } catch (err) { setMsg("wrong code ✦", "var(--pink)"); }
  });
}

/* ---------- CONTACT submit -> FormSubmit AJAX ---------- */
const contactForm = $("contactForm");
if (contactForm) {
  const cmsg = (t, c) => {
    const m = $("contactMsg");
    if (m) { m.textContent = t; m.style.color = c || "var(--pink)"; }
  };
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) { cmsg("please sign in first ✦"); return; }
    
    const subject = contactForm.elements.subject.value.trim();
    const message = contactForm.elements.message.value.trim();
    if (!subject || !message) { cmsg("fill in all fields ✦"); return; }
    
    cmsg("sending…", "var(--teal)");
    
    const formData = new FormData(contactForm);
    
    try {
      // HIER DEINE ECHTE E-MAIL EINTRAGEN
      const response = await fetch("https://formsubmit.co", {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      
      if (data.success === "true" || data.success === true) {
        cmsg("✓ message sent successfully! ✦", "var(--teal)");
        contactForm.reset();
        
        const hiddenField = $("hiddenUserField");
        if (hiddenField) hiddenField.value = user.email || user.phoneNumber || "";
      } else {
        cmsg("error sending message ✦", "var(--pink)");
      }
    } catch (err) {
      cmsg("network error ✦ please check connection", "var(--pink)");
      console.error(err);
    }
  });
}
