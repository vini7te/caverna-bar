import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

export const configurado = !String(firebaseConfig.projectId).includes("COLE_AQUI");
export const app = configurado ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app) : null;
