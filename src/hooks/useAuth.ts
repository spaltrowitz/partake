"use client";

import { useState, useEffect } from "react";
import {
  GoogleAuthProvider,
  getRedirectResult,
  linkWithPopup,
  linkWithRedirect,
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

    getRedirectResult(auth).catch((error) => {
      // If a linkWithRedirect failed because the Google account is already
      // linked to another user, sign in directly with that credential.
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
    const currentUser = auth.currentUser;

    if (currentUser?.isAnonymous) {
      try {
        const result = await linkWithPopup(currentUser, provider);
        return result.user;
      } catch (error) {
        if (shouldFallbackToRedirect(error)) {
          await linkWithRedirect(currentUser, provider);
          throw Object.assign(new Error("Redirecting…"), { code: "auth/redirect-in-progress" });
        }
        const code = (error as { code?: string }).code;
        if (
          code === "auth/credential-already-in-use" ||
          code === "auth/email-already-in-use"
        ) {
          // Google account already linked to another user — sign in directly
          const credential = GoogleAuthProvider.credentialFromError(error as Parameters<typeof GoogleAuthProvider.credentialFromError>[0]);
          if (credential) {
            const result = await signInWithCredential(auth, credential);
            return result.user;
          }
        }
        if (code !== "auth/provider-already-linked") {
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
