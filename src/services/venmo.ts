export function requestVenmo(
  venmoUsername: string,
  amount: number,
  note: string
): boolean {
  const amountStr = amount.toFixed(2);
  const encodedNote = encodeURIComponent(note);
  const url = `venmo://paycharge?txn=request&recipients=${venmoUsername}&amount=${amountStr}&note=${encodedNote}`;

  // Try to open Venmo app
  window.location.href = url;

  // Fallback: after a short delay, open Venmo web if the app didn't open
  setTimeout(() => {
    const webUrl = `https://venmo.com/?txn=request&recipients=${venmoUsername}&amount=${amountStr}&note=${encodedNote}`;
    window.open(webUrl, "_blank");
  }, 1500);

  return true;
}

export function getVenmoWebLink(
  venmoUsername: string,
  amount: number,
  note: string
): string {
  const amountStr = amount.toFixed(2);
  const encodedNote = encodeURIComponent(note);
  return `https://venmo.com/?txn=request&recipients=${venmoUsername}&amount=${amountStr}&note=${encodedNote}`;
}

export function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text);
}
