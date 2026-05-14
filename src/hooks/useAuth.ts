"use client";

import { useState, useEffect } from "react";
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { firebaseConfigured } from "@/lib/firebase";

function isMobileOrStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const standalone = ("standalone" in navigator && (navigator as Record<string, unknown>).standalone) ||
    window.matchMedia("(display-mode: standalone)").matches;
  if (standalone) return true;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);

  function createGoogleProvider() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    return provider;
  }

  useEffect(() => {
    if (!firebaseConfigured) {
      return;
    }

    getRedirectResult(auth).catch((error) => {
      const code = (error as { code?: string }).code;
      if (
        code === "auth/credential-already-in-use" ||
        code === "auth/email-already-in-use"
      ) {
        const credential = GoogleAuthProvider.credentialFromError(error);
        if (credential) {
          signInWithCredential(auth, credential).catch(() => {});
        }
      }
    });

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

    // Mobile browsers and PWAs block popups — use redirect directly
    if (isMobileOrStandalone()) {
      await signInWithRedirect(auth, provider);
      throw Object.assign(new Error("Redirecting…"), { code: "auth/redirect-in-progress" });
    }

    try {
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
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
