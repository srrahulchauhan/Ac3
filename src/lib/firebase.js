// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"; // You might need this soon if setting up phone login
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDEO8XwxopYWPITesY_2PDhZ-XWwVOHcig",
  authDomain: "acount4-32e73.firebaseapp.com",
  projectId: "acount4-32e73",
  storageBucket: "acount4-32e73.firebasestorage.app",
  messagingSenderId: "541616500458",
  appId: "1:541616500458:web:2f35eb3cdb766268483193",
  measurementId: "G-2K0HC8S0J0"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
