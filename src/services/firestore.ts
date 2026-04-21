import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  deleteDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Bill, AppUser, SavedContact, PartnerGroup } from "@/types";

// Bills
export async function saveBill(bill: Bill): Promise<void> {
  await setDoc(doc(db, "bills", bill.id), bill);
}

export async function getBill(id: string): Promise<Bill | null> {
  const snap = await getDoc(doc(db, "bills", id));
  return snap.exists() ? (snap.data() as Bill) : null;
}

export async function getBillByShareCode(code: string): Promise<Bill | null> {
  const q = query(
    collection(db, "bills"),
    where("shareCode", "==", code),
    limit(1)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : (snap.docs[0].data() as Bill);
}

export async function getUserBills(userId: string): Promise<Bill[]> {
  const q = query(
    collection(db, "bills"),
    where("createdBy", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Bill);
}

export function listenToBill(
  id: string,
  callback: (bill: Bill | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, "bills", id), (snap) => {
    callback(snap.exists() ? (snap.data() as Bill) : null);
  });
}

// Users
export async function saveUser(user: AppUser): Promise<void> {
  await setDoc(doc(db, "users", user.id), user);
}

export async function getUser(id: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, "users", id));
  return snap.exists() ? (snap.data() as AppUser) : null;
}

// Contacts
export async function saveContact(
  userId: string,
  contact: SavedContact
): Promise<void> {
  await setDoc(
    doc(db, "users", userId, "contacts", contact.id),
    contact
  );
}

export async function getContacts(userId: string): Promise<SavedContact[]> {
  const snap = await getDocs(collection(db, "users", userId, "contacts"));
  return snap.docs.map((d) => d.data() as SavedContact);
}

export async function deleteContact(
  userId: string,
  contactId: string
): Promise<void> {
  await deleteDoc(doc(db, "users", userId, "contacts", contactId));
}

// Partner Groups
export async function savePartnerGroup(
  userId: string,
  group: PartnerGroup
): Promise<void> {
  await setDoc(
    doc(db, "users", userId, "partnerGroups", group.id),
    group
  );
}

export async function getPartnerGroups(
  userId: string
): Promise<PartnerGroup[]> {
  const snap = await getDocs(
    collection(db, "users", userId, "partnerGroups")
  );
  return snap.docs.map((d) => d.data() as PartnerGroup);
}
