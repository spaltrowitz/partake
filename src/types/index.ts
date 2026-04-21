// Partake Types

export interface AppUser {
  id: string;
  displayName: string;
  email: string;
  venmoUsername?: string;
  avatarURL?: string;
  partnerGroupIds: string[];
  createdAt: Date;
}

export interface SavedContact {
  id: string;
  name: string;
  venmoUsername?: string;
  createdBy: string;
}

export interface PartnerGroup {
  id: string;
  name: string;
  memberIds: string[];
  payerId: string;
  createdBy: string;
}

export interface Bill {
  id: string;
  name: string;
  restaurantName?: string;
  receiptImageURL?: string;
  items: BillItem[];
  subtotal: number;
  tax: number;
  tipAmount: number;
  tipPercent?: number;
  total: number;
  participants: Participant[];
  activePartnerGroupId?: string;
  createdBy: string;
  createdAt: Date;
  status: BillStatus;
  shareCode?: string;
  birthdayPersonId?: string;
}

export interface BillItem {
  id: string;
  name: string;
  price: number;
  claimedBy: string[];
  quantity: number;
}

export interface Participant {
  id: string;
  name: string;
  venmoUsername?: string;
  isAppUser: boolean;
}

export type BillStatus = "splitting" | "settled";

export interface BillSplit {
  participantId: string;
  participantName: string;
  itemsSubtotal: number;
  taxShare: number;
  tipShare: number;
  total: number;
  items: BillItem[];
  venmoUsername?: string;
}

export interface ParsedReceipt {
  items: ParsedItem[];
  tax?: number;
  subtotal?: number;
  total?: number;
  restaurantName?: string;
}

export interface ParsedItem {
  id: string;
  name: string;
  price: number;
  confidence: number;
  quantity: number;
}

export interface GroupHabit {
  groupHash: string;
  preferredSplitMethod?: SplitMethod;
  averageTipPercent?: number;
  participantPatterns: Record<string, ParticipantPattern>;
  billCount: number;
  lastUsed: Date;
}

export interface ParticipantPattern {
  typicallyOrdersDrinks?: boolean;
  typicallySharesItems?: boolean;
  averageSpend?: number;
}

export type SplitMethod = "itemized" | "even" | "custom";
