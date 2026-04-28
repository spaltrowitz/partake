import type { SavedContact } from "@/types";

const STORAGE_KEY = "partake_contacts";

export function getSavedContacts(): SavedContact[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addSavedContact(contact: SavedContact): void {
  const contacts = getSavedContacts();
  // Don't add duplicates by name
  if (contacts.some((c) => c.name.toLowerCase() === contact.name.toLowerCase())) return;
  contacts.push(contact);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  } catch {
    // localStorage full or disabled — silently skip
  }
}

export function removeSavedContact(id: string): void {
  const contacts = getSavedContacts().filter((c) => c.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  } catch {
    // localStorage full or disabled — silently skip
  }
}

export function saveAllParticipantsAsContacts(
  participants: { id: string; name: string; venmoUsername?: string }[]
): void {
  for (const p of participants) {
    addSavedContact({
      id: p.id,
      name: p.name,
      venmoUsername: p.venmoUsername,
      createdBy: "local",
    });
  }
}
