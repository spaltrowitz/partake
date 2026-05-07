interface UserProfile {
  name: string;
  venmoUsername?: string;
  cashAppUsername?: string;
}

const STORAGE_KEY = "partake_profile";

export function getUserProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {}
}

export function hasProfile(): boolean {
  return getUserProfile() !== null;
}

export type { UserProfile };
