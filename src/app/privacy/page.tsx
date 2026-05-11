import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh flex flex-col items-center p-6 pt-16 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold gradient-text tracking-tight mb-2">Privacy Policy</h1>
      <p className="text-xs text-[#94A3B8] mb-8">Last Updated: May 7, 2026</p>

      <div className="space-y-6 text-sm text-[#6B5E50] leading-relaxed w-full">
        <section>
          <h2 className="text-base font-semibold text-[#3D3428] mb-2">1. Introduction</h2>
          <p>Partake respects your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use the Partake web application.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#3D3428] mb-2">2. Information We Collect</h2>
          <p className="mb-2">Partake uses Firebase Anonymous Authentication by default. No email, password, or personal identifiers are required.</p>
          <p className="font-medium text-[#3D3428] mt-3 mb-1">Bill and Receipt Data:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Receipt images you photograph or upload</li>
            <li>Parsed receipt text (item names, prices, tax amounts)</li>
            <li>Bill split details (participant names, assigned items)</li>
          </ul>
          <p className="font-medium text-[#3D3428] mt-3 mb-1">Contacts (optional):</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Names of people you split bills with</li>
            <li>Venmo usernames and Cash App cashtags</li>
          </ul>
          <p className="font-medium text-[#3D3428] mt-3 mb-1">Location Data (optional, with permission):</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Approximate geolocation used solely for tax rate lookup</li>
            <li>Low-accuracy only — precise location is never requested</li>
            <li>Not stored on our servers</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#3D3428] mb-2">3. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Scanning and parsing receipt images</li>
            <li>Calculating tax rates based on approximate location</li>
            <li>Splitting bills among participants</li>
            <li>Generating payment request links for Venmo and Cash App</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#3D3428] mb-2">4. Information Sharing</h2>
          <p className="mb-2">We do not sell, rent, or trade your personal information. We may share information with:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Google Cloud Vision API:</strong> Receipt images sent for text extraction (OCR)</li>
            <li><strong>OpenStreetMap Nominatim:</strong> Approximate coordinates for reverse geocoding</li>
            <li><strong>Firebase:</strong> Bill data stored in Firestore when authenticated</li>
            <li><strong>Payment Apps:</strong> Deep links only — no data sent to Venmo/Cash App from our servers</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#3D3428] mb-2">5. Data Storage</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Bill data stored in Firebase Firestore and browser localStorage (last 50 bills)</li>
            <li>Receipt images stored in Firebase Cloud Storage</li>
            <li>Contacts stored in browser localStorage and Firebase when authenticated</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#3D3428] mb-2">6. Your Rights</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>No Account Required:</strong> Use Partake without providing any personal information</li>
            <li><strong>Location:</strong> Optional and only with explicit browser permission</li>
            <li><strong>Local Data:</strong> Clear localStorage at any time through browser settings</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#3D3428] mb-2">7. Contact</h2>
          <p>Email: <a href="mailto:sharipaltrowitz@gmail.com" className="text-[#0F766E] hover:text-[#C4502F]">sharipaltrowitz@gmail.com</a></p>
        </section>
      </div>

      <div className="mt-10 pt-4 border-t border-[#BAE6FD] w-full flex justify-between">
        <Link href="/" className="text-sm text-[#0F766E] hover:text-[#C4502F] font-semibold">← Home</Link>
        <Link href="/terms" className="text-sm text-[#0F766E] hover:text-[#C4502F] font-semibold">Terms →</Link>
      </div>
    </main>
  );
}
