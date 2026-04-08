/**
 * Shared Firebase project configuration.
 *
 * SECURITY NOTE: The Firebase `apiKey` is a PUBLIC project identifier, NOT a
 * secret credential. It is safe to commit and ship in client-side code.
 * Access control is enforced server-side by Firestore security rules
 * (see docs/firestore-rules.md). If you believe the project has been
 * compromised, rotate credentials in the Firebase console and update
 * Firestore/Auth rules accordingly (see SECURITY.md).
 */
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC7k3xdqmsuYOEBBDbDfnrmuaebLaHFWZI",
  authDomain: "tridenttaskboard.firebaseapp.com",
  projectId: "tridenttaskboard",
  storageBucket: "tridenttaskboard.firebasestorage.appspot.com",
  messagingSenderId: "143400263387",
  appId: "1:143400263387:web:66ed521ae75af588e836fe",
  measurementId: "G-F12DDQCX87"
};
