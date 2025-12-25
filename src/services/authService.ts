import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  User
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export const authService = {
  // Sign up
  signup: async (email: string, password: string, displayName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update profile with display name
      await updateProfile(user, { displayName });

      // Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: displayName,
        role: "Participant", // Default role
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });

      return user;
    } catch (error) {
      throw error;
    }
  },

  // Login
  login: async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Update last login
      await setDoc(doc(db, "users", userCredential.user.uid), {
        lastLogin: serverTimestamp()
      }, { merge: true });
      
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  },

  // Logout
  logout: async () => {
    try {
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  }
};
