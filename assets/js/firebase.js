/* =========================================================
   ARROW IT — firebase.js (Compat build)
   Classic scripts (no ES module) -> runs locally / file://
   Email/Password + Phone Auth, Sign-Up, Contact per Mail + Firestore,
   User in Realtime Database.
   ========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyAT20uUB6t2Wpkh0zvcBVacx9uM_A1f2w8",
  authDomain: "arrow-it-6b942.firebaseapp.com",
  projectId: "arrow-it-6b942",
  storageBucket: "arrow-it-6b942.firebasestorage.app",
  messagingSenderId: "783659580320",
  appId: "1:783659580320:web:83fa43c06d79a49ccf02c5",
  measurementId: "G-EFH5RNZFPD",
  databaseURL:
    "https://arrow-it-6b942-default-rtdb.europe-west1.firebasedatabase.app/",
};

firebase.initializeApp(firebaseConfig);
if (firebase.analytics) firebase.analytics();

const auth = firebase.auth();
const db = firebase.firestore();
const rtdb = firebase.database();

function goContact() {
  return !/(contact|admin|login)\.html/.test(location.pathname);
}

const $ = (id) => document.getElementById(id);
const setMsg = (text, color) => {
  const m = $("portalMsg");
  if (m) {
    m.textContent = text;
    m.style.color = color || "var(--pink)";
  }
};

function mapError(err) {
  const c = err && err.code ? err.code : "";
  if (c.includes("invalid-credential") || c.includes("wrong-password"))
    return "wrong email or password ✦";
  if (c.includes("user-not-found")) return "no account found ✦";
  if (c.includes("email-already-in-use")) return "email already registered ✦";
  if (c.includes("weak-password")) return "password too weak (min 6) ✦";
  if (c.includes("invalid-phone-number")) return "invalid phone number ✦";
  if (c.includes("invalid-verification-code")) return "wrong code ✦";
  if (c.includes("too-many-requests")) return "too many tries — wait a bit ✦";
  if (c.includes("auth")) return "auth error ✦ check Firebase console";
  return (err && err.message) || "something went wrong ✦";
}

/* ---------- user -> Realtime Database ---------- */
function saveUser(user) {
  if (!user) return;
  rtdb
    .ref("users/" + user.uid)
    .set({
      user: user.displayName || user.email || user.phoneNumber || "",
      email: user.email || "",
      uid: user.uid,
    })
    .catch(() => {});
}

/* ---------- auth-aware nav + contact gate ---------- */
auth.onAuthStateChanged((user) => {
  const nl = $("navLogin");
  if (nl) {
    if (user) {
      nl.textContent = "LOGOUT";
      nl.onclick = (e) => {
        e.preventDefault();
        auth.signOut();
      };
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

      const uid = $("contactUid");
      if (uid) uid.textContent = user.uid;

      saveUser(user);
    } else {
      gate.classList.remove("hidden");
      form.classList.add("hidden");
    }
  } else if (user) {
    saveUser(user);
  }
});

/* ---------- consent -> store per user (Firestore) ---------- */
window.addEventListener("arrow:consent", () => {
  const u = auth.currentUser;
  if (u) {
    db.collection("users")
      .doc(u.uid)
      .set({ consent: Date.now() }, { merge: true })
      .catch(() => {});
  }
});

/* ---------- form/tab switching ---------- */
function showForm(name) {
  ["emailForm", "phoneForm", "signupForm"].forEach((id) => {
    const el = $(id);
    if (el) el.classList.toggle("hidden", id !== name);
  });

  document.querySelectorAll(".ptab").forEach((t) => {
    const isEmail = t.dataset.tab === "email" && name === "email";
    const isPhone = t.dataset.tab === "phone" && name === "phone";
    t.classList.toggle("active", isEmail || isPhone);
  });

  const s2s = $("switchToSignup");
  const s2l = $("switchToLogin");
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
    if ($("signupForm")) showForm("signupForm");
    else location.href = "login.html?signup=true";
  });
}

const toLogin = $("toLogin");
if (toLogin) {
  toLogin.addEventListener("click", (e) => {
    e.preventDefault();
    if ($("emailForm")) showForm("emailForm");
    else location.href = "login.html";
  });
}

if (location.search.includes("signup=true") || location.hash === "#signup") {
  showForm("signupForm");
}

/* ---------- EMAIL / PASSWORD login ---------- */
const emailForm = $("emailForm");
if (emailForm) {
  emailForm.addEventListener("submit", (e) => {
    e.preventDefault();
    setMsg("connecting to Arrow Portal…", "var(--teal)");

    auth
      .signInWithEmailAndPassword(
        emailForm.email.value.trim(),
        emailForm.password.value,
      )
      .then(() => {
        setMsg("welcome back ✦", "var(--teal)");
        if (goContact()) {
          setTimeout(() => (location.href = "contact.html"), 700);
        }
      })
      .catch((err) => setMsg(mapError(err), "var(--pink)"));
  });
}

/* ---------- SIGN UP ---------- */
const signupForm = $("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    setMsg("creating account…", "var(--teal)");

    auth
      .createUserWithEmailAndPassword(
        signupForm.email.value.trim(),
        signupForm.password.value,
      )
      .then(() => {
        setMsg("account created ✦", "var(--teal)");
        setTimeout(() => (location.href = "contact.html"), 700);
      })
      .catch((err) => setMsg(mapError(err), "var(--pink)"));
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
    verifier = new firebase.auth.RecaptchaVerifier("recaptcha-container", {
      size: "invisible",
    });
  }
  return verifier;
}

if (sendCode) {
  sendCode.addEventListener("click", () => {
    const phone = phoneForm.phone.value.trim();
    if (!phone) {
      setMsg("enter your phone number ✦");
      return;
    }

    setMsg("sending code…", "var(--teal)");

    auth
      .signInWithPhoneNumber(phone, getVerifier())
      .then((res) => {
        confirmationResult = res;
        codeField.classList.remove("hidden");
        verifyCode.classList.remove("hidden");
        setMsg("code sent ✦", "var(--teal)");
      })
      .catch((err) => setMsg(mapError(err), "var(--pink)"));
  });
}

if (phoneForm) {
  phoneForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const code = phoneForm.code.value.trim();
    if (!code || !confirmationResult) {
      setMsg("enter the code ✦");
      return;
    }

    confirmationResult
      .confirm(code)
      .then(() => {
        setMsg("welcome back ✦", "var(--teal)");
        if (!location.pathname.includes("contact.html")) {
          setTimeout(() => (location.href = "contact.html"), 700);
        }
      })
      .catch(() => setMsg("wrong code ✦", "var(--pink)"));
  });
}

/* ---------- CONTACT -> Mail (arrowit.info@gmail.com) + Firestore ---------- */
const CONTACT_MAIL = "arrowit.info@gmail.com";
const contactForm = $("contactForm");

if (contactForm) {
  const cmsg = (t, c) => {
    const m = $("contactMsg");
    if (m) {
      m.textContent = t;
      m.style.color = c || "var(--pink)";
    }
  };

  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      cmsg("please sign in first ✦");
      return;
    }

    const subject = contactForm.elements.subject.value.trim();
    const message = contactForm.elements.message.value.trim();

    if (!subject || !message) {
      cmsg("fill in all fields ✦");
      return;
    }

    cmsg("sending…", "var(--teal)");

    db.collection("contacts")
      .add({
        uid: user.uid,
        email: user.email || user.phoneNumber || "",
        subject,
        message,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      })
      .catch(() => {});

    const s = encodeURIComponent("Arrow IT Kontakt — " + subject);
    const b = encodeURIComponent(
      "Von: " + (user.email || user.phoneNumber || "") + "\n\n" + message,
    );

    location.href = "mailto:" + CONTACT_MAIL + "?subject=" + s + "&body=" + b;

    cmsg("message sent 🔒 stored on Firebase + mail opened", "var(--teal)");
    contactForm.reset();
  });
}
