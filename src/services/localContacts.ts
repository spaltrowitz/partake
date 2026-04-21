import type { SavedContact } from "@/types";

const STORAGE_KEY = "partake_contacts";

export function getSavedContacts(): SavedContact[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function addSavedContact(contact: SavedContact): void {
  const contacts = getSavedContacts();
  // Don't add duplicates by name
  if (contacts.some((c) => c.name.toLowerCase() === contact.name.toLowerCase())) return;
  contacts.push(contact);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

export function removeSavedContact(id: string): void {
  const contacts = getSavedContacts().filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
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
