/**
 * Task Submitter Component
 * 
 * Allows users to manually dispatch tasks to AI agents.
 * Supports different task types for each agent specialization.
 */

import React, { useState } from 'react';
import {
  Send,
  Zap,
  Shield,
  DollarSign,
  Network,
  Target,
  AlertCircle,
  CheckCircle,
  Loader,
  ChevronDown,
} from 'lucide-react';

interface TaskTemplate {
  id: string;
  agentType: 'anomaly' | 'compliance' | 'subsidy' | 'network' | 'ownership';
  name: string;
  description: string;
  icon: React.ReactNode;
  parameters: {
    name: string;
    type: 'text' | 'select' | 'number';
    placeholder?: string;
    options?: string[];
    required: boolean;
  }[];
}

const taskTemplates: TaskTemplate[] = [
  {
    id: 'monitor-bgp',
    agentType: 'anomaly',
    name: 'Monitor BGP Routes',
    description: 'Scan for BGP anomalies indicating infrastructure changes',
    icon: <Zap className="w-4 h-4 text-yellow-500" />,
    parameters: [
      { name: 'asn', type: 'text', placeholder: 'e.g., AS16509 (Amazon)', required: true },
      { name: 'duration', type: 'select', options: ['1h', '6h', '24h', '7d'], required: false },
    ],
  },
  {
    id: 'check-ct-logs',
    agentType: 'anomaly',
    name: 'Certificate Transparency Scan',
    description: 'Monitor CT logs for new certificate issuances',
    icon: <Zap className="w-4 h-4 text-yellow-500" />,
    parameters: [
      { name: 'domain', type: 'text', placeholder: 'e.g., *.amazonaws.com', required: true },
    ],
  },
  {
    id: 'audit-compliance',
    agentType: 'compliance',
    name: 'Audit Job Creation',
    description: 'Compare promised vs actual job counts for a facility',
    icon: <Shield className="w-4 h-4 text-blue-500" />,
    parameters: [
      { name: 'facilityName', type: 'text', placeholder: 'e.g., Meta Prineville', required: true },
      { name: 'state', type: 'text', placeholder: 'e.g., Oregon', required: true },
    ],
  },
  {
    id: 'calculate-clawback',
    agentType: 'subsidy',
    name: 'Calculate Clawback',
    description: 'Compute potential clawback amounts for non-compliant facilities',
    icon: <DollarSign className="w-4 h-4 text-green-500" />,
    parameters: [
      { name: 'facilityId', type: 'number', placeholder: 'Facility ID', required: true },
      { name: 'threshold', type: 'select', options: ['50%', '75%', '90%'], required: false },
    ],
  },
  {
    id: 'analyze-subsidy',
    agentType: 'subsidy',
    name: 'Analyze Subsidy Agreement',
    description: 'Parse and analyze a subsidy agreement document',
    icon: <DollarSign className="w-4 h-4 text-green-500" />,
    parameters: [
      { name: 'source', type: 'text', placeholder: 'URL or document reference', required: true },
    ],
  },
  {
    id: 'trace-ownership',
    agentType: 'ownership',
    name: 'Trace Corporate Structure',
    description: 'Map ownership chain from facility to parent company',
    icon: <Target className="w-4 h-4 text-orange-500" />,
    parameters: [
      { name: 'companyName', type: 'text', placeholder: 'e.g., Amazon Web Services', required: true },
      { name: 'depth', type: 'select', options: ['2 levels', '5 levels', '10 levels'], required: false },
    ],
  },
  {
    id: 'detect-shells',
    agentType: 'ownership',
    name: 'Detect Shell Companies',
    description: 'Scan for potential shell company patterns',
    icon: <Target className="w-4 h-4 text-orange-500" />,
    parameters: [
      { name: 'jurisdiction', type: 'text', placeholder: 'e.g., Delaware', required: true },
    ],
  },
  {
    id: 'map-network',
    agentType: 'network',
    name: 'Map Network Topology',
    description: 'Discover interconnections between data center operators',
    icon: <Network className="w-4 h-4 text-purple-500" />,
    parameters: [
      { name: 'region', type: 'text', placeholder: 'e.g., Northern Virginia', required: true },
    ],
  },
];

const agentColors: Record<string, string> = {
  anomaly: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  compliance: 'bg-blue-50 border-blue-200 text-blue-700',
  subsidy: 'bg-green-50 border-green-200 text-green-700',
  network: 'bg-purple-50 border-purple-200 text-purple-700',
  ownership: 'bg-orange-50 border-orange-200 text-orange-700',
};

export const TaskSubmitter: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<'success' | 'error' | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleTemplateSelect = (template: TaskTemplate) => {
    setSelectedTemplate(template);
    setParameters({});
    setSubmitResult(null);
    setIsExpanded(true);
  };

  const handleParameterChange = (name: string, value: string) => {
    setParameters(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) return;

    setIsSubmitting(true);
    setSubmitResult(null);

    // Simulate task submission
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 90% success rate for demo
    const success = Math.random() > 0.1;
    setSubmitResult(success ? 'success' : 'error');
    setIsSubmitting(false);

    if (success) {
      // Clear form after success
      setTimeout(() => {
        setSelectedTemplate(null);
        setParameters({});
        setSubmitResult(null);
        setIsExpanded(false);
      }, 2000);
    }
  };

  const canSubmit = selectedTemplate && 
    selectedTemplate.parameters.filter(p => p.required).every(p => parameters[p.name]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Send className="w-5 h-5 text-violet-600" />
          Dispatch Agent Task
        </h3>
        <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4">
          {/* Task Templates Grid */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Task Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {taskTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className={`p-2 rounded-lg border text-left transition-colors ${
                    selectedTemplate?.id === template.id
                      ? `${agentColors[template.agentType]} ring-2 ring-offset-1`
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {template.icon}
                    <span className="text-xs font-medium truncate">{template.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Template Details */}
          {selectedTemplate && (
            <div className={`p-3 rounded-lg border ${agentColors[selectedTemplate.agentType]} mb-4`}>
              <div className="flex items-center gap-2 mb-1">
                {selectedTemplate.icon}
                <span className="font-medium">{selectedTemplate.name}</span>
              </div>
              <p className="text-xs opacity-80">{selectedTemplate.description}</p>
            </div>
          )}

          {/* Parameters Form */}
          {selectedTemplate && (
            <div className="space-y-3 mb-4">
              {selectedTemplate.parameters.map((param) => (
                <div key={param.name}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {param.name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    {param.required && <span className="text-red-500">*</span>}
                  </label>
                  {param.type === 'select' ? (
                    <select
                      value={parameters[param.name] || ''}
                      onChange={(e) => handleParameterChange(param.name, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    >
                      <option value="">Select...</option>
                      {param.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={param.type === 'number' ? 'number' : 'text'}
                      value={parameters[param.name] || ''}
                      onChange={(e) => handleParameterChange(param.name, e.target.value)}
                      placeholder={param.placeholder}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Submit Button */}
          {selectedTemplate && (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className={`w-full py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                canSubmit && !isSubmitting
                  ? 'bg-violet-600 text-white hover:bg-violet-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Dispatching...
                </>
              ) : submitResult === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Task Dispatched!
                </>
              ) : submitResult === 'error' ? (
                <>
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Failed - Retry
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Dispatch Task
                </>
              )}
            </button>
          )}

          {/* Help Text */}
          {!selectedTemplate && (
            <p className="text-xs text-gray-500 text-center">
              Select a task type above to dispatch a new task to an AI agent
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskSubmitter;
