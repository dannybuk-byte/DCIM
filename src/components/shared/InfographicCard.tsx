import { ReactNode } from 'react';

interface InfographicCardProps {
  title: string;
  icon?: ReactNode;
  visual?: ReactNode;
  steps: string[];
  tips?: string[];
  className?: string;
}

export function InfographicCard({ 
  title, 
  icon, 
  visual, 
  steps, 
  tips, 
  className = '' 
}: InfographicCardProps) {
  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 bg-gray-900 flex items-center gap-3">
        {icon && <div className="text-amber-400 flex-shrink-0">{icon}</div>}
        <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
      </div>
      
      {/* Visual Section */}
      {visual && (
        <div className="px-4 py-4 bg-gray-900 border-b border-gray-700">
          {visual}
        </div>
      )}
      
      {/* Steps */}
      <div className="px-4 py-4 space-y-3">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Steps</div>
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-600 text-white text-xs font-semibold flex items-center justify-center mt-0.5">
                {index + 1}
              </div>
              <div className="flex-1 text-xs text-gray-300">{step}</div>
            </div>
          ))}
        </div>
        
        {/* Tips */}
        {tips && tips.length > 0 && (
          <>
            <div className="pt-3 border-t border-gray-700 mt-3">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Tips</div>
              <ul className="space-y-1.5">
                {tips.map((tip, index) => (
                  <li key={index} className="flex gap-2 text-xs text-gray-400">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

