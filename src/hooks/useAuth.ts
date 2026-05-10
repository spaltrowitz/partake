"use client";

import { useState, useEffect } from "react";
import {
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { firebaseConfigured } from "@/lib/firebase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    if (!firebaseConfigured) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (!firebaseUser) {
        signInAnonymously(auth).catch(() => {});
      }
    });

    return unsubscribe;
  }, []);

  async function signInWithGoogle(): Promise<User> {
    if (!firebaseConfigured) {
      throw new Error("Firebase not configured");
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const currentUser = auth.currentUser;

    if (currentUser?.isAnonymous) {
      try {
        const result = await linkWithPopup(currentUser, provider);
        return result.user;
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (
          code !== "auth/credential-already-in-use" &&
          code !== "auth/email-already-in-use" &&
          code !== "auth/provider-already-linked"
        ) {
          throw error;
        }
      }
    }

    const result = await signInWithPopup(auth, provider);
    return result.user;
  }

  async function signOut(): Promise<void> {
    if (!firebaseConfigured) return;
    await firebaseSignOut(auth);
  }

  return { user, loading, signInWithGoogle, signOut };
}
