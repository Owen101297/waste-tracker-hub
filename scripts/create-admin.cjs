const { initializeApp } = require("firebase/app");
const { getAuth, createUserWithEmailAndPassword, updateProfile } = require("firebase/auth");
const { getFirestore, doc, setDoc, serverTimestamp } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyBhQi4chNLrS3ITIADiDFUPyGf72Sao9BI",
  authDomain: "milan-store-e3eb2.firebaseapp.com",
  projectId: "milan-store-e3eb2",
  storageBucket: "milan-store-e3eb2.firebasestorage.app",
  messagingSenderId: "974131508802",
  appId: "1:974131508802:web:fa3b9836c71891c1d71fdb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdmin() {
  const email = "admin@owenai.uk";
  const password = "Admin123!";
  const fullName = "Administrador";

  try {
    console.log("Creando usuario admin...");
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    await updateProfile(user, { displayName: fullName });
    
    await setDoc(doc(db, "users", user.uid), {
      email,
      fullName,
      role: "admin",
      createdAt: serverTimestamp(),
    });
    
    console.log("✅ Admin creado exitosamente!");
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("\nVe a: https://milan-store-e3eb2.web.app/login");
    
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      console.log("⚠️ El usuario admin ya existe.");
      console.log("Email:", email);
      console.log("Password:", password);
    } else {
      console.error("❌ Error:", error.message);
    }
  }
}

createAdmin();