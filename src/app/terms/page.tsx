export default function TermsPage() {
  return (
    <main className="min-h-dvh flex flex-col items-center p-6 pt-16 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold gradient-text tracking-tight mb-2">Terms of Service</h1>
      <p className="text-xs text-[#C4B5A6] mb-8">Last Updated: May 7, 2026</p>

      <div className="space-y-6 text-sm text-[#6B5E50] leading-relaxed w-full">
        <section>
          <h2 className="text-base font-semibold text-[#3D3428] mb-2">1. Acceptance of Terms</h2>
          <p>By accessing or using Partake, you agree to these Terms of Service. If you do not agree, please do not use the application.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#3D3428] mb-2">2. Service Description</h2>
          <p>Partake is a free bill-splitting tool that helps groups divide restaurant bills fairly by scanning receipts, splitting items, and generating payment links.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#3D3428] mb-2">3. Accuracy of Calculations</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>OCR results may contain errors — verify all parsed items and prices before settling</li>
            <li>Tax rates are approximations based on state averages</li>
            <li>We are not responsible for financial discrepancies from OCR errors or tax calculations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#3D3428] mb-2">4. Payment Services</h2>
          <p>Partake generates deep links to Venmo and Cash App for convenience. We do not process, facilitate, or guarantee any payments. All transactions occur entirely within those services.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#3D3428] mb-2">5. Shared Bills</h2>
          <p>Bills shared via unique links are accessible to anyone with the link. You are responsible for sharing links only with intended recipients.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#3D3428] mb-2">6. Acceptable Use</h2>
          <p>You agree not to use the service for fraudulent billing, upload non-receipt images, attempt unauthorized access, or use the service for any unlawful purpose.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#3D3428] mb-2">7. Limitation of Liability</h2>
          <p className="uppercase text-xs font-semibold text-[#3D3428]">Partake is provided &quot;as is&quot; without warranties of any kind. We shall not be liable for errors in OCR parsing, incorrect tax calculations, payment disputes between participants, or loss of data.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#3D3428] mb-2">8. Governing Law</h2>
          <p>These Terms shall be governed by the laws of the State of New York.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#3D3428] mb-2">9. Contact</h2>
          <p>Email: <a href="mailto:sharipaltrowitz@gmail.com" className="text-[#E8613C] hover:text-[#C4502F]">sharipaltrowitz@gmail.com</a></p>
        </section>
      </div>

      <div className="mt-10 pt-4 border-t border-[#E8DFD4] w-full flex justify-between">
        <a href="/" className="text-sm text-[#E8613C] hover:text-[#C4502F] font-semibold">← Home</a>
        <a href="/privacy" className="text-sm text-[#E8613C] hover:text-[#C4502F] font-semibold">Privacy →</a>
      </div>
    </main>
  );
}
