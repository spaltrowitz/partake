import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  limit,
  onSnapshot,
  deleteDoc,
  runTransaction,
  type Unsubscribe,
} from "firebase/firestore";
import { db, firebaseConfigured } from "@/lib/firebase";
import type { Bill, AppUser, SavedContact, PartnerGroup, Participant } from "@/types";

function ensureDb() {
  if (!firebaseConfigured) {
    throw new Error("Firebase not configured");
  }
}

// Bills
export async function saveBill(bill: Bill): Promise<void> {
  ensureDb();
  // Serialize Date to ISO string for Firestore compatibility
  const data = {
    ...bill,
    createdAt: bill.createdAt instanceof Date ? bill.createdAt.toISOString() : bill.createdAt,
  };
  await setDoc(doc(db, "bills", bill.id), data);
}

export async function getBill(id: string): Promise<Bill | null> {
  ensureDb();
  const snap = await getDoc(doc(db, "bills", id));
  return snap.exists() ? (snap.data() as Bill) : null;
}

export async function getBillByShareCode(code: string): Promise<Bill | null> {
  ensureDb();
  const q = query(
    collection(db, "bills"),
    where("shareCode", "==", code),
    limit(1)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : (snap.docs[0].data() as Bill);
}

export async function getUserBills(userId: string): Promise<Bill[]> {
  ensureDb();
  const createdByQuery = query(
    collection(db, "bills"),
    where("createdBy", "==", userId)
  );
  const sharedWithQuery = query(
    collection(db, "bills"),
    where("sharedWithUserIds", "array-contains", userId)
  );
  const [createdBySnap, sharedWithSnap] = await Promise.all([
    getDocs(createdByQuery),
    getDocs(sharedWithQuery),
  ]);

  const billsById = new Map<string, Bill>();
  for (const docSnap of [...createdBySnap.docs, ...sharedWithSnap.docs]) {
    const bill = docSnap.data() as Bill;
    billsById.set(bill.id, {
      ...bill,
      createdAt: new Date(bill.createdAt),
    });
  }

  return Array.from(billsById.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function listenToBill(
  id: string,
  callback: (bill: Bill | null) => void
): Unsubscribe {
  ensureDb();
  return onSnapshot(doc(db, "bills", id), (snap) => {
    callback(snap.exists() ? (snap.data() as Bill) : null);
  });
}

export async function toggleBillItemClaim(
  billId: string,
  itemId: string,
  participant: Participant,
  legacyClaimName?: string,
  userId?: string
): Promise<Bill> {
  ensureDb();
  const billRef = doc(db, "bills", billId);

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(billRef);
    if (!snap.exists()) {
      throw new Error("Bill not found");
    }

    const bill = snap.data() as Bill;
    if (bill.status === "settled") {
      throw new Error("Claims are locked");
    }

    const hasParticipant = bill.participants.some((p) => p.id === participant.id);
    const participants = hasParticipant
      ? bill.participants
      : [...bill.participants, participant];
    const sharedWithUserIds = userId && !bill.sharedWithUserIds?.includes(userId)
      ? [...(bill.sharedWithUserIds ?? []), userId]
      : bill.sharedWithUserIds ?? [];

    const legacyKeys = new Set([participant.id]);
    if (legacyClaimName?.trim()) legacyKeys.add(legacyClaimName.trim());

    const items = bill.items.map((item) => {
      if (item.id !== itemId) return item;
      const isClaimed = item.claimedBy.some((claim) => legacyKeys.has(claim));
      return {
        ...item,
        claimedBy: isClaimed
          ? item.claimedBy.filter((claim) => !legacyKeys.has(claim))
          : [...item.claimedBy.filter((claim) => claim !== participant.id), participant.id],
      };
    });

    const updatedBill = { ...bill, participants, items, sharedWithUserIds };
    transaction.update(billRef, { participants, items, sharedWithUserIds });
    return updatedBill;
  });
}

export async function joinSharedBill(
  billId: string,
  participant: Participant,
  userId?: string
): Promise<Bill> {
  ensureDb();
  const billRef = doc(db, "bills", billId);

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(billRef);
    if (!snap.exists()) {
      throw new Error("Bill not found");
    }

    const bill = snap.data() as Bill;
    if (bill.status === "settled") {
      throw new Error("Claims are locked");
    }
    const hasParticipant = bill.participants.some((p) => p.id === participant.id);
    const participants = hasParticipant
      ? bill.participants
      : [...bill.participants, participant];
    const sharedWithUserIds = userId && !bill.sharedWithUserIds?.includes(userId)
      ? [...(bill.sharedWithUserIds ?? []), userId]
      : bill.sharedWithUserIds ?? [];
    const updatedBill = { ...bill, participants, sharedWithUserIds };

    transaction.update(billRef, { participants, sharedWithUserIds });
    return updatedBill;
  });
}

// Users
export async function saveUser(user: AppUser): Promise<void> {
  ensureDb();
  await setDoc(doc(db, "users", user.id), user);
}

export async function getUser(id: string): Promise<AppUser | null> {
  ensureDb();
  const snap = await getDoc(doc(db, "users", id));
  return snap.exists() ? (snap.data() as AppUser) : null;
}

// Contacts
export async function saveContact(
  userId: string,
  contact: SavedContact
): Promise<void> {
  ensureDb();
  await setDoc(
    doc(db, "users", userId, "contacts", contact.id),
    contact
  );
}

export async function getContacts(userId: string): Promise<SavedContact[]> {
  ensureDb();
  const snap = await getDocs(collection(db, "users", userId, "contacts"));
  return snap.docs.map((d) => d.data() as SavedContact);
}

export async function deleteContact(
  userId: string,
  contactId: string
): Promise<void> {
  ensureDb();
  await deleteDoc(doc(db, "users", userId, "contacts", contactId));
}

// Partner Groups
export async function savePartnerGroup(
  userId: string,
  group: PartnerGroup
): Promise<void> {
  ensureDb();
  await setDoc(
    doc(db, "users", userId, "partnerGroups", group.id),
    group
  );
}

export async function getPartnerGroups(
  userId: string
): Promise<PartnerGroup[]> {
  ensureDb();
  const snap = await getDocs(
    collection(db, "users", userId, "partnerGroups")
  );
  return snap.docs.map((d) => d.data() as PartnerGroup);
}
