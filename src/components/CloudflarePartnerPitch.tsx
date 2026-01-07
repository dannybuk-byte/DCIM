/**
 * Cloudflare Technology Partner Program Pitch Deck
 * 
 * Interactive presentation for pitching DCIM integration to Cloudflare
 * Based on the Coalition Weapon strategy document.
 * 
 * Key Value Proposition:
 * "You see the traffic. We see where it comes from before it reaches you."
 */

import React, { useState, memo } from 'react';
import {
  Globe,
  Shield,
  Zap,
  TrendingUp,
  DollarSign,
  Users,
  Server,
  Activity,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Check,
  ArrowRight,
  Building2,
  Eye,
  AlertTriangle,
  FileJson,
  Scale,
} from 'lucide-react';
import { AI_COMPANY_WATCHLIST, getKnownAICompanyScores } from '../services/aiInfrastructureIntelligence';

// =============================================================================
// SLIDE DATA
// =============================================================================

interface Slide {
  id: string;
  title: string;
  subtitle?: string;
  component: React.FC<{ onNext: () => void }>;
}

// =============================================================================
// INDIVIDUAL SLIDES
// =============================================================================

const TitleSlide = memo(function TitleSlide({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="mb-8">
        <div className="inline-flex items-center gap-4 mb-6">
          <div className="p-4 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl">
            <Shield className="w-16 h-16 text-orange-400" />
          </div>
          <span className="text-4xl">×</span>
          <div className="p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl">
            <Globe className="w-16 h-16 text-blue-400" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">
          DCIM × Cloudflare
        </h1>
        <p className="text-xl text-[#8b949e] max-w-2xl">
          Infrastructure Intelligence for the Clean Internet Coalition
        </p>
      </div>
      
      <div className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl border border-blue-500/20 max-w-2xl">
        <p className="text-2xl italic text-[#c9d1d9]">
          "You see the traffic. We see where it comes from <em className="text-blue-400">before</em> it reaches you."
        </p>
      </div>
      
      <button
        onClick={onNext}
        className="mt-12 flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors"
      >
        Start Presentation
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
});

const ProblemSlide = memo(function ProblemSlide({ onNext }: { onNext: () => void }) {
  const stats = [
    { value: '$238B', label: 'Annual cost of AI content flooding', color: 'text-red-400' },
    { value: '50B', label: 'Daily AI crawler requests (Cloudflare data)', color: 'text-orange-400' },
    { value: '60,000:1', label: 'Worst crawl-to-refer ratio (Anthropic)', color: 'text-amber-400' },
    { value: '416B', label: 'AI bot requests blocked by Cloudflare', color: 'text-blue-400' },
  ];

  return (
    <div className="p-8 h-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">The Problem</h2>
        <p className="text-[#8b949e]">AI infrastructure is invisible until it hits your edge</p>
      </div>
      
      <div className="grid grid-cols-2 gap-6 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="p-6 bg-[#0d1117] rounded-xl border border-[#30363d]">
            <div className={`text-4xl font-bold ${stat.color} mb-2`}>{stat.value}</div>
            <div className="text-[#8b949e]">{stat.label}</div>
          </div>
        ))}
      </div>
      
      <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-red-400 mb-2">The Gap</h3>
            <p className="text-[#c9d1d9]">
              Content-layer detection sees crawlers <em>after</em> they arrive. 
              Infrastructure-layer intelligence sees them <em>12-36 months before deployment</em> 
              through certificate transparency, BGP announcements, and facility buildout tracking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

const SolutionSlide = memo(function SolutionSlide({ onNext }: { onNext: () => void }) {
  const features = [
    {
      icon: <Eye className="w-6 h-6" />,
      title: 'AI Company AS Watchlist',
      description: '8 companies, 11 ASNs, real-time BGP monitoring',
      status: 'Live',
    },
    {
      icon: <Scale className="w-6 h-6" />,
      title: 'Clean Internet Score',
      description: 'Crawl-to-refer ratio ranking for all major AI companies',
      status: 'Live',
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Certificate Transparency',
      description: '12-36 month early warning on infrastructure expansion',
      status: 'Live',
    },
    {
      icon: <Server className="w-6 h-6" />,
      title: 'Data Center Classification',
      description: '11,992 facility manifest for IP origin classification',
      status: 'Live',
    },
    {
      icon: <FileJson className="w-6 h-6" />,
      title: 'STIX 2.1 Export',
      description: 'Threat intelligence feeds for SIEM integration',
      status: 'Live',
    },
    {
      icon: <Activity className="w-6 h-6" />,
      title: 'Real-Time Alerts',
      description: 'Instant notification on AI infrastructure changes',
      status: 'Live',
    },
  ];

  return (
    <div className="p-8 h-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Our Solution</h2>
        <p className="text-[#8b949e]">Infrastructure-layer intelligence that complements your content-layer tools</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {features.map((feature, i) => (
          <div key={i} className="p-4 bg-[#0d1117] rounded-xl border border-[#30363d] hover:border-blue-500/50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                {feature.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                    {feature.status}
                  </span>
                </div>
                <p className="text-sm text-[#8b949e] mt-1">{feature.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

const CleanInternetScoreSlide = memo(function CleanInternetScoreSlide({ onNext }: { onNext: () => void }) {
  const scores = getKnownAICompanyScores();

  return (
    <div className="p-8 h-full">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">Clean Internet Score</h2>
        <p className="text-[#8b949e]">The metric that justifies your blocking decisions</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          {scores.slice(0, 4).map(score => (
            <div key={score.company} className="flex items-center gap-4 p-3 bg-[#0d1117] rounded-lg">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${
                score.grade === 'F' ? 'bg-red-500/20 text-red-400' :
                score.grade === 'D' ? 'bg-orange-500/20 text-orange-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {score.grade}
              </div>
              <div className="flex-1">
                <div className="font-medium text-white">{score.company}</div>
                <div className="text-xs text-[#8b949e]">{score.crawlToReferRatio.toLocaleString()}:1 ratio</div>
              </div>
              <div className={`text-2xl font-bold ${
                score.score >= 40 ? 'text-yellow-400' :
                score.score >= 20 ? 'text-orange-400' : 'text-red-400'
              }`}>
                {score.score}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {scores.slice(4, 8).map(score => (
            <div key={score.company} className="flex items-center gap-4 p-3 bg-[#0d1117] rounded-lg">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${
                score.grade === 'F' ? 'bg-red-500/20 text-red-400' :
                score.grade === 'D' ? 'bg-orange-500/20 text-orange-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {score.grade}
              </div>
              <div className="flex-1">
                <div className="font-medium text-white">{score.company}</div>
                <div className="text-xs text-[#8b949e]">{score.crawlToReferRatio.toLocaleString()}:1 ratio</div>
              </div>
              <div className={`text-2xl font-bold ${
                score.score >= 40 ? 'text-yellow-400' :
                score.score >= 20 ? 'text-orange-400' : 'text-red-400'
              }`}>
                {score.score}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
        <p className="text-[#c9d1d9]">
          <strong className="text-blue-400">Cloudflare Value:</strong> Compute this score at the AS level 
          across your entire customer base. Justify blocking decisions with infrastructure-level data 
          unavailable from content analysis alone.
        </p>
      </div>
    </div>
  );
});

const IntegrationSlide = memo(function IntegrationSlide({ onNext }: { onNext: () => void }) {
  const integrations = [
    {
      name: 'Bot Management',
      description: 'Pre-populate IP reputation with AI crawler origin data',
      icon: <Shield className="w-5 h-5" />,
    },
    {
      name: 'Security Center',
      description: 'AI infrastructure alerts as threat intelligence',
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      name: 'Workers/Workers AI',
      description: 'Edge compute for real-time classification',
      icon: <Zap className="w-5 h-5" />,
    },
    {
      name: 'Radar',
      description: 'Clean Internet Score visualization layer',
      icon: <Activity className="w-5 h-5" />,
    },
  ];

  return (
    <div className="p-8 h-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Cloudflare Integration</h2>
        <p className="text-[#8b949e]">How our intelligence enhances your products</p>
      </div>
      
      <div className="grid grid-cols-2 gap-6 mb-8">
        {integrations.map((integration, i) => (
          <div key={i} className="p-6 bg-[#0d1117] rounded-xl border border-[#30363d]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
                {integration.icon}
              </div>
              <h3 className="font-semibold text-white">{integration.name}</h3>
            </div>
            <p className="text-[#8b949e]">{integration.description}</p>
          </div>
        ))}
      </div>
      
      <div className="p-6 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl">
        <h3 className="font-semibold text-orange-400 mb-3">Technology Partner Program Fit</h3>
        <ul className="space-y-2">
          {[
            'Sandbox access for integration development',
            'Joint go-to-market with enterprise customers',
            'Listed in Cloudflare Apps/Integrations marketplace',
            'Co-branded Clean Internet initiative',
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-[#c9d1d9]">
              <Check className="w-4 h-4 text-green-400" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
});

const CommercialSlide = memo(function CommercialSlide({ onNext }: { onNext: () => void }) {
  return (
    <div className="p-8 h-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Commercial Model</h2>
        <p className="text-[#8b949e]">Flexible partnership structures</p>
      </div>
      
      <div className="grid grid-cols-3 gap-6">
        <div className="p-6 bg-[#0d1117] rounded-xl border border-[#30363d]">
          <div className="text-center mb-4">
            <div className="inline-block p-3 bg-blue-500/20 rounded-xl mb-3">
              <Building2 className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="font-semibold text-white text-lg">Intelligence License</h3>
          </div>
          <div className="text-3xl font-bold text-green-400 text-center mb-4">$50-200K</div>
          <p className="text-sm text-[#8b949e] text-center">Per year</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-center gap-2 text-[#c9d1d9]">
              <Check className="w-4 h-4 text-green-400" />
              Full API access
            </li>
            <li className="flex items-center gap-2 text-[#c9d1d9]">
              <Check className="w-4 h-4 text-green-400" />
              Real-time alerts
            </li>
            <li className="flex items-center gap-2 text-[#c9d1d9]">
              <Check className="w-4 h-4 text-green-400" />
              STIX/TAXII feeds
            </li>
          </ul>
        </div>
        
        <div className="p-6 bg-gradient-to-b from-orange-500/10 to-transparent rounded-xl border border-orange-500/30">
          <div className="text-center mb-4">
            <div className="inline-block p-3 bg-orange-500/20 rounded-xl mb-3">
              <Globe className="w-8 h-8 text-orange-400" />
            </div>
            <h3 className="font-semibold text-white text-lg">Revenue Share</h3>
          </div>
          <div className="text-3xl font-bold text-green-400 text-center mb-4">15-25%</div>
          <p className="text-sm text-[#8b949e] text-center">Of upsell revenue</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-center gap-2 text-[#c9d1d9]">
              <Check className="w-4 h-4 text-green-400" />
              Cloudflare-branded dashboard
            </li>
            <li className="flex items-center gap-2 text-[#c9d1d9]">
              <Check className="w-4 h-4 text-green-400" />
              Enterprise customer access
            </li>
            <li className="flex items-center gap-2 text-[#c9d1d9]">
              <Check className="w-4 h-4 text-green-400" />
              Joint marketing
            </li>
          </ul>
        </div>
        
        <div className="p-6 bg-[#0d1117] rounded-xl border border-[#30363d]">
          <div className="text-center mb-4">
            <div className="inline-block p-3 bg-purple-500/20 rounded-xl mb-3">
              <Users className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="font-semibold text-white text-lg">Coalition Fund</h3>
          </div>
          <div className="text-3xl font-bold text-green-400 text-center mb-4">Free</div>
          <p className="text-sm text-[#8b949e] text-center">For labor/community</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-center gap-2 text-[#c9d1d9]">
              <Check className="w-4 h-4 text-green-400" />
              Organizing intelligence
            </li>
            <li className="flex items-center gap-2 text-[#c9d1d9]">
              <Check className="w-4 h-4 text-green-400" />
              Subsidy accountability
            </li>
            <li className="flex items-center gap-2 text-[#c9d1d9]">
              <Check className="w-4 h-4 text-green-400" />
              Evidence collection
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
});

const CTASlide = memo(function CTASlide({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <h2 className="text-4xl font-bold text-white mb-6">
        Ready to Build the Clean Internet Coalition?
      </h2>
      
      <div className="max-w-2xl mb-8">
        <p className="text-xl text-[#8b949e] mb-6">
          The infrastructure layer is the last place where "clean internet" can be verified.
          Your DCIM integration makes that verification possible.
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-6 max-w-xl mb-8">
        <div className="p-4 bg-[#0d1117] rounded-xl border border-[#30363d]">
          <div className="text-2xl font-bold text-white mb-1">Week 1-2</div>
          <p className="text-sm text-[#8b949e]">Deploy integration demo</p>
        </div>
        <div className="p-4 bg-[#0d1117] rounded-xl border border-[#30363d]">
          <div className="text-2xl font-bold text-white mb-1">Week 3-4</div>
          <p className="text-sm text-[#8b949e]">Technology Partner application</p>
        </div>
        <div className="p-4 bg-[#0d1117] rounded-xl border border-[#30363d]">
          <div className="text-2xl font-bold text-white mb-1">Month 2</div>
          <p className="text-sm text-[#8b949e]">Joint go-to-market</p>
        </div>
        <div className="p-4 bg-[#0d1117] rounded-xl border border-[#30363d]">
          <div className="text-2xl font-bold text-white mb-1">Month 3</div>
          <p className="text-sm text-[#8b949e]">Enterprise customer pilots</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <a
          href="https://www.cloudflare.com/partners/technology-partners/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-colors"
        >
          <ExternalLink className="w-5 h-5" />
          Apply to Partner Program
        </a>
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify({
              title: 'DCIM × Cloudflare Partnership Proposal',
              date: new Date().toISOString(),
              value_proposition: 'Infrastructure intelligence for Clean Internet',
              features: ['AI Company AS Watchlist', 'Clean Internet Score', 'STIX 2.1 Export'],
              commercial_model: '$50-200K/year or revenue share',
            }, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'dcim-cloudflare-proposal.json';
            a.click();
          }}
          className="flex items-center gap-2 px-6 py-3 bg-[#30363d] hover:bg-[#484f58] text-white rounded-xl font-semibold transition-colors"
        >
          <Download className="w-5 h-5" />
          Export Proposal
        </button>
      </div>
    </div>
  );
});

// =============================================================================
// SLIDES ARRAY
// =============================================================================

const slides: Slide[] = [
  { id: 'title', title: 'Title', component: TitleSlide },
  { id: 'problem', title: 'The Problem', component: ProblemSlide },
  { id: 'solution', title: 'Our Solution', component: SolutionSlide },
  { id: 'score', title: 'Clean Internet Score', component: CleanInternetScoreSlide },
  { id: 'integration', title: 'Integration', component: IntegrationSlide },
  { id: 'commercial', title: 'Commercial', component: CommercialSlide },
  { id: 'cta', title: 'Next Steps', component: CTASlide },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CloudflarePartnerPitch: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const goNext = () => setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
  const goPrev = () => setCurrentSlide(prev => Math.max(prev - 1, 0));

  const CurrentSlideComponent = slides[currentSlide].component;

  return (
    <div className="bg-[#0d1117] min-h-screen">
      {/* Header */}
      <div className="border-b border-[#30363d] p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <h1 className="text-white font-semibold">Cloudflare Partnership Pitch</h1>
            <span className="text-[#8b949e]">
              Slide {currentSlide + 1} of {slides.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                onClick={() => setCurrentSlide(i)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  i === currentSlide ? 'bg-orange-500' : 'bg-[#30363d] hover:bg-[#484f58]'
                }`}
                title={slide.title}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Slide Content */}
      <div className="max-w-6xl mx-auto" style={{ minHeight: 'calc(100vh - 140px)' }}>
        <CurrentSlideComponent onNext={goNext} />
      </div>

      {/* Navigation */}
      <div className="border-t border-[#30363d] p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <button
            onClick={goPrev}
            disabled={currentSlide === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#161b22] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#30363d] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>
          
          <div className="flex items-center gap-4">
            <span className="text-[#8b949e]">{slides[currentSlide].title}</span>
          </div>
          
          <button
            onClick={goNext}
            disabled={currentSlide === slides.length - 1}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CloudflarePartnerPitch;

