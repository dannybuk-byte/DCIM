import React, { useState } from 'react';
import { X, HelpCircle, Search, Keyboard, Map, BarChart3, Layers, ChevronRight, Info, Sparkles, Target } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'getting-started' | 'features' | 'shortcuts' | 'faq'>('getting-started');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0d1219] border border-[#00d2d3]/30 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#00d2d3]/20">
          <div className="flex items-center gap-3">
            <HelpCircle size={24} className="text-[#00d2d3]" />
            <h2 className="text-xl font-bold text-white">Help & Navigation Guide</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#00d2d3]/20">
          {[
            { id: 'getting-started', label: 'Getting Started', icon: Info },
            { id: 'features', label: 'Features Guide', icon: Map },
            { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
            { id: 'faq', label: 'FAQ', icon: HelpCircle }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === id
                  ? 'bg-[#00d2d3]/20 text-[#00d2d3] border-b-2 border-[#00d2d3]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'getting-started' && <GettingStartedContent />}
          {activeTab === 'features' && <FeaturesContent />}
          {activeTab === 'shortcuts' && <ShortcutsContent />}
          {activeTab === 'faq' && <FAQContent />}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#00d2d3]/20 bg-[#0a0e17] text-center">
          <p className="text-xs text-gray-400">
            Press <kbd className="px-2 py-1 bg-white/10 rounded text-xs">?</kbd> anytime to open this guide
          </p>
        </div>
      </div>
    </div>
  );
};

const GettingStartedContent: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-bold text-[#00d2d3] mb-3">Welcome to DCIM Command Center!</h3>
      <p className="text-sm text-gray-300 mb-4">
        Track 11,992 data center facilities and their compliance with job creation promises. 
        This dashboard helps labor organizers investigate the $2.48B+ subsidy gap.
      </p>
    </div>

    <div className="space-y-4">
      <div className="p-4 bg-[#00d2d3]/10 border border-[#00d2d3]/20 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#00d2d3] flex items-center justify-center flex-shrink-0 text-black font-bold">
            1
          </div>
          <div>
            <h4 className="font-semibold text-white mb-1">Choose Your View</h4>
            <p className="text-sm text-gray-300 mb-2">
              Click view mode buttons at the top: <span className="text-[#00d2d3]">OMNI</span>, <span className="text-[#00d2d3]">DEEP</span>, <span className="text-[#00d2d3]">HUD</span>, etc.
            </p>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• <strong className="text-white">OMNI</strong>: Grid view with Natural Language Search</li>
              <li>• <strong className="text-white">DEEP</strong>: Detailed drill-down with Investigation Templates</li>
              <li>• <strong className="text-white">HUD</strong>: Radial display of critical targets</li>
              <li>• <strong className="text-white">MAP</strong>: Geographic view by state</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="p-4 bg-[#ffa502]/10 border border-[#ffa502]/20 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#ffa502] flex items-center justify-center flex-shrink-0 text-black font-bold">
            2
          </div>
          <div>
            <h4 className="font-semibold text-white mb-1">Search with Natural Language</h4>
            <p className="text-sm text-gray-300 mb-2">
              In <span className="text-[#00d2d3]">OMNI</span> view, type questions naturally:
            </p>
            <div className="bg-black/30 p-2 rounded text-xs font-mono text-[#00d2d3]">
              "Show me non-compliant facilities in Texas"
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-[#2ed573]/10 border border-[#2ed573]/20 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#2ed573] flex items-center justify-center flex-shrink-0 text-black font-bold">
            3
          </div>
          <div>
            <h4 className="font-semibold text-white mb-1">Use Investigation Templates</h4>
            <p className="text-sm text-gray-300 mb-2">
              In <span className="text-[#00d2d3]">DEEP</span> view, expand any facility and scroll to "Quick Investigations":
            </p>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• Regional Comparison</li>
              <li>• Operator Track Record</li>
              <li>• Largest Subsidy Gaps</li>
              <li>• ...7 more templates</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-white font-bold">
            4
          </div>
          <div>
            <h4 className="font-semibold text-white mb-1">Configure AI (Optional)</h4>
            <p className="text-sm text-gray-300 mb-2">
              Click the <span className="text-[#00d2d3]">AI</span> button in top bar to add your OpenAI API key for:
            </p>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• AI-powered natural language search</li>
              <li>• Facility summaries (coming soon)</li>
              <li>• Advanced research (coming soon)</li>
            </ul>
            <p className="text-[10px] text-gray-500 mt-2">
              Dashboard works without AI - templates and keyword search are free!
            </p>
          </div>
        </div>
      </div>
    </div>

    <div className="p-4 bg-[#ff4757]/10 border border-[#ff4757]/20 rounded-lg">
      <h4 className="font-semibold text-[#ff4757] mb-2">Understanding Compliance Status</h4>
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#2ed573]" />
          <span className="text-white font-semibold">Compliant:</span>
          <span className="text-gray-400">Meeting job creation promises</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ffa502]" />
          <span className="text-white font-semibold">At Risk:</span>
          <span className="text-gray-400">Falling behind on job targets</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff4757]" />
          <span className="text-white font-semibold">Non-Compliant:</span>
          <span className="text-gray-400">Significantly under job promises</span>
        </div>
      </div>
    </div>
  </div>
);

const FeaturesContent: React.FC = () => (
  <div className="space-y-4">
    <Feature
      icon={<Search size={20} className="text-[#00d2d3]" />}
      title="Natural Language Search"
      location="OMNI View"
      description="Ask questions in plain English like 'Show me non-compliant facilities in Texas' and get instant results."
      steps={[
        "Click in search box at top of OMNI view",
        "Type your question naturally",
        "Press Enter or click Search",
        "View results with stats and facility cards"
      ]}
    />

    <Feature
      icon={<Target size={20} className="text-[#ffa502]" />}
      title="Investigation Templates"
      location="DEEP View → Expand Facility → Overview Tab"
      description="10 pre-built queries for common compliance investigations. No AI needed!"
      steps={[
        "Switch to DEEP view",
        "Click any facility card to expand",
        "Scroll to 'Quick Investigations' section",
        "Click a category (Tracking/Comparison/Analysis)",
        "Click a template to run query",
        "Results open in modal with clickable facilities"
      ]}
    />

    <Feature
      icon={<Sparkles size={20} className="text-[#2ed573]" />}
      title="AI Settings"
      location="AI Button (Top Bar)"
      description="Configure your OpenAI or Anthropic API key for AI-powered features."
      steps={[
        "Click AI button in top bar",
        "Select provider (OpenAI or Anthropic)",
        "Paste your API key",
        "Select model (GPT-4 Turbo recommended)",
        "Toggle Enable AI Features",
        "Click Save Settings"
      ]}
    />

    <Feature
      icon={<Layers size={20} className="text-white" />}
      title="Deep Dive Mode"
      location="DEEP View"
      description="Explore ultra-granular data: racks, servers, employees, transactions, incidents."
      steps={[
        "Switch to DEEP view",
        "Click facility card to expand",
        "Navigate tabs: Overview, Financial, Technical, Workforce, Timeline",
        "Expand sections for deeper detail",
        "Nested tabs show specialized data",
        "Infinite scroll loads more facilities"
      ]}
    />

    <Feature
      icon={<BarChart3 size={20} className="text-[#ffa502]" />}
      title="HUD View"
      location="HUD View"
      description="Radial 'heads-up display' showing critical non-compliant facilities."
      steps={[
        "Switch to HUD view",
        "Critical targets orbit the center",
        "Click any target for details",
        "Fullscreen mode shows 24 targets (F key)"
      ]}
    />

    <Feature
      icon={<Map size={20} className="text-[#00d2d3]" />}
      title="Geographic Map"
      location="MAP View"
      description="Visual map of facilities by state with color-coded compliance."
      steps={[
        "Switch to MAP view",
        "States colored by compliance rate",
        "Click state to see facilities",
        "Fullscreen for more detail (F key)"
      ]}
    />
  </div>
);

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  location: string;
  description: string;
  steps: string[];
}

const Feature: React.FC<FeatureProps> = ({ icon, title, location, description, steps }) => (
  <div className="p-4 bg-white/5 border border-white/10 rounded-lg hover:border-[#00d2d3]/30 transition-colors">
    <div className="flex items-start gap-3 mb-3">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1">
        <h4 className="font-semibold text-white mb-1">{title}</h4>
        <p className="text-xs text-[#00d2d3]">{location}</p>
      </div>
    </div>
    <p className="text-sm text-gray-300 mb-3">{description}</p>
    <div className="space-y-1.5">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
          <ChevronRight size={14} className="text-[#00d2d3] flex-shrink-0 mt-0.5" />
          <span>{step}</span>
        </div>
      ))}
    </div>
  </div>
);

const ShortcutsContent: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-bold text-[#00d2d3] mb-2">Keyboard Shortcuts</h3>
      <p className="text-sm text-gray-400">Press these keys anytime for quick navigation:</p>
    </div>

    <div className="space-y-4">
      <ShortcutSection title="Global">
        <Shortcut keys={['F']} description="Toggle fullscreen mode" />
        <Shortcut keys={['Esc']} description="Exit fullscreen / Close modal" />
        <Shortcut keys={['?']} description="Open this help guide" />
      </ShortcutSection>

      <ShortcutSection title="Search">
        <Shortcut keys={['Enter']} description="Execute search" />
        <Shortcut keys={['Esc']} description="Close suggestions dropdown" />
      </ShortcutSection>

      <ShortcutSection title="Navigation">
        <Shortcut keys={['1']} description="Switch to OMNI view" />
        <Shortcut keys={['2']} description="Switch to DEEP view" />
        <Shortcut keys={['3']} description="Switch to HUD view" />
        <Shortcut keys={['4']} description="Switch to MAP view" />
      </ShortcutSection>

      <ShortcutSection title="Mouse">
        <Shortcut keys={['Hover top']} description="Expand top bar controls" />
        <Shortcut keys={['Hover left']} description="Show timeline panel" />
        <Shortcut keys={['Hover right']} description="Show alerts panel" />
      </ShortcutSection>
    </div>

    <div className="p-4 bg-[#00d2d3]/10 border border-[#00d2d3]/20 rounded-lg">
      <p className="text-xs text-gray-300">
        <strong className="text-white">Pro Tip:</strong> Most shortcuts work in all views. 
        Press <kbd className="px-2 py-1 bg-white/10 rounded text-[10px]">F</kbd> in any view to maximize screen space!
      </p>
    </div>
  </div>
);

const ShortcutSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4 className="text-sm font-semibold text-white mb-2">{title}</h4>
    <div className="space-y-2">
      {children}
    </div>
  </div>
);

const Shortcut: React.FC<{ keys: string[]; description: string }> = ({ keys, description }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-gray-300">{description}</span>
    <div className="flex gap-1">
      {keys.map((key, i) => (
        <kbd key={i} className="px-3 py-1 bg-white/10 border border-white/20 rounded text-xs font-mono text-white">
          {key}
        </kbd>
      ))}
    </div>
  </div>
);

const FAQContent: React.FC = () => (
  <div className="space-y-4">
    <FAQ
      question="What is this dashboard for?"
      answer="This is a labor accountability tool tracking 11,992 data center facilities and their compliance with job creation promises. It helps organizers investigate the $2.48B+ subsidy gap - public money given to corporations that didn't deliver promised jobs."
    />

    <FAQ
      question="Do I need an API key to use this?"
      answer="No! The dashboard works great without any API key. Investigation Templates and keyword-based search are completely free. An OpenAI/Anthropic API key only unlocks AI-powered natural language search for higher accuracy (~95% vs ~70%)."
    />

    <FAQ
      question="How do I search for facilities?"
      answer="Two ways: (1) Use Natural Language Search in OMNI view - just type naturally like 'Show me non-compliant facilities in Texas'. (2) Use Investigation Templates in DEEP view - 10 pre-built queries for common investigations."
    />

    <FAQ
      question="What's the difference between view modes?"
      answer={
        <ul className="space-y-1 text-xs mt-2">
          <li>• <strong>OMNI:</strong> Overview grid with Natural Language Search</li>
          <li>• <strong>DEEP:</strong> Detailed drill-down with Investigation Templates</li>
          <li>• <strong>HUD:</strong> Radial display of critical targets</li>
          <li>• <strong>TIME:</strong> Timeline view of facility milestones</li>
          <li>• <strong>NET:</strong> Network connections between facilities</li>
          <li>• <strong>MAP:</strong> Geographic map by state</li>
          <li>• <strong>BOARD:</strong> Kanban board by compliance status</li>
        </ul>
      }
    />

    <FAQ
      question="How much does the API cost?"
      answer="If you add your own OpenAI API key, it costs ~$0.005 per query (half a cent). With caching, effective cost is ~$0.001 per query. Heavy users spend $1-5/month. You control your own key and can disable AI anytime."
    />

    <FAQ
      question="Where is the data from?"
      answer="Data is compiled from government sources: EPA ECHO, SEC EDGAR, USASpending.gov, state subsidy databases, and facility operator disclosures. The methodology is 'edge-inclusive' - counting all infrastructure types (DCs, POPs, CDN, CORD), not just traditional data centers."
    />

    <FAQ
      question="Can I export the data?"
      answer="Currently, you can click facilities to view details and use browser dev tools to access IndexedDB. CSV export and saved searches are planned for future releases."
    />

    <FAQ
      question="What are Investigation Templates?"
      answer="Pre-built database queries that answer common questions like 'Show me largest subsidy gaps' or 'Compare to regional facilities'. They're instant, free, and work offline. Find them in DEEP view → expand any facility → Quick Investigations section."
    />

    <FAQ
      question="Why is a facility marked 'Non-Compliant'?"
      answer="Facilities are non-compliant when they create significantly fewer jobs than promised in their subsidy agreements. The 'subsidy gap' shows how much public money was given without delivering promised employment. We use compliance language (not 'fraud') to avoid the legal burden of proving criminal intent."
    />

    <FAQ
      question="Can I contribute data or corrections?"
      answer="Yes! This is an open accountability project. Contact the maintainers through GitHub or coalition partners (Tech Workers Coalition, CODE-CWA) to submit corrections or additional facility data."
    />

    <FAQ
      question="Is my API key secure?"
      answer="Your API key is stored only in your browser's localStorage (base64 encoded). It never leaves your device except to call OpenAI/Anthropic directly. No server stores your key. You can delete it anytime in AI Settings."
    />

    <FAQ
      question="What's the 'Smart Panels' feature?"
      answer="Hover your mouse near screen edges to reveal panels: top for controls, left for timeline, right for alerts. They auto-hide when you move away. Toggle with Show/Hide buttons or press F for fullscreen to maximize data space."
    />

    <FAQ
      question="The page feels slow. What can I do?"
      answer="First load takes a few seconds to seed 11,992 facilities into IndexedDB. After that, queries are instant. Clear browser cache if performance degrades. Use fullscreen mode (F key) to reduce rendering overhead."
    />
  </div>
);

const FAQ: React.FC<{ question: string; answer: React.ReactNode }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden hover:border-[#00d2d3]/30 transition-colors">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 text-left flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
      >
        <span className="font-semibold text-white text-sm pr-4">{question}</span>
        <ChevronRight
          size={16}
          className={`text-[#00d2d3] flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="p-4 bg-black/30 text-sm text-gray-300">
          {typeof answer === 'string' ? <p>{answer}</p> : answer}
        </div>
      )}
    </div>
  );
};

