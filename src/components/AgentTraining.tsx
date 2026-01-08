/**
 * Agent Training Component
 * 
 * Fine-tune AI agent detection thresholds, sensitivity settings,
 * and review agent performance to improve accuracy over time.
 */

import React, { useState } from 'react';
import {
  Brain,
  Sliders,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Save,
  Zap,
  Shield,
  DollarSign,
  Network,
  BarChart3,
  Info,
} from 'lucide-react';

interface AgentConfig {
  id: string;
  name: string;
  type: 'anomaly' | 'compliance' | 'subsidy' | 'ownership' | 'network';
  icon: React.ReactNode;
  thresholds: {
    name: string;
    key: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit: string;
    description: string;
  }[];
  performance: {
    accuracy: number;
    falsePositives: number;
    falseNegatives: number;
    totalDetections: number;
  };
}

const defaultAgentConfigs: AgentConfig[] = [
  {
    id: 'anomaly',
    name: 'Anomaly Detector',
    type: 'anomaly',
    icon: <Zap className="w-5 h-5 text-yellow-500" />,
    thresholds: [
      {
        name: 'BGP Path Change Sensitivity',
        key: 'bgp_sensitivity',
        value: 75,
        min: 0,
        max: 100,
        step: 5,
        unit: '%',
        description: 'How sensitive to AS path changes. Higher = more alerts',
      },
      {
        name: 'CT Log Spike Threshold',
        key: 'ct_spike',
        value: 50,
        min: 10,
        max: 200,
        step: 10,
        unit: 'certs/hr',
        description: 'Certificate issuance rate that triggers alert',
      },
      {
        name: 'Power Anomaly Deviation',
        key: 'power_deviation',
        value: 15,
        min: 5,
        max: 50,
        step: 5,
        unit: '%',
        description: 'Percentage deviation from baseline to flag',
      },
    ],
    performance: {
      accuracy: 87.3,
      falsePositives: 12,
      falseNegatives: 3,
      totalDetections: 156,
    },
  },
  {
    id: 'compliance',
    name: 'Compliance Monitor',
    type: 'compliance',
    icon: <Shield className="w-5 h-5 text-blue-500" />,
    thresholds: [
      {
        name: 'Job Shortfall Alert',
        key: 'job_shortfall',
        value: 20,
        min: 5,
        max: 50,
        step: 5,
        unit: '%',
        description: 'Minimum jobs gap percentage to trigger alert',
      },
      {
        name: 'Deadline Warning Days',
        key: 'deadline_warning',
        value: 90,
        min: 30,
        max: 365,
        step: 30,
        unit: 'days',
        description: 'Days before deadline to start warnings',
      },
      {
        name: 'Clawback Minimum',
        key: 'clawback_min',
        value: 1000000,
        min: 100000,
        max: 10000000,
        step: 100000,
        unit: '$',
        description: 'Minimum clawback amount to flag for review',
      },
    ],
    performance: {
      accuracy: 94.1,
      falsePositives: 5,
      falseNegatives: 2,
      totalDetections: 89,
    },
  },
  {
    id: 'subsidy',
    name: 'Subsidy Analyst',
    type: 'subsidy',
    icon: <DollarSign className="w-5 h-5 text-green-500" />,
    thresholds: [
      {
        name: 'Cost Per Job Alert',
        key: 'cost_per_job',
        value: 150000,
        min: 50000,
        max: 500000,
        step: 10000,
        unit: '$/job',
        description: 'Cost per job threshold for flagging',
      },
      {
        name: 'Subsidy ROI Minimum',
        key: 'subsidy_roi',
        value: 2,
        min: 0.5,
        max: 10,
        step: 0.5,
        unit: 'x',
        description: 'Minimum expected ROI for subsidies',
      },
      {
        name: 'Agreement Confidence',
        key: 'agreement_confidence',
        value: 80,
        min: 50,
        max: 100,
        step: 5,
        unit: '%',
        description: 'Minimum confidence for agreement parsing',
      },
    ],
    performance: {
      accuracy: 91.7,
      falsePositives: 8,
      falseNegatives: 4,
      totalDetections: 67,
    },
  },
  {
    id: 'ownership',
    name: 'Ownership Tracker',
    type: 'ownership',
    icon: <Target className="w-5 h-5 text-orange-500" />,
    thresholds: [
      {
        name: 'Shell Company Score',
        key: 'shell_score',
        value: 70,
        min: 50,
        max: 95,
        step: 5,
        unit: '%',
        description: 'Confidence threshold for shell detection',
      },
      {
        name: 'Ownership Depth',
        key: 'ownership_depth',
        value: 5,
        min: 2,
        max: 10,
        step: 1,
        unit: 'levels',
        description: 'How deep to trace ownership chains',
      },
      {
        name: 'Officer Network Threshold',
        key: 'officer_network',
        value: 3,
        min: 2,
        max: 10,
        step: 1,
        unit: 'connections',
        description: 'Min shared officers to flag relationship',
      },
    ],
    performance: {
      accuracy: 82.5,
      falsePositives: 18,
      falseNegatives: 7,
      totalDetections: 43,
    },
  },
];

interface FeedbackItem {
  id: string;
  agentType: string;
  detection: string;
  userFeedback: 'correct' | 'false_positive' | 'false_negative';
  timestamp: number;
}

const recentFeedback: FeedbackItem[] = [
  { id: '1', agentType: 'anomaly', detection: 'BGP path change for AS16509', userFeedback: 'correct', timestamp: Date.now() - 3600000 },
  { id: '2', agentType: 'compliance', detection: 'Meta Prineville job shortfall', userFeedback: 'correct', timestamp: Date.now() - 7200000 },
  { id: '3', agentType: 'ownership', detection: 'Potential shell company: DataVault LLC', userFeedback: 'false_positive', timestamp: Date.now() - 10800000 },
  { id: '4', agentType: 'subsidy', detection: 'High cost per job at AWS Richmond', userFeedback: 'correct', timestamp: Date.now() - 14400000 },
  { id: '5', agentType: 'anomaly', detection: 'CT log spike for *.azure.com', userFeedback: 'false_positive', timestamp: Date.now() - 18000000 },
];

export const AgentTraining: React.FC = () => {
  const [agentConfigs, setAgentConfigs] = useState<AgentConfig[]>(defaultAgentConfigs);
  const [selectedAgent, setSelectedAgent] = useState<string>('anomaly');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const selectedConfig = agentConfigs.find(a => a.id === selectedAgent);

  const handleThresholdChange = (key: string, value: number) => {
    setAgentConfigs(prev => prev.map(agent => {
      if (agent.id !== selectedAgent) return agent;
      return {
        ...agent,
        thresholds: agent.thresholds.map(t => 
          t.key === key ? { ...t, value } : t
        ),
      };
    }));
    setHasChanges(true);
    setSaveMessage(null);
  };

  const handleReset = () => {
    const original = defaultAgentConfigs.find(a => a.id === selectedAgent);
    if (original) {
      setAgentConfigs(prev => prev.map(a => 
        a.id === selectedAgent ? { ...original } : a
      ));
      setHasChanges(false);
      setSaveMessage(null);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setHasChanges(false);
    setSaveMessage('Configuration saved successfully!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === '$') return `$${(value / 1000000).toFixed(1)}M`;
    if (unit === '$/job') return `$${(value / 1000).toFixed(0)}K`;
    return `${value}${unit}`;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Brain className="w-7 h-7 text-violet-600" />
            Agent Training & Tuning
          </h1>
          <p className="text-gray-600 mt-1">
            Fine-tune detection thresholds and review agent performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span className="text-green-600 text-sm flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              {saveMessage}
            </span>
          )}
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Agent Selection Sidebar */}
        <div className="col-span-3">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              Select Agent
            </h3>
            <div className="space-y-2">
              {agentConfigs.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`w-full p-3 rounded-lg text-left transition-colors flex items-center gap-3 ${
                    selectedAgent === agent.id
                      ? 'bg-violet-50 border-2 border-violet-500'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  {agent.icon}
                  <div>
                    <div className="font-medium text-gray-900">{agent.name}</div>
                    <div className="text-xs text-gray-500">
                      {agent.performance.accuracy.toFixed(1)}% accuracy
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Performance Overview */}
          {selectedConfig && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 mt-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Performance
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Accuracy</span>
                  <span className="font-semibold text-green-600">
                    {selectedConfig.performance.accuracy.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${selectedConfig.performance.accuracy}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-red-50 p-2 rounded-lg text-center">
                    <div className="text-lg font-bold text-red-600">
                      {selectedConfig.performance.falsePositives}
                    </div>
                    <div className="text-xs text-red-600">False Positives</div>
                  </div>
                  <div className="bg-orange-50 p-2 rounded-lg text-center">
                    <div className="text-lg font-bold text-orange-600">
                      {selectedConfig.performance.falseNegatives}
                    </div>
                    <div className="text-xs text-orange-600">False Negatives</div>
                  </div>
                </div>
                <div className="text-center text-sm text-gray-500 mt-2">
                  {selectedConfig.performance.totalDetections} total detections
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Threshold Sliders */}
        <div className="col-span-5">
          {selectedConfig && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
                {selectedConfig.icon}
                {selectedConfig.name} Thresholds
              </h3>
              <div className="space-y-6">
                {selectedConfig.thresholds.map((threshold) => (
                  <div key={threshold.key}>
                    <div className="flex justify-between items-center mb-2">
                      <label className="font-medium text-gray-900">
                        {threshold.name}
                      </label>
                      <span className="text-lg font-bold text-violet-600">
                        {formatValue(threshold.value, threshold.unit)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={threshold.min}
                      max={threshold.max}
                      step={threshold.step}
                      value={threshold.value}
                      onChange={(e) => handleThresholdChange(threshold.key, Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{formatValue(threshold.min, threshold.unit)}</span>
                      <span>{formatValue(threshold.max, threshold.unit)}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2 flex items-start gap-1">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {threshold.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Feedback */}
        <div className="col-span-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Recent Feedback
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Your feedback helps improve agent accuracy. Review past detections and mark them as correct or incorrect.
            </p>
            <div className="space-y-3">
              {recentFeedback.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border ${
                    item.userFeedback === 'correct'
                      ? 'bg-green-50 border-green-200'
                      : item.userFeedback === 'false_positive'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-orange-50 border-orange-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className="text-xs font-medium text-gray-500 uppercase">
                        {item.agentType}
                      </span>
                      <p className="text-sm text-gray-900 mt-0.5">{item.detection}</p>
                    </div>
                    <div className="ml-2">
                      {item.userFeedback === 'correct' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : item.userFeedback === 'false_positive' ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {Math.round((Date.now() - item.timestamp) / 3600000)}h ago
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 bg-violet-50 rounded-lg border border-violet-200">
              <h4 className="font-medium text-violet-900 mb-2">Training Tips</h4>
              <ul className="text-sm text-violet-700 space-y-1">
                <li>• Mark detections to improve accuracy</li>
                <li>• Lower thresholds = more sensitive</li>
                <li>• Balance between precision & recall</li>
                <li>• Review weekly for best results</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentTraining;
