import type { Bill } from "@/types";

const STORAGE_KEY = "partake_bills";
const MAX_BILLS = 50;

export function saveBillToHistory(bill: Bill): void {
  try {
    const bills = getBillHistory();
    // Replace if same ID exists, otherwise prepend
    const filtered = bills.filter((b) => b.id !== bill.id);
    const updated = [bill, ...filtered].slice(0, MAX_BILLS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage full or disabled — silently fail
  }
}

export function getBillHistory(): Bill[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function deleteBillFromHistory(id: string): void {
  try {
    const bills = getBillHistory().filter((b) => b.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
  } catch {
    // silently fail
  }
}
