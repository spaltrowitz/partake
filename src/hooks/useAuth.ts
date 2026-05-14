"use client";

import { useState, useEffect } from "react";
import {
  GoogleAuthProvider,
  getRedirectResult,
  linkWithPopup,
  linkWithRedirect,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { firebaseConfigured } from "@/lib/firebase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);

  function createGoogleProvider() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    return provider;
  }

  function shouldFallbackToRedirect(error: unknown): boolean {
    const code = (error as { code?: string }).code;
    return code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment";
  }

  useEffect(() => {
    if (!firebaseConfigured) {
      return;
    }

    getRedirectResult(auth).catch(() => {});

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

    const provider = createGoogleProvider();
    const currentUser = auth.currentUser;

    if (currentUser?.isAnonymous) {
      try {
        const result = await linkWithPopup(currentUser, provider);
        return result.user;
      } catch (error) {
        if (shouldFallbackToRedirect(error)) {
          await linkWithRedirect(currentUser, provider);
          // Page will redirect — throw so caller's finally block runs
          throw Object.assign(new Error("Redirecting…"), { code: "auth/redirect-in-progress" });
        }
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

    try {
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error) {
      if (shouldFallbackToRedirect(error)) {
        await signInWithRedirect(auth, provider);
        throw Object.assign(new Error("Redirecting…"), { code: "auth/redirect-in-progress" });
      }
      throw error;
    }
  }

  async function signOut(): Promise<void> {
    if (!firebaseConfigured) return;
    await firebaseSignOut(auth);
  }

  return { user, loading, signInWithGoogle, signOut };
}
