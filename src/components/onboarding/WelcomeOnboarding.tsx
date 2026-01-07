import React, { useState, useEffect } from 'react';
import { 
  X, 
  Rocket, 
  BookOpen, 
  Building2, 
  DollarSign, 
  AlertTriangle,
  Users,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface WelcomeOnboardingProps {
  totalFacilities: number;
  subsidyGap: number;
  violatorCount: number;
  onComplete: () => void;
}

interface StatBlockProps {
  value: string;
  label: string;
  icon: React.ReactNode;
  color: 'red' | 'blue' | 'amber';
}

const StatBlock: React.FC<StatBlockProps> = ({ value, label, icon, color }) => {
  const colorClasses = {
    red: 'bg-red-50 border-red-200 text-red-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700'
  };

  return (
    <div className={`p-4 rounded-xl border-2 ${colorClasses[color]} transition-transform hover:scale-105`}>
      <div className="flex items-center justify-center mb-2 opacity-70">
        {icon}
      </div>
      <div className="text-2xl font-bold text-center">{value}</div>
      <div className="text-xs font-medium text-center opacity-80">{label}</div>
    </div>
  );
};

const partnerLogos = [
  { name: 'Tech Workers Coalition', abbrev: 'TWC' },
  { name: 'CODE-CWA', abbrev: 'CODE-CWA' },
  { name: 'UPROSE', abbrev: 'UPROSE' },
  { name: 'IBEW', abbrev: 'IBEW' }
];

export const WelcomeOnboarding: React.FC<WelcomeOnboardingProps> = ({
  totalFacilities,
  subsidyGap,
  violatorCount,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    // Check if user has already completed onboarding
    const hasOnboarded = localStorage.getItem('dcim_onboarded');
    if (hasOnboarded === 'true') {
      setIsVisible(false);
      return;
    }
    
    // Animate in after mount
    setTimeout(() => setAnimateIn(true), 100);
  }, []);

  const handleComplete = () => {
    localStorage.setItem('dcim_onboarded', 'true');
    setAnimateIn(false);
    setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, 300);
  };

  const handleSkip = () => {
    localStorage.setItem('dcim_onboarded', 'skipped');
    setAnimateIn(false);
    setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, 300);
  };

  const formatCurrency = (amount: number): string => {
    if (amount >= 1e9) return `$${(amount / 1e9).toFixed(2)}B`;
    if (amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
    return `$${amount.toLocaleString()}`;
  };

  const jobsEquivalent = Math.floor(subsidyGap / 50000).toLocaleString();

  if (!isVisible) return null;

  const steps = [
    // Step 0: Welcome
    {
      content: (
        <div className="text-center space-y-6">
          {/* Animated Hero Icon */}
          <div className="relative">
            <div className="text-7xl animate-bounce">💪</div>
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-amber-400 animate-pulse" />
          </div>
          
          {/* Mission Statement */}
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Data Center Accountability Dashboard
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-md mx-auto">
              Arming labor unions with data to fight Big Tech's broken job creation promises
            </p>
          </div>
          
          {/* Key Stats */}
          <div className="grid grid-cols-3 gap-4 py-4">
            <StatBlock 
              value={formatCurrency(subsidyGap)}
              label="Subsidy Gap"
              icon={<DollarSign className="w-5 h-5" />}
              color="red"
            />
            <StatBlock 
              value={totalFacilities.toLocaleString()}
              label="Facilities Tracked"
              icon={<Building2 className="w-5 h-5" />}
              color="blue"
            />
            <StatBlock 
              value={violatorCount.toLocaleString()}
              label="Violators Exposed"
              icon={<AlertTriangle className="w-5 h-5" />}
              color="amber"
            />
          </div>

          {/* Human Context */}
          <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(subsidyGap)}</span> 
            {' '}in broken promises = <span className="font-semibold">{jobsEquivalent} jobs</span> at $50k/year
          </div>
          
          {/* Partner Logos */}
          <div className="pt-2">
            <p className="text-xs text-slate-500 mb-3">Supporting labor organizers at:</p>
            <div className="flex justify-center gap-4 flex-wrap">
              {partnerLogos.map((partner) => (
                <div 
                  key={partner.abbrev}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  {partner.abbrev}
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    // Step 1: Quick Tour
    {
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-5xl mb-4">🗺️</div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Quick Navigation Guide
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              Here's how to find what you need
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: '🏠', title: 'Overview', desc: 'See the big picture — top violators, key stats' },
              { icon: '🏢', title: 'Facilities', desc: 'Search and filter 11,992 data centers' },
              { icon: '🧠', title: 'Intelligence', desc: 'AI-powered analysis and organizing tools' },
              { icon: '🛠️', title: 'Tools', desc: 'FOIA generator, CBA monitor, coalition hub' }
            ].map((item, i) => (
              <div 
                key={i}
                className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{item.title}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 ml-auto" />
              </div>
            ))}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-sm">
            <p className="text-blue-700 dark:text-blue-300">
              <strong>💡 Pro tip:</strong> Use <kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">Cmd+K</kbd> to quickly jump to any section
            </p>
          </div>
        </div>
      )
    },
    // Step 2: Take Action
    {
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-5xl mb-4">⚡</div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Ready to Take Action?
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              Start holding Big Tech accountable today
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: '📝', title: 'File FOIA Request', desc: 'Get subsidy documents' },
              { icon: '📊', title: 'Run Analysis', desc: 'Find organizing targets' },
              { icon: '🗺️', title: 'View Map', desc: 'See facilities near you' },
              { icon: '📞', title: 'Coalition Hub', desc: 'Coordinate campaigns' }
            ].map((action, i) => (
              <button
                key={i}
                className="p-4 text-left bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all hover:scale-[1.02]"
              >
                <span className="text-2xl block mb-2">{action.icon}</span>
                <div className="font-semibold text-slate-900 dark:text-white text-sm">{action.title}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{action.desc}</div>
              </button>
            ))}
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
            <p className="text-green-700 dark:text-green-300 font-medium">
              🎉 You're all set! Click below to start exploring.
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div 
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-opacity duration-300 ${
        animateIn ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div 
        className={`bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden transition-all duration-300 ${
          animateIn ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        {/* Progress Indicator */}
        <div className="flex gap-1 p-4 pb-0">
          {steps.map((_, i) => (
            <div 
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= currentStep ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {steps[currentStep].content}
        </div>

        {/* Footer Actions */}
        <div className="px-6 pb-6 flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(s => s - 1)}
              className="px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
            >
              Back
            </button>
          )}
          
          <button
            onClick={handleSkip}
            className="px-4 py-2.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium transition-colors"
          >
            Skip
          </button>

          <div className="flex-1" />

          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(s => s + 1)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Rocket className="w-4 h-4" />
              Start Exploring
            </button>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default WelcomeOnboarding;

