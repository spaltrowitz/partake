import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  limit,
  onSnapshot,
  deleteDoc,
  runTransaction,
  arrayUnion,
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
//
// Owner writes go through a transaction that merges against the current cloud
// copy instead of blindly overwriting it. The owner stays authoritative for
// bill structure (items, prices, tax, tip, totals, status), but any item
// claims a guest added concurrently are preserved, and paying groups set on
// another device aren't clobbered by a stale save.
export async function saveBill(bill: Bill): Promise<void> {
  ensureDb();
  const billRef = doc(db, "bills", bill.id);
  const ownerData = {
    ...bill,
    createdAt: bill.createdAt instanceof Date ? bill.createdAt.toISOString() : bill.createdAt,
  };

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(billRef);
    if (!snap.exists()) {
      transaction.set(billRef, ownerData);
      return;
    }

    const cloud = snap.data() as Bill;

    // Only recognize claims from participants the owner still has, so a
    // participant the owner deliberately removed isn't resurrected while a
    // guest's claim on a known participant is still preserved.
    const knownParticipantIds = new Set(bill.participants.map((p) => p.id));
    const cloudItemsById = new Map(cloud.items.map((i) => [i.id, i]));
    const items = bill.items.map((item) => {
      const cloudItem = cloudItemsById.get(item.id);
      if (!cloudItem) return item;
      const extraClaims = cloudItem.claimedBy.filter(
        (claim) => knownParticipantIds.has(claim) && !item.claimedBy.includes(claim)
      );
      return extraClaims.length
        ? { ...item, claimedBy: [...item.claimedBy, ...extraClaims] }
        : item;
    });

    const sharedWithUserIds = Array.from(
      new Set([...(bill.sharedWithUserIds ?? []), ...(cloud.sharedWithUserIds ?? [])])
    );

    // Keep whichever copy has more paying-group members (guards against a
    // stale second device wiping groups set elsewhere).
    const cloudGroupMembers = (cloud.payingGroups ?? []).reduce((s, g) => s + g.memberIds.length, 0);
    const ownGroupMembers = (bill.payingGroups ?? []).reduce((s, g) => s + g.memberIds.length, 0);
    const payingGroups = cloudGroupMembers > ownGroupMembers ? cloud.payingGroups : bill.payingGroups;

    transaction.set(billRef, { ...ownerData, items, sharedWithUserIds, payingGroups });
  });
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

export async function associateBillWithUser(billId: string, userId: string): Promise<void> {
  ensureDb();
  await updateDoc(doc(db, "bills", billId), {
    sharedWithUserIds: arrayUnion(userId),
  });
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

export function listenToUserBills(
  userId: string,
  callback: (bills: Bill[]) => void
): Unsubscribe {
  ensureDb();
  const createdByQ = query(
    collection(db, "bills"),
    where("createdBy", "==", userId)
  );
  const sharedWithQ = query(
    collection(db, "bills"),
    where("sharedWithUserIds", "array-contains", userId)
  );

  let createdByBills: Bill[] = [];
  let sharedWithBills: Bill[] = [];

  function merge() {
    const billsById = new Map<string, Bill>();
    for (const bill of [...createdByBills, ...sharedWithBills]) {
      billsById.set(bill.id, { ...bill, createdAt: new Date(bill.createdAt) });
    }
    callback(
      Array.from(billsById.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    );
  }

  const unsub1 = onSnapshot(createdByQ, (snap) => {
    createdByBills = snap.docs.map((d) => d.data() as Bill);
    merge();
  });
  const unsub2 = onSnapshot(sharedWithQ, (snap) => {
    sharedWithBills = snap.docs.map((d) => d.data() as Bill);
    merge();
  });

  return () => { unsub1(); unsub2(); };
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
