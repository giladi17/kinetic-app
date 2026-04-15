import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCr9nRLRoapXn6a2ZbK3Y2QBrLqtCjRfrk",
  authDomain: "whooops-df9cd.firebaseapp.com",
  databaseURL: "https://whooops-df9cd-default-rtdb.firebaseio.com",
  projectId: "whooops-df9cd",
  storageBucket: "whooops-df9cd.firebasestorage.app",
  messagingSenderId: "65535220479",
  appId: "1:65535220479:web:89bbb4561f149a7f628aca",
  measurementId: "G-D4SNJ43HJ6",
};

let db = null;
let analytics = null;

try {
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);

  if (typeof window !== "undefined") {
    import("firebase/analytics").then(({ getAnalytics }) => {
      try { analytics = getAnalytics(app); } catch {}
    });
  }
} catch (e) {
  console.warn("Firebase init failed:", e.message);
}

export { db, analytics };
