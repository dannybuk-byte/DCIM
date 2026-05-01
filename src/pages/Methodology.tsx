import React from 'react';

interface MethodologyProps {
  onClose: () => void;
}

export const Methodology: React.FC<MethodologyProps> = ({ onClose }) => {
  return (
    <main
      id="methodology"
      className="min-h-0 flex-1 overflow-y-auto bg-slate-950 text-slate-100"
    >
      <div className="mx-auto max-w-3xl px-4 py-8 pb-16">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            ← Back to dashboard
          </button>
        </div>

        <h1 className="mb-6 text-2xl font-bold tracking-tight text-white md:text-3xl">
          Methodology & Sources
        </h1>

        <section className="mb-10 space-y-3">
          <h2 className="text-lg font-semibold text-teal-300">What this dashboard does</h2>
          <p className="leading-relaxed text-slate-300">
            The DCIM Compliance Dashboard tracks data center subsidy commitments against actual delivery using public-records OSINT. Built for unions, community organizers, environmental justice groups, journalists, municipal staff.
          </p>
        </section>

        <section className="mb-10 space-y-3">
          <h2 className="text-lg font-semibold text-teal-300">Data sources</h2>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed text-slate-300">
            <li>Subsidy agreements: Good Jobs First Subsidy Tracker, state economic development agency filings</li>
            <li>Corporate disclosures: SEC EDGAR (10-K, 10-Q, 8-K)</li>
            <li>Compliance signals: EPA ECHO, OSHA enforcement, NLRB filings</li>
            <li>Network infrastructure: PeeringDB, RIPE RIS Live (BGP), crt.sh</li>
          </ul>
        </section>

        <section className="mb-10 space-y-3">
          <h2 className="text-lg font-semibold text-teal-300">Methodology</h2>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed text-slate-300">
            <li>
              Facility count (11,992): Edge-inclusive — includes traditional DCs, edge POPs, CDN, CORD. Provider-specific counts may differ from &quot;physical building&quot; headlines.
            </li>
            <li>
              Subsidy gap: (jobs promised) – (jobs verified in BLS QCEW + WARN + SEC). Dollar gap uses agreement-stated cost-per-job.
            </li>
            <li>
              Compliance status:
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>Compliant: ≥90% of targets, current on reporting</li>
                <li>At Risk: 60–90%, OR reporting delays &gt;6 months</li>
                <li>Non-Compliant: &lt;60%, OR active enforcement, OR documented misrepresentation</li>
                <li>Unknown: Insufficient public data</li>
              </ul>
            </li>
          </ul>
        </section>

        <section className="mb-10 space-y-3">
          <h2 className="text-lg font-semibold text-teal-300">Limitations</h2>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed text-slate-300">
            <li>
              Surfaces non-compliance, under-compliance, subsidy gaps, shortfall — terminology chosen because fraud requires proving intent. We do not assert intent.
            </li>
            <li>Demo data by default. Import verified sources to track real compliance.</li>
            <li>Coverage skews US.</li>
            <li>Does NOT track individual workers. Facility/operator level only.</li>
          </ul>
        </section>

        <section className="mb-10 space-y-3">
          <h2 className="text-lg font-semibold text-teal-300">Built by</h2>
          <p className="leading-relaxed text-slate-300">
            Daniel Buk · Strategic researcher, labor organizer · NYC
          </p>
        </section>

        <section className="space-y-3 border-t border-slate-700 pt-8">
          <h2 className="text-lg font-semibold text-teal-300">License & contact</h2>
          <p className="leading-relaxed text-slate-300">
            Open-source MIT ·{' '}
            <a
              href="https://github.com/dannybuk-byte/DCIM"
              className="font-semibold text-teal-400 underline underline-offset-2 hover:text-teal-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/dannybuk-byte/DCIM
            </a>
          </p>
        </section>
      </div>
    </main>
  );
};
