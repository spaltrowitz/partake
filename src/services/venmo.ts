export function requestVenmo(
  venmoUsername: string,
  amount: number,
  note: string
): boolean {
  const amountStr = amount.toFixed(2);
  const encodedNote = encodeURIComponent(note);
  // Use web links — venmo:// deep links are blocked by mobile browsers
  const url = `https://venmo.com/${venmoUsername}?txn=pay&amount=${amountStr}&note=${encodedNote}`;
  window.open(url, "_blank");
  return true;
}

export function getVenmoWebLink(
  venmoUsername: string,
  amount: number,
  note: string
): string {
  const amountStr = amount.toFixed(2);
  const encodedNote = encodeURIComponent(note);
  return `https://venmo.com/${venmoUsername}?txn=pay&amount=${amountStr}&note=${encodedNote}`;
}

export function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text);
}
