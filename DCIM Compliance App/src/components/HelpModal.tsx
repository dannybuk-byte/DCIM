import React, { useState, useEffect } from 'react';
import { X, HelpCircle, Search, Keyboard, Map, BarChart3, Layers, ChevronRight, Info, Sparkles, Target, Zap, BookOpen, MessageCircle, Star, TrendingUp, Award } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<'home' | 'getting-started' | 'features' | 'shortcuts' | 'faq'>('home');
  const [showWelcome, setShowWelcome] = useState(false);

  // Check if first time user
  useEffect(() => {
    if (isOpen) {
      const hasSeenHelp = localStorage.getItem('dcim-help-seen');
      if (!hasSeenHelp) {
        setShowWelcome(true);
        localStorage.setItem('dcim-help-seen', 'true');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fadeIn">
      <div className="bg-gradient-to-br from-[#0d1219] via-[#0a0e17] to-[#0d1219] border-2 border-[#00d2d3]/50 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col animate-slideUp">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#00d2d3]/5 via-transparent to-[#ffa502]/5 animate-pulse-slow pointer-events-none" />
        
        {/* Header with animated gradient */}
        <div className="relative p-8 pb-6 border-b border-[#00d2d3]/30 bg-gradient-to-r from-[#00d2d3]/20 via-[#ffa502]/10 to-transparent overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#00d2d3]/20 to-[#ffa502]/20 animate-shimmer" />
          
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-gray-400 hover:text-white transition-all hover:rotate-90 duration-300 z-10 hover:scale-110"
          >
            <X size={32} />
          </button>
          
          <div className="flex items-center gap-4 mb-2 relative z-10">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00d2d3] via-[#ffa502] to-[#ff4757] flex items-center justify-center animate-pulse-slow shadow-lg shadow-[#00d2d3]/50">
              <HelpCircle size={36} className="text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-[#00d2d3] to-white bg-clip-text text-transparent mb-1 animate-gradient">
                DCIM Help Center
              </h1>
              <p className="text-xl text-gray-300">Everything you need to track data center compliance</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          {showWelcome && <WelcomeOverlay onDismiss={() => setShowWelcome(false)} />}
          {activeSection === 'home' && <HomeContent onNavigate={setActiveSection} />}
          {activeSection === 'getting-started' && <GettingStartedContent onBack={() => setActiveSection('home')} />}
          {activeSection === 'features' && <FeaturesContent onBack={() => setActiveSection('home')} />}
          {activeSection === 'shortcuts' && <ShortcutsContent onBack={() => setActiveSection('home')} />}
          {activeSection === 'faq' && <FAQContent onBack={() => setActiveSection('home')} />}
        </div>

        {/* Footer with glow effect */}
        <div className="p-6 border-t border-[#00d2d3]/30 bg-[#0a0e17]/50 flex items-center justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#00d2d3]/10 to-transparent animate-pulse-slow" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="text-sm text-gray-400">
              <span className="font-semibold text-[#00d2d3] animate-pulse">Quick Tip:</span> Press{' '}
              <kbd className="px-3 py-1.5 bg-gradient-to-br from-[#00d2d3]/20 to-[#00d2d3]/10 border border-[#00d2d3]/50 rounded text-sm text-white font-mono mx-1 shadow-lg shadow-[#00d2d3]/20">
                ?
              </kbd>{' '}
              anytime to open this guide
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400 relative z-10">
            <span>Press</span>
            <kbd className="px-3 py-1.5 bg-white/10 border border-white/20 rounded text-sm text-white font-mono">Esc</kbd>
            <span>to close</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(0, 210, 211, 0.5); }
          50% { box-shadow: 0 0 40px rgba(0, 210, 211, 0.8), 0 0 60px rgba(0, 210, 211, 0.4); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-slideUp { animation: slideUp 0.4s ease-out; }
        .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
        .animate-shimmer { animation: shimmer 3s ease-in-out infinite; }
        .animate-gradient { 
          background-size: 200% auto;
          animation: gradient 3s linear infinite; 
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-glow { animation: glow 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

const WelcomeOverlay: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => (
  <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center animate-fadeIn">
    <div className="max-w-2xl p-12 text-center animate-slideUp">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00d2d3] via-[#ffa502] to-[#ff4757] flex items-center justify-center mx-auto mb-6 animate-float shadow-2xl shadow-[#00d2d3]/50">
        <Star size={48} className="text-white" />
      </div>
      <h2 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-white via-[#00d2d3] to-white bg-clip-text text-transparent">
        Welcome to Your Command Center!
      </h2>
      <p className="text-2xl text-gray-300 mb-8 leading-relaxed">
        Track <span className="text-[#00d2d3] font-bold">11,992 facilities</span> and investigate the{' '}
        <span className="text-[#ff4757] font-bold">$2.48B+ subsidy gap</span>
      </p>
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-[#00d2d3]/20 to-transparent border-l-4 border-[#00d2d3] rounded-lg">
          <TrendingUp size={24} className="text-[#00d2d3] flex-shrink-0" />
          <p className="text-left text-gray-300">
            <strong className="text-white">Real-time tracking</strong> of data center compliance with job creation promises
          </p>
        </div>
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-[#ffa502]/20 to-transparent border-l-4 border-[#ffa502] rounded-lg">
          <Award size={24} className="text-[#ffa502] flex-shrink-0" />
          <p className="text-left text-gray-300">
            <strong className="text-white">10 investigation tools</strong> - no AI required, completely free!
          </p>
        </div>
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-[#2ed573]/20 to-transparent border-l-4 border-[#2ed573] rounded-lg">
          <Target size={24} className="text-[#2ed573] flex-shrink-0" />
          <p className="text-left text-gray-300">
            <strong className="text-white">Labor accountability</strong> - hold corporations to their promises
          </p>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="group px-8 py-4 bg-gradient-to-r from-[#00d2d3] to-[#ffa502] rounded-xl text-white font-bold text-lg hover:shadow-2xl hover:shadow-[#00d2d3]/50 transition-all transform hover:scale-105"
      >
        <span className="flex items-center gap-2">
          Let's Get Started
          <ChevronRight size={20} className="group-hover:translate-x-2 transition-transform" />
        </span>
      </button>
    </div>
  </div>
);

const HomeContent: React.FC<{ onNavigate: (section: 'getting-started' | 'features' | 'shortcuts' | 'faq') => void }> = ({ onNavigate }) => (
  <div className="space-y-8">
    {/* Hero Section */}
    <div className="text-center mb-12">
      <h2 className="text-3xl font-bold text-white mb-4">Welcome to the DCIM Command Center</h2>
      <p className="text-xl text-gray-300 max-w-3xl mx-auto">
        Track <span className="text-[#00d2d3] font-bold">11,992 data center facilities</span> and investigate the{' '}
        <span className="text-[#ff4757] font-bold">$2.48B+ subsidy gap</span>. This labor accountability tool helps you hold corporations accountable for job creation promises.
      </p>
    </div>

    {/* Quick Action Cards - Enhanced */}
    <div className="grid grid-cols-2 gap-6 mb-12">
      <button
        onClick={() => onNavigate('getting-started')}
        className="group relative p-8 bg-gradient-to-br from-[#00d2d3]/20 to-[#00d2d3]/5 border-2 border-[#00d2d3]/30 rounded-2xl hover:border-[#00d2d3] hover:shadow-2xl hover:shadow-[#00d2d3]/50 transition-all duration-300 text-left overflow-hidden animate-glow"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#00d2d3]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00d2d3]/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
        <div className="relative z-10">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[#00d2d3] to-[#00d2d3]/50 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-[#00d2d3]/50">
              <Zap size={40} className="text-white group-hover:animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="text-3xl font-bold text-white mb-2 group-hover:text-[#00d2d3] transition-colors">Quick Start Guide</h3>
              <p className="text-gray-300 text-lg">Get up and running in 4 simple steps</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[#00d2d3] font-bold text-lg">
            <span>Start here</span>
            <ChevronRight size={24} className="group-hover:translate-x-4 transition-all duration-300" />
          </div>
        </div>
      </button>

      <button
        onClick={() => onNavigate('features')}
        className="group relative p-8 bg-gradient-to-br from-[#ffa502]/20 to-[#ffa502]/5 border-2 border-[#ffa502]/30 rounded-2xl hover:border-[#ffa502] hover:shadow-2xl hover:shadow-[#ffa502]/50 transition-all duration-300 text-left overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#ffa502]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffa502]/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
        <div className="relative z-10">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[#ffa502] to-[#ff4757] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-[#ffa502]/50">
              <Sparkles size={40} className="text-white group-hover:animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="text-3xl font-bold text-white mb-2 group-hover:text-[#ffa502] transition-colors">Explore Features</h3>
              <p className="text-gray-300 text-lg">Discover powerful investigation tools</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[#ffa502] font-bold text-lg">
            <span>Learn more</span>
            <ChevronRight size={24} className="group-hover:translate-x-4 transition-all duration-300" />
          </div>
        </div>
      </button>

      <button
        onClick={() => onNavigate('shortcuts')}
        className="group relative p-8 bg-gradient-to-br from-[#2ed573]/20 to-[#2ed573]/5 border-2 border-[#2ed573]/30 rounded-2xl hover:border-[#2ed573] hover:shadow-2xl hover:shadow-[#2ed573]/50 transition-all duration-300 text-left overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#2ed573]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2ed573]/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
        <div className="relative z-10">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[#2ed573] to-[#00d2d3] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-[#2ed573]/50">
              <Keyboard size={40} className="text-white group-hover:animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="text-3xl font-bold text-white mb-2 group-hover:text-[#2ed573] transition-colors">Keyboard Shortcuts</h3>
              <p className="text-gray-300 text-lg">Work faster with hotkeys</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[#2ed573] font-bold text-lg">
            <span>View shortcuts</span>
            <ChevronRight size={24} className="group-hover:translate-x-4 transition-all duration-300" />
          </div>
        </div>
      </button>

      <button
        onClick={() => onNavigate('faq')}
        className="group relative p-8 bg-gradient-to-br from-white/10 to-white/5 border-2 border-white/20 rounded-2xl hover:border-white/60 hover:shadow-2xl hover:shadow-white/20 transition-all duration-300 text-left overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
        <div className="relative z-10">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/30 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-white/20">
              <MessageCircle size={40} className="text-white group-hover:animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="text-3xl font-bold text-white mb-2 group-hover:text-gray-200 transition-colors">FAQs & Answers</h3>
              <p className="text-gray-300 text-lg">Find answers to common questions</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <span>Browse FAQs</span>
            <ChevronRight size={24} className="group-hover:translate-x-4 transition-all duration-300" />
          </div>
        </div>
      </button>
    </div>

    {/* Key Stats - Enhanced with animations */}
    <div className="grid grid-cols-3 gap-6 p-8 bg-gradient-to-r from-[#00d2d3]/10 via-[#ffa502]/5 to-[#ff4757]/10 border-2 border-[#00d2d3]/20 rounded-2xl relative overflow-hidden mb-8">
      <div className="absolute inset-0 bg-gradient-to-r from-[#00d2d3]/5 to-[#ffa502]/5 animate-shimmer" />
      <div className="text-center relative z-10 group">
        <div className="text-5xl font-bold bg-gradient-to-r from-[#00d2d3] to-[#ffa502] bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
          11,992
        </div>
        <div className="text-sm text-gray-400 uppercase tracking-wider">Facilities Tracked</div>
      </div>
      <div className="text-center border-l border-r border-white/10 relative z-10 group">
        <div className="text-5xl font-bold bg-gradient-to-r from-[#ff4757] to-[#ffa502] bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
          $2.48B+
        </div>
        <div className="text-sm text-gray-400 uppercase tracking-wider">Subsidy Gap</div>
      </div>
      <div className="text-center relative z-10 group">
        <div className="text-5xl font-bold bg-gradient-to-r from-[#2ed573] to-[#00d2d3] bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
          10
        </div>
        <div className="text-sm text-gray-400 uppercase tracking-wider">Investigation Tools</div>
      </div>
    </div>

    {/* Quick Tips */}
    <div className="bg-gradient-to-r from-[#ffa502]/10 to-transparent border-l-4 border-[#ffa502] p-6 rounded-lg">
      <div className="flex items-start gap-4">
        <Info size={24} className="text-[#ffa502] flex-shrink-0 mt-1" />
        <div>
          <h4 className="text-lg font-bold text-white mb-2">💡 Pro Tips</h4>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ffa502]"></span>
              <span>Press <kbd className="px-2 py-0.5 bg-white/10 rounded text-xs font-mono">F</kbd> to toggle fullscreen in any view</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ffa502]"></span>
              <span>Use Investigation Templates in DEEP view - no AI required!</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ffa502]"></span>
              <span>Hover near screen edges to reveal Smart Panels</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

const GettingStartedContent: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="space-y-8">
    {/* Back Button */}
    <button
      onClick={onBack}
      className="flex items-center gap-2 text-[#00d2d3] hover:text-white transition-colors mb-4"
    >
      <ChevronRight size={20} className="rotate-180" />
      <span className="font-semibold">Back to Home</span>
    </button>

    {/* Title */}
    <div className="text-center mb-12">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00d2d3] to-[#ffa502] mb-4">
        <Zap size={40} className="text-white" />
      </div>
      <h2 className="text-4xl font-bold text-white mb-4">Quick Start Guide</h2>
      <p className="text-xl text-gray-300">Get started in 4 simple steps</p>
    </div>

    {/* Steps */}
    <div className="space-y-6">
      <div className="relative p-8 bg-gradient-to-r from-[#00d2d3]/20 to-transparent border-l-4 border-[#00d2d3] rounded-lg">
        <div className="absolute -left-6 top-8 w-12 h-12 rounded-full bg-[#00d2d3] flex items-center justify-center text-2xl font-bold text-black">
          1
        </div>
        <div className="ml-8">
          <h3 className="text-2xl font-bold text-white mb-3">Choose Your View</h3>
          <p className="text-gray-300 mb-4 text-lg">Click view mode buttons at the top to switch between different perspectives:</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-[#00d2d3]/10 border border-[#00d2d3]/30 rounded-lg">
              <div className="font-bold text-[#00d2d3] mb-1">OMNI</div>
              <div className="text-sm text-gray-400">Grid view with Natural Language Search</div>
            </div>
            <div className="p-4 bg-[#ffa502]/10 border border-[#ffa502]/30 rounded-lg">
              <div className="font-bold text-[#ffa502] mb-1">DEEP</div>
              <div className="text-sm text-gray-400">Detailed drill-down + Templates</div>
            </div>
            <div className="p-4 bg-[#ff4757]/10 border border-[#ff4757]/30 rounded-lg">
              <div className="font-bold text-[#ff4757] mb-1">HUD</div>
              <div className="text-sm text-gray-400">Radial display of critical targets</div>
            </div>
            <div className="p-4 bg-[#2ed573]/10 border border-[#2ed573]/30 rounded-lg">
              <div className="font-bold text-[#2ed573] mb-1">MAP</div>
              <div className="text-sm text-gray-400">Geographic view by state</div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative p-8 bg-gradient-to-r from-[#ffa502]/20 to-transparent border-l-4 border-[#ffa502] rounded-lg">
        <div className="absolute -left-6 top-8 w-12 h-12 rounded-full bg-[#ffa502] flex items-center justify-center text-2xl font-bold text-black">
          2
        </div>
        <div className="ml-8">
          <h3 className="text-2xl font-bold text-white mb-3">Search with Natural Language</h3>
          <p className="text-gray-300 mb-4 text-lg">In OMNI view, type questions naturally:</p>
          <div className="p-4 bg-black/30 border border-[#ffa502]/30 rounded-lg font-mono text-[#ffa502] text-lg">
            "Show me non-compliant facilities in Texas"
          </div>
        </div>
      </div>

      <div className="relative p-8 bg-gradient-to-r from-[#2ed573]/20 to-transparent border-l-4 border-[#2ed573] rounded-lg">
        <div className="absolute -left-6 top-8 w-12 h-12 rounded-full bg-[#2ed573] flex items-center justify-center text-2xl font-bold text-black">
          3
        </div>
        <div className="ml-8">
          <h3 className="text-2xl font-bold text-white mb-3">Use Investigation Templates</h3>
          <p className="text-gray-300 mb-4 text-lg">In DEEP view, expand any facility and scroll to "Quick Investigations":</p>
          <div className="flex flex-wrap gap-2">
            {['Regional Comparison', 'Operator Track Record', 'Largest Subsidy Gaps', '+7 more'].map(template => (
              <div key={template} className="px-4 py-2 bg-[#2ed573]/10 border border-[#2ed573]/30 rounded-full text-sm text-gray-300">
                {template}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative p-8 bg-gradient-to-r from-white/10 to-transparent border-l-4 border-white/40 rounded-lg">
        <div className="absolute -left-6 top-8 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold text-white border-2 border-white/40">
          4
        </div>
        <div className="ml-8">
          <h3 className="text-2xl font-bold text-white mb-3">Configure AI (Optional)</h3>
          <p className="text-gray-300 mb-4 text-lg">Click the AI button in top bar to add your OpenAI API key for enhanced features.</p>
          <div className="p-4 bg-[#00d2d3]/10 border border-[#00d2d3]/30 rounded-lg">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Note</div>
            <div className="text-sm text-gray-300">Dashboard works great without AI! Templates and keyword search are completely free.</div>
          </div>
        </div>
      </div>
    </div>

    {/* Compliance Legend */}
    <div className="p-6 bg-gradient-to-r from-[#ff4757]/10 to-transparent border-l-4 border-[#ff4757] rounded-lg">
      <h3 className="text-xl font-bold text-white mb-4">Understanding Compliance Status</h3>
      <div className="space-y-3">
        <div className="flex items-center gap-4 p-3 bg-[#2ed573]/10 border border-[#2ed573]/30 rounded-lg">
          <div className="w-6 h-6 rounded-full bg-[#2ed573]"></div>
          <div>
            <div className="font-bold text-white">Compliant</div>
            <div className="text-sm text-gray-400">Meeting job creation promises</div>
          </div>
        </div>
        <div className="flex items-center gap-4 p-3 bg-[#ffa502]/10 border border-[#ffa502]/30 rounded-lg">
          <div className="w-6 h-6 rounded-full bg-[#ffa502]"></div>
          <div>
            <div className="font-bold text-white">At Risk</div>
            <div className="text-sm text-gray-400">Falling behind on job targets</div>
          </div>
        </div>
        <div className="flex items-center gap-4 p-3 bg-[#ff4757]/10 border border-[#ff4757]/30 rounded-lg">
          <div className="w-6 h-6 rounded-full bg-[#ff4757]"></div>
          <div>
            <div className="font-bold text-white">Non-Compliant</div>
            <div className="text-sm text-gray-400">Significantly under job promises</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const FeaturesContent: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="space-y-8">
    {/* Back Button */}
    <button
      onClick={onBack}
      className="flex items-center gap-2 text-[#00d2d3] hover:text-white transition-colors mb-4"
    >
      <ChevronRight size={20} className="rotate-180" />
      <span className="font-semibold">Back to Home</span>
    </button>

    {/* Title */}
    <div className="text-center mb-12">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#ffa502] to-[#ff4757] mb-4">
        <Sparkles size={40} className="text-white" />
      </div>
      <h2 className="text-4xl font-bold text-white mb-4">Powerful Features</h2>
      <p className="text-xl text-gray-300">Explore investigation tools and capabilities</p>
    </div>

    {/* Features */}
    <div className="space-y-6">
      {/* Natural Language Search */}
      <div className="p-8 bg-gradient-to-br from-[#00d2d3]/20 to-transparent border-2 border-[#00d2d3]/30 rounded-2xl hover:border-[#00d2d3]/60 transition-all">
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 rounded-xl bg-[#00d2d3]/20 flex items-center justify-center flex-shrink-0">
            <Search size={32} className="text-[#00d2d3]" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white mb-2">Natural Language Search</h3>
            <div className="text-sm text-[#00d2d3] mb-4">Location: OMNI View</div>
            <p className="text-gray-300 mb-6 text-lg">
              Ask questions in plain English and get instant results. No complex queries needed!
            </p>
            <div className="space-y-2 text-gray-300">
              <div className="flex items-start gap-3">
                <ChevronRight size={18} className="text-[#00d2d3] flex-shrink-0 mt-1" />
                <span>Click in search box at top of OMNI view</span>
              </div>
              <div className="flex items-start gap-3">
                <ChevronRight size={18} className="text-[#00d2d3] flex-shrink-0 mt-1" />
                <span>Type your question naturally (e.g., "Show me facilities in California")</span>
              </div>
              <div className="flex items-start gap-3">
                <ChevronRight size={18} className="text-[#00d2d3] flex-shrink-0 mt-1" />
                <span>Press Enter and view results with stats and facility cards</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Investigation Templates */}
      <div className="p-8 bg-gradient-to-br from-[#ffa502]/20 to-transparent border-2 border-[#ffa502]/30 rounded-2xl hover:border-[#ffa502]/60 transition-all">
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 rounded-xl bg-[#ffa502]/20 flex items-center justify-center flex-shrink-0">
            <Target size={32} className="text-[#ffa502]" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white mb-2">Investigation Templates</h3>
            <div className="text-sm text-[#ffa502] mb-4">Location: DEEP View → Facility → Overview Tab</div>
            <p className="text-gray-300 mb-6 text-lg">
              10 pre-built queries for common investigations. Instant, free, no AI needed!
            </p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['Regional Comparison', 'Operator Track Record', 'Subsidy Analysis', 'Promise vs Reality', 'Timeline Analysis', 'Peer Review'].map(template => (
                <div key={template} className="px-3 py-2 bg-[#ffa502]/10 border border-[#ffa502]/20 rounded text-sm text-center text-gray-300">
                  {template}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Settings */}
      <div className="p-8 bg-gradient-to-br from-[#2ed573]/20 to-transparent border-2 border-[#2ed573]/30 rounded-2xl hover:border-[#2ed573]/60 transition-all">
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 rounded-xl bg-[#2ed573]/20 flex items-center justify-center flex-shrink-0">
            <Sparkles size={32} className="text-[#2ed573]" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white mb-2">AI Settings</h3>
            <div className="text-sm text-[#2ed573] mb-4">Location: AI Button (Top Bar)</div>
            <p className="text-gray-300 mb-6 text-lg">
              Configure OpenAI or Anthropic API for enhanced natural language search and summaries.
            </p>
            <div className="p-4 bg-[#ffa502]/10 border border-[#ffa502]/30 rounded-lg">
              <div className="text-xs text-[#ffa502] font-bold mb-1">Optional Feature</div>
              <div className="text-sm text-gray-300">Dashboard works great without AI! Use Investigation Templates for free, instant queries.</div>
            </div>
          </div>
        </div>
      </div>

      {/* More Features Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-6 bg-white/5 border border-white/20 rounded-xl hover:bg-white/10 transition-all">
          <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center mb-4">
            <Layers size={24} className="text-white" />
          </div>
          <h4 className="font-bold text-white mb-2">Deep Dive Mode</h4>
          <p className="text-sm text-gray-400">Explore racks, servers, employees, transactions with infinite drill-down</p>
        </div>
        <div className="p-6 bg-white/5 border border-white/20 rounded-xl hover:bg-white/10 transition-all">
          <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center mb-4">
            <BarChart3 size={24} className="text-white" />
          </div>
          <h4 className="font-bold text-white mb-2">HUD View</h4>
          <p className="text-sm text-gray-400">Radial 'heads-up display' of critical non-compliant facilities</p>
        </div>
        <div className="p-6 bg-white/5 border border-white/20 rounded-xl hover:bg-white/10 transition-all">
          <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center mb-4">
            <Map size={24} className="text-white" />
          </div>
          <h4 className="font-bold text-white mb-2">Geographic Map</h4>
          <p className="text-sm text-gray-400">Visual map by state with color-coded compliance rates</p>
        </div>
      </div>
    </div>
  </div>
);

const ShortcutsContent: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="space-y-8">
    {/* Back Button */}
    <button
      onClick={onBack}
      className="flex items-center gap-2 text-[#00d2d3] hover:text-white transition-colors mb-4"
    >
      <ChevronRight size={20} className="rotate-180" />
      <span className="font-semibold">Back to Home</span>
    </button>

    {/* Title */}
    <div className="text-center mb-12">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2ed573] to-[#00d2d3] mb-4">
        <Keyboard size={40} className="text-white" />
      </div>
      <h2 className="text-4xl font-bold text-white mb-4">Keyboard Shortcuts</h2>
      <p className="text-xl text-gray-300">Work faster with hotkeys</p>
    </div>

    {/* Shortcuts Grid */}
    <div className="grid grid-cols-2 gap-6">
      {/* Global */}
      <div className="p-6 bg-gradient-to-br from-[#00d2d3]/20 to-transparent border-2 border-[#00d2d3]/30 rounded-xl">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-[#00d2d3]/20 flex items-center justify-center">
            <Zap size={20} className="text-[#00d2d3]" />
          </div>
          Global
        </h3>
        <div className="space-y-4">
          {[
            { key: 'F', desc: 'Toggle fullscreen mode' },
            { key: 'Esc', desc: 'Exit fullscreen / Close modal' },
            { key: '?', desc: 'Open this help guide' }
          ].map(({ key, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-gray-300">{desc}</span>
              <kbd className="px-4 py-2 bg-[#00d2d3]/20 border-2 border-[#00d2d3]/50 rounded-lg text-base font-mono text-white font-bold">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="p-6 bg-gradient-to-br from-[#ffa502]/20 to-transparent border-2 border-[#ffa502]/30 rounded-xl">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-[#ffa502]/20 flex items-center justify-center">
            <Target size={20} className="text-[#ffa502]" />
          </div>
          Navigation
        </h3>
        <div className="space-y-4">
          {[
            { key: '1', desc: 'Switch to OMNI view' },
            { key: '2', desc: 'Switch to DEEP view' },
            { key: '3', desc: 'Switch to HUD view' },
            { key: '4', desc: 'Switch to MAP view' }
          ].map(({ key, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-gray-300">{desc}</span>
              <kbd className="px-4 py-2 bg-[#ffa502]/20 border-2 border-[#ffa502]/50 rounded-lg text-base font-mono text-white font-bold">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="p-6 bg-gradient-to-br from-[#2ed573]/20 to-transparent border-2 border-[#2ed573]/30 rounded-xl">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-[#2ed573]/20 flex items-center justify-center">
            <Search size={20} className="text-[#2ed573]" />
          </div>
          Search
        </h3>
        <div className="space-y-4">
          {[
            { key: 'Enter', desc: 'Execute search' },
            { key: 'Esc', desc: 'Close suggestions' }
          ].map(({ key, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-gray-300">{desc}</span>
              <kbd className="px-4 py-2 bg-[#2ed573]/20 border-2 border-[#2ed573]/50 rounded-lg text-base font-mono text-white font-bold">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </div>

      {/* Mouse */}
      <div className="p-6 bg-gradient-to-br from-white/10 to-transparent border-2 border-white/20 rounded-xl">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <Layers size={20} className="text-white" />
          </div>
          Mouse
        </h3>
        <div className="space-y-4">
          {[
            { action: 'Hover top', desc: 'Expand top bar' },
            { action: 'Hover left', desc: 'Show timeline' },
            { action: 'Hover right', desc: 'Show alerts' }
          ].map(({ action, desc }) => (
            <div key={action} className="flex items-center justify-between">
              <span className="text-gray-300">{desc}</span>
              <div className="px-4 py-2 bg-white/10 border-2 border-white/20 rounded-lg text-sm text-white">
                {action}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Pro Tip */}
    <div className="p-6 bg-gradient-to-r from-[#ffa502]/20 to-transparent border-l-4 border-[#ffa502] rounded-lg">
      <div className="flex items-center gap-4">
        <div className="text-4xl">💡</div>
        <div>
          <h4 className="text-lg font-bold text-white mb-1">Pro Tip</h4>
          <p className="text-gray-300">
            Press <kbd className="px-3 py-1.5 bg-[#00d2d3]/20 border border-[#00d2d3]/50 rounded font-mono text-white mx-1">F</kbd> in any view to maximize screen space!
          </p>
        </div>
      </div>
    </div>
  </div>
);

const FAQContent: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "What is this dashboard for?",
      a: "This is a labor accountability tool tracking 11,992 data center facilities and their compliance with job creation promises. It helps organizers investigate the $2.48B+ subsidy gap - public money given to corporations that didn't deliver promised jobs."
    },
    {
      q: "Do I need an API key to use this?",
      a: "No! The dashboard works great without any API key. Investigation Templates and keyword-based search are completely free. An OpenAI/Anthropic API key only unlocks AI-powered natural language search for higher accuracy (~95% vs ~70%)."
    },
    {
      q: "How do I search for facilities?",
      a: "Two ways: (1) Use Natural Language Search in OMNI view - just type naturally like 'Show me non-compliant facilities in Texas'. (2) Use Investigation Templates in DEEP view - 10 pre-built queries for common investigations."
    },
    {
      q: "How much does the API cost?",
      a: "If you add your own OpenAI API key, it costs ~$0.005 per query (half a cent). With caching, effective cost is ~$0.001 per query. Heavy users spend $1-5/month. You control your own key and can disable AI anytime."
    },
    {
      q: "Where is the data from?",
      a: "Data is compiled from government sources: EPA ECHO, SEC EDGAR, USASpending.gov, state subsidy databases, and facility operator disclosures. The methodology is 'edge-inclusive' - counting all infrastructure types (DCs, POPs, CDN, CORD)."
    },
    {
      q: "Is my API key secure?",
      a: "Your API key is stored only in your browser's localStorage (base64 encoded). It never leaves your device except to call OpenAI/Anthropic directly. No server stores your key. You can delete it anytime in AI Settings."
    }
  ];

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[#00d2d3] hover:text-white transition-colors mb-4"
      >
        <ChevronRight size={20} className="rotate-180" />
        <span className="font-semibold">Back to Home</span>
      </button>

      {/* Title */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 border-2 border-white/30 mb-4">
          <MessageCircle size={40} className="text-white" />
        </div>
        <h2 className="text-4xl font-bold text-white mb-4">Frequently Asked Questions</h2>
        <p className="text-xl text-gray-300">Find answers to common questions</p>
      </div>

      {/* FAQs */}
      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="border-2 border-white/10 rounded-xl overflow-hidden hover:border-[#00d2d3]/30 transition-all"
          >
            <button
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              className="w-full p-6 text-left flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
            >
              <span className="font-bold text-white text-lg pr-4">{faq.q}</span>
              <ChevronRight
                size={24}
                className={`text-[#00d2d3] flex-shrink-0 transition-transform duration-300 ${
                  expandedIndex === index ? 'rotate-90' : ''
                }`}
              />
            </button>
            {expandedIndex === index && (
              <div className="p-6 bg-black/30 border-t border-white/10">
                <p className="text-gray-300 text-base leading-relaxed">{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* More Help */}
      <div className="p-6 bg-gradient-to-r from-[#00d2d3]/10 to-transparent border-l-4 border-[#00d2d3] rounded-lg">
        <div className="flex items-start gap-4">
          <Info size={24} className="text-[#00d2d3] flex-shrink-0 mt-1" />
          <div>
            <h4 className="text-lg font-bold text-white mb-2">Need More Help?</h4>
            <p className="text-gray-300 mb-3">
              This dashboard is an open accountability project. For additional support or to contribute data corrections:
            </p>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00d2d3]"></span>
                <span>Contact via GitHub or coalition partners</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00d2d3]"></span>
                <span>Tech Workers Coalition, CODE-CWA, UPROSE</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
