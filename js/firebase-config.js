// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCzbUtkA4dWs62ny2qxMC4ALv24Ti3s0Ik",
    authDomain: "ingresoalmacen.firebaseapp.com",
    projectId: "ingresoalmacen",
    storageBucket: "ingresoalmacen.firebasestorage.app",
    messagingSenderId: "617164477131",
    appId: "1:617164477131:web:668cc74a9c886414534I4e",
    measurementId: "G-N6MG5QBZQR"
  };
  
  // Inicializar Firebase
  firebase.initializeApp(firebaseConfig);
// Referencias a los servicios
const auth = firebase.auth();
const db = firebase.firestore();
// Verificar si storage está disponible
const storage = firebase.storage ? firebase.storage() : null;

// Si no vas a usar storage, puedes simplemente no referenciarlo:
// const storage = null;

console.log("Firebase configurado correctamente");
  