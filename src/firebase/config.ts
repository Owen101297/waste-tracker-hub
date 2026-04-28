import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getFunctions, Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyBhQi4chNLrS3ITIADiDFUPyGf72Sao9BI",
  authDomain: "milan-store-e3eb2.firebaseapp.com",
  projectId: "milan-store-e3eb2",
  storageBucket: "milan-store-e3eb2.firebasestorage.app",
  messagingSenderId: "974131508802",
  appId: "1:974131508802:web:fa3b9836c71891c1d71fdb"
};

const app = initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const functions: Functions = getFunctions(app);