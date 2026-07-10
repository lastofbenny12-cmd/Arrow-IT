/* =========================================================
   ARROW IT — firebase.js (Auth + Firestore)
   Email/Password + Phone auth, Sign-Up, Contact storage.
   ========================================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  RecaptchaVerifier,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAT20uUB6t2Wpkh0zvcBVacx9uM_A1f2w8",
  authDomain: "arrow-it-6b942.firebaseapp.com",
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
if (toSignup) toSignup.addEventListener("click", (e) => { e.preventDefault(); showForm("signupForm"); });
const toLogin = $("toLogin");
if (toLogin) toLogin.addEventListener("click", (e) => { e.preventDefault(); showForm("emailForm"); });

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
      const who = $("contactUser");
      if (who) who.textContent = user.email || user.phoneNumber || "";
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
    } catch (err) { setMsg("wrong code ✦", "var(--pink)"); }
  });
}

/* ---------- CONTACT submit -> Firestore ---------- */
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
    try {
      await addDoc(collection(db, "contacts"), {
        uid: user.uid,
        email: user.email || user.phoneNumber || "",
        subject,
        message,
        createdAt: serverTimestamp(),
      });
      cmsg("message sent — stored on Firebase only 🔒", "var(--teal)");
      contactForm.reset();
    } catch (err) { cmsg(mapError(err)); }
  });
}
