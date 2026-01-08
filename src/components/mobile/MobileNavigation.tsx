import React, { useState, useCallback, useEffect } from 'react';
import {
  Home,
  Building2,
  Search,
  BarChart3,
  Menu,
  X,
  Shield,
  Users,
  FileText,
  Map,
  AlertTriangle,
  DollarSign,
  Eye,
  Zap,
  ChevronRight,
  Settings,
  HelpCircle,
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// Bottom Navigation Bar - Primary mobile navigation
export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  const navItems = [
    { id: 'Overview', icon: Home, label: 'Home' },
    { id: 'Facilities', icon: Building2, label: 'Facilities' },
    { id: 'Intelligence', icon: Search, label: 'Intel' },
    { id: 'Tools', icon: BarChart3, label: 'Tools' },
    { id: 'menu', icon: Menu, label: 'More' },
  ];

  return (
    <nav
      className="mobile-bottom-nav fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-neutral-200 z-50 hidden md:hidden"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        display: 'none',
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .mobile-bottom-nav { display: flex !important; }
        }
      `}</style>
      <div className="flex items-stretch justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                flex flex-col items-center justify-center flex-1 px-2 py-1
                transition-colors duration-200
                ${isActive 
                  ? 'text-primary-600' 
                  : 'text-neutral-500 active:text-neutral-700'
                }
              `}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon 
                className={`w-6 h-6 mb-1 transition-transform duration-200 ${
                  isActive ? 'scale-110' : ''
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

// Mobile Drawer - Full navigation menu
export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
}) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Swipe to close
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientY;
    const diff = touchEnd - touchStart;
    if (diff > 100) onClose(); // Swipe down to close
    setTouchStart(null);
  }, [touchStart, onClose]);

  const menuSections = [
    {
      title: 'Main',
      items: [
        { id: 'Overview', icon: Home, label: 'Dashboard Overview' },
        { id: 'Facilities', icon: Building2, label: 'All Facilities', badge: '11,992' },
        { id: 'Geography', icon: Map, label: 'Geographic View' },
      ],
    },
    {
      title: 'Intelligence',
      items: [
        { id: 'Intelligence', icon: Search, label: 'Organizing Intelligence' },
        { id: 'Surveillance Infrastructure', icon: Eye, label: 'Surveillance Tracker', badge: 'NEW' },
        { id: 'Sanctuary City', icon: Shield, label: 'Sanctuary City' },
        { id: 'Subsidy Tracking', icon: DollarSign, label: 'Subsidy Tracking' },
        { id: 'Early Warning', icon: AlertTriangle, label: 'Early Warning' },
      ],
    },
    {
      title: 'Tools',
      items: [
        { id: 'Follow Your Data', icon: Zap, label: 'Follow Your Data' },
        { id: 'Organizer Hub', icon: Users, label: 'Organizer Hub' },
        { id: 'Reports', icon: FileText, label: 'Reports' },
      ],
    },
  ];

  const handleNavigation = (tabId: string) => {
    onTabChange(tabId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[1000] max-h-[85vh] overflow-hidden animate-slide-up"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-neutral-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100">
          <h2 className="text-lg font-semibold text-neutral-800">Navigation</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu content */}
        <div className="overflow-y-auto max-h-[calc(85vh-120px)] overscroll-contain">
          {menuSections.map((section) => (
            <div key={section.title} className="px-4 py-3">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 px-2">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item.id)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-3 rounded-xl
                        transition-all duration-200 active:scale-[0.98]
                        ${isActive
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-neutral-700 active:bg-neutral-100'
                        }
                      `}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-neutral-500'}`} />
                      <span className={`flex-1 text-left text-[15px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className={`
                          text-xs font-semibold px-2 py-0.5 rounded-full
                          ${item.badge === 'NEW' 
                            ? 'bg-success-100 text-success-700' 
                            : 'bg-neutral-100 text-neutral-600'
                          }
                        `}>
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-neutral-400" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Footer actions */}
          <div className="px-4 py-4 border-t border-neutral-100 mt-2">
            <div className="flex gap-3">
              <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-neutral-100 text-neutral-700 font-medium active:bg-neutral-200">
                <Settings className="w-4 h-4" />
                <span className="text-sm">Settings</span>
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-neutral-100 text-neutral-700 font-medium active:bg-neutral-200">
                <HelpCircle className="w-4 h-4" />
                <span className="text-sm">Help</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Mobile Header with hamburger menu
interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
  onSearchClick?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  subtitle,
  onMenuClick,
  onSearchClick,
}) => {
  return (
    <header
      className="mobile-header sticky top-0 bg-white/95 backdrop-blur-lg border-b border-neutral-200 z-40 px-4 py-3 hidden"
      style={{ paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}
    >
      <style>{`
        @media (max-width: 768px) {
          .mobile-header { display: block !important; }
          .desktop-header { display: none !important; }
        }
      `}</style>
      <div className="flex items-center justify-between">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 text-neutral-600 hover:text-neutral-800 rounded-lg hover:bg-neutral-100"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex-1 text-center mx-4">
          <h1 className="text-base font-semibold text-neutral-800 truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-neutral-500 truncate">{subtitle}</p>
          )}
        </div>

        {onSearchClick && (
          <button
            onClick={onSearchClick}
            className="p-2 -mr-2 text-neutral-600 hover:text-neutral-800 rounded-lg hover:bg-neutral-100"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  );
};

// Hook for mobile detection
export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// Mobile-optimized scroll container with momentum
interface MobileScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  horizontal?: boolean;
}

export const MobileScrollContainer: React.FC<MobileScrollContainerProps> = ({
  children,
  className = '',
  horizontal = false,
}) => {
  return (
    <div
      className={`
        ${horizontal ? 'overflow-x-auto overflow-y-hidden' : 'overflow-y-auto overflow-x-hidden'}
        overscroll-contain touch-pan-${horizontal ? 'x' : 'y'}
        ${className}
      `}
      style={{
        WebkitOverflowScrolling: 'touch',
        scrollSnapType: horizontal ? 'x mandatory' : undefined,
      }}
    >
      {children}
    </div>
  );
};

// Floating Action Button
interface FABProps {
  icon: React.ReactNode;
  onClick: () => void;
  label: string;
  variant?: 'primary' | 'secondary';
}

export const FloatingActionButton: React.FC<FABProps> = ({
  icon,
  onClick,
  label,
  variant = 'primary',
}) => {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`
        fab fixed z-50 w-14 h-14 rounded-full flex items-center justify-center
        shadow-lg active:scale-95 transition-transform duration-200
        ${variant === 'primary'
          ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white'
          : 'bg-white text-neutral-700 border border-neutral-200'
        }
      `}
      style={{
        bottom: 'calc(80px + env(safe-area-inset-bottom, 16px))',
        right: '16px',
      }}
    >
      {icon}
    </button>
  );
};
