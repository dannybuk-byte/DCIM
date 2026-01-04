import { ReactNode } from 'react';
import { CheckCircle, Circle } from 'lucide-react';

interface Step {
  number: number;
  title: string;
  description: string;
  icon?: ReactNode;
  completed?: boolean;
}

interface StepGuideProps {
  title: string;
  steps: Step[];
  className?: string;
}

export function StepGuide({ title, steps, className = '' }: StepGuideProps) {
  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-200 mb-4">{title}</h3>
      <div className="space-y-4">
        {steps.map((step) => (
          <div key={step.number} className="flex gap-3">
            {/* Step Number/Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {step.completed ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : step.icon ? (
                <div className="w-5 h-5 text-amber-400 flex items-center justify-center">{step.icon}</div>
              ) : (
                <div className="w-5 h-5 flex items-center justify-center relative">
                  <Circle className="w-5 h-5 text-gray-500" />
                  <span className="absolute text-xs font-semibold text-gray-400 leading-none">{step.number}</span>
                </div>
              )}
            </div>
            
            {/* Step Content */}
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${step.completed ? 'text-green-300' : 'text-gray-200'}`}>
                {step.title}
              </div>
              <div className="text-xs text-gray-400 mt-1">{step.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

