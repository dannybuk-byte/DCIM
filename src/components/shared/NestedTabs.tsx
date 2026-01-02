import { useState, ReactNode, startTransition, useMemo } from 'react';

interface NestedTab {
  id: string;
  label: string;
  content: ReactNode;
  badge?: string | number;
  icon?: ReactNode;
}

interface NestedTabsProps {
  tabs: NestedTab[];
  defaultTab?: string;
  level?: number;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function NestedTabs({
  tabs,
  defaultTab,
  level = 0,
  className = '',
  orientation = 'horizontal',
}: NestedTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  // Memoize active tab content to prevent re-renders (Pattern 6)
  const activeTabContent = useMemo(() => {
    return tabs.find((tab) => tab.id === activeTab)?.content;
  }, [tabs, activeTab]);

  if (tabs.length === 0) return null;

  const borderColor = level === 0 ? 'border-gray-700' : level === 1 ? 'border-gray-800' : 'border-gray-900';
  const bgColor = level === 0 ? 'bg-gray-800' : level === 1 ? 'bg-gray-850' : 'bg-gray-900';

  if (orientation === 'vertical') {
    return (
      <div className={`flex gap-4 ${className}`}>
        <div className={`w-48 border-r ${borderColor} ${bgColor} p-2`}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                startTransition(() => {
                  setActiveTab(tab.id);
                });
              }}
              className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-all duration-200 flex items-center justify-between text-base font-semibold min-h-[48px] ${
                activeTab === tab.id
                  ? 'bg-blue-900 text-blue-200 shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700 hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
                <span className="truncate">{tab.label}</span>
              </div>
              {tab.badge !== undefined && (
                <span className="ml-2 px-1.5 py-0.5 bg-blue-900/50 text-blue-200 rounded text-xs flex-shrink-0">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-[200px]">
          {activeTabContent || (
            <div className="text-sm text-gray-400 p-4">No content available</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className={`flex border-b ${borderColor} ${bgColor} overflow-x-auto scroll-smooth`} style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              startTransition(() => {
                setActiveTab(tab.id);
              });
            }}
            className={`px-6 py-4 text-base font-semibold transition-all duration-200 whitespace-nowrap border-b-3 flex items-center gap-3 min-h-[56px] ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400 bg-gray-900 shadow-lg shadow-blue-500/20'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-700 hover:bg-gray-800/50'
            }`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="px-1.5 py-0.5 bg-blue-900/50 text-blue-200 rounded text-xs">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="p-4 min-h-[200px]">
        {activeTabContent || (
          <div className="text-sm text-gray-400">No content available</div>
        )}
      </div>
    </div>
  );
}

