/**
 * InlineHelpButton - Compact help button for section headers
 * 
 * Opens a modal with section-specific FAQs, Guides, and How-Tos.
 * Can be placed inline in any section header or toolbar.
 */

import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { SectionContext } from '../../ai/sectionPrompts';
import { SectionHelpPanel } from './SectionHelpPanel';

interface InlineHelpButtonProps {
  context: SectionContext;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showLabel?: boolean;
}

export const InlineHelpButton: React.FC<InlineHelpButtonProps> = ({
  context,
  className = '',
  size = 'sm',
  label = 'Help',
  showLabel = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  return (
    <>
      {/* Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-1.5 p-1.5 rounded-lg 
                   text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50
                   transition-colors ${className}`}
        title={`Help: ${context.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`}
      >
        <HelpCircle size={iconSizes[size]} />
        {showLabel && (
          <span className="text-xs font-medium">{label}</span>
        )}
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[10002] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-lg max-h-[80vh] overflow-hidden rounded-xl shadow-2xl">
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-3 right-3 z-10 p-1.5 bg-slate-800 hover:bg-slate-700 
                         rounded-lg transition-colors"
            >
              <X size={16} className="text-slate-400" />
            </button>
            
            {/* Help Panel */}
            <SectionHelpPanel 
              context={context} 
              onClose={() => setIsOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Compact variant that just shows the icon
 */
export const HelpIcon: React.FC<{
  context: SectionContext;
  className?: string;
}> = ({ context, className = '' }) => (
  <InlineHelpButton context={context} size="sm" className={className} />
);

/**
 * Button variant with label
 */
export const HelpButton: React.FC<{
  context: SectionContext;
  className?: string;
}> = ({ context, className = '' }) => (
  <InlineHelpButton context={context} size="sm" showLabel className={className} />
);

export default InlineHelpButton;

