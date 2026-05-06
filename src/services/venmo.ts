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
      return `https://venmo.com/${encodeURIComponent(username)}?txn=charge&amount=${amountStr}&note=${encodedNote}`;
    case "cashapp":
      // Cash App uses $cashtag format
      const cashtag = username.startsWith("$") ? username.slice(1) : username;
      return `https://cash.app/$${encodeURIComponent(cashtag)}/${amountStr}`;
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

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for insecure contexts
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}
