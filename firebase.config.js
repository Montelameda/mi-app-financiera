// firebase.config.js

// Importa las funciones necesarias desde las librerías de Firebase
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // <-- 1. AÑADE ESTA LÍNEA

// Tu configuración personal de Firebase que copiaste. ¡Está perfecta!
const firebaseConfig = {
  apiKey: "AIzaSyCoL0aOpOF4pmz9m1RXd7ZRBNoupyXGwwo",
  authDomain: "mi-app-financiera-b4b8a.firebaseapp.com",
  projectId: "mi-app-financiera-b4b8a",
  storageBucket: "mi-app-financiera-b4b8a.firebasestorage.app",
  messagingSenderId: "207969360204",
  appId: "1:207969360204:web:93c25cf13e72e7c6d417e9",
  measurementId: "G-39WFQR3DQ1"
};

// Inicializa la conexión con Firebase
const app = initializeApp(firebaseConfig);

// Prepara y exporta la base de datos (Firestore)
export const db = getFirestore(app);

// Prepara y exporta el servicio de almacenamiento (Storage)
export const storage = getStorage(app); // <-- 2. AÑADE ESTA LÍNEA