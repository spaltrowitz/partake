export type PaymentApp = "venmo" | "cashapp" | "zelle";

export function requestPayment(
  app: PaymentApp,
  username: string,
  amount: number,
  note: string
): boolean {
  const url = getPaymentLink(app, username, amount, note);
  if (!url) return false;
  window.open(url, "_blank");
  return true;
}

export function getPaymentLink(
  app: PaymentApp,
  username: string,
  amount: number,
  note: string
): string | null {
  const amountStr = amount.toFixed(2);
  const encodedNote = encodeURIComponent(note);

  switch (app) {
    case "venmo":
      return `https://venmo.com/${username}?txn=charge&amount=${amountStr}&note=${encodedNote}`;
    case "cashapp":
      // Cash App uses $cashtag format
      const cashtag = username.startsWith("$") ? username : `$${username}`;
      return `https://cash.app/${cashtag}/${amountStr}`;
    case "zelle":
      // Zelle doesn't have web deep links — fall back to copy
      return null;
    default:
      return null;
  }
}

export function getPaymentAppLabel(app: PaymentApp): string {
  switch (app) {
    case "venmo": return "Venmo";
    case "cashapp": return "Cash App";
    case "zelle": return "Zelle";
  }
}

export function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text);
}
