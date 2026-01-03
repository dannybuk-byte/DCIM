/**
 * Individual Employee Detail Modal
 * 
 * Deep dive into a single employee's complete record including:
 * - Employment history
 * - Training and certifications
 * - Performance metrics over time
 * - Compensation details
 * - Compliance status
 */

import React from 'react';
import { 
  X, 
  User, 
  Calendar, 
  DollarSign, 
  Award, 
  MapPin, 
  Clock, 
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Briefcase
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  title: string;
  startDate: string;
  shift: string;
  local: boolean;
  certifications: number;
  salary: number;
  score: number;
  department?: string;
  manager?: string;
  location?: string;
  status?: 'Active' | 'On Leave' | 'Terminated';
}

interface EmployeeDetailModalProps {
  employee: Employee;
  onClose: () => void;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({ employee, onClose }) => {
  // Calculate tenure
  const startDate = new Date(employee.startDate);
  const tenure = Math.floor((Date.now() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const tenureMonths = Math.floor(((Date.now() - startDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000)) % 12);

  return (
    <div 
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[300] p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border-2 border-cyan-400 rounded-lg p-6 max-w-4xl w-full shadow-[0_0_50px_rgba(0,210,211,0.5)] my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-cyan-400/20 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{employee.id}</h2>
                <p className="text-sm text-gray-400">{employee.title}</p>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-800/50 border border-cyan-400/20 rounded p-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-gray-400">Tenure</span>
            </div>
            <p className="text-lg font-bold text-white">
              {tenure}y {tenureMonths}m
            </p>
          </div>

          <div className="bg-slate-800/50 border border-green-400/20 rounded p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-400">Salary</span>
            </div>
            <p className="text-lg font-bold text-white">
              ${(employee.salary / 1000).toFixed(0)}K
            </p>
          </div>

          <div className="bg-slate-800/50 border border-purple-400/20 rounded p-3">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-gray-400">Certs</span>
            </div>
            <p className="text-lg font-bold text-white">
              {employee.certifications}
            </p>
          </div>

          <div className="bg-slate-800/50 border border-blue-400/20 rounded p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">Score</span>
            </div>
            <p className="text-lg font-bold text-white">
              {employee.score}/100
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Employment Details */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Employment Details</h3>
            </div>
            
            <div className="space-y-3">
              <DetailRow 
                label="Employee ID" 
                value={employee.id} 
              />
              <DetailRow 
                label="Position" 
                value={employee.title} 
              />
              <DetailRow 
                label="Start Date" 
                value={new Date(employee.startDate).toLocaleDateString()} 
              />
              <DetailRow 
                label="Shift Schedule" 
                value={employee.shift} 
              />
              <DetailRow 
                label="Status" 
                value={employee.status || 'Active'}
                valueColor="text-green-400"
              />
            </div>
          </div>

          {/* Location & Local Hiring */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Location & Residency</h3>
            </div>
            
            <div className="space-y-3">
              <DetailRow 
                label="Work Location" 
                value={employee.location || "On-site"} 
              />
              <DetailRow 
                label="Local Resident" 
                value={employee.local ? "Yes" : "No"}
                valueColor={employee.local ? "text-green-400" : "text-red-400"}
              />
              {employee.local && (
                <div className="p-2 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-300">
                  ✅ Contributes to local job creation promises
                </div>
              )}
              {!employee.local && (
                <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-300">
                  ⚠️ Out-of-area hire - may not count toward local job commitments
                </div>
              )}
            </div>
          </div>

          {/* Compensation */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-green-400" />
              <h3 className="text-sm font-bold text-white">Compensation</h3>
            </div>
            
            <div className="space-y-3">
              <DetailRow 
                label="Annual Salary" 
                value={`$${employee.salary.toLocaleString()}`}
                valueColor="text-green-400"
              />
              <DetailRow 
                label="Hourly Rate (Est.)" 
                value={`$${Math.round(employee.salary / 2080)}/hr`}
              />
              <DetailRow 
                label="Monthly Gross" 
                value={`$${Math.round(employee.salary / 12).toLocaleString()}`}
              />
              
              {/* Salary Context */}
              <div className="pt-2 border-t border-slate-700">
                <p className="text-xs text-gray-400 mb-1">Salary Context:</p>
                {employee.salary >= 100000 && (
                  <p className="text-xs text-green-400">✅ Above $100K - High-quality job</p>
                )}
                {employee.salary >= 70000 && employee.salary < 100000 && (
                  <p className="text-xs text-blue-400">✅ $70K-$100K - Good middle-class job</p>
                )}
                {employee.salary < 70000 && (
                  <p className="text-xs text-yellow-400">⚠️ Below $70K - May not meet "good jobs" criteria</p>
                )}
              </div>
            </div>
          </div>

          {/* Performance & Training */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Performance & Training</h3>
            </div>
            
            <div className="space-y-3">
              <DetailRow 
                label="Performance Score" 
                value={`${employee.score}/100`}
                valueColor={
                  employee.score >= 90 ? "text-green-400" :
                  employee.score >= 70 ? "text-blue-400" :
                  "text-yellow-400"
                }
              />
              <DetailRow 
                label="Certifications Earned" 
                value={employee.certifications.toString()}
              />
              
              {/* Performance Bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Performance Level</span>
                  <span className="text-xs text-gray-300">{employee.score}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      employee.score >= 90 ? 'bg-green-400' :
                      employee.score >= 70 ? 'bg-blue-400' :
                      'bg-yellow-400'
                    }`}
                    style={{ width: `${employee.score}%` }}
                  />
                </div>
              </div>

              {/* Certification Details */}
              {employee.certifications > 0 && (
                <div className="pt-2 border-t border-slate-700">
                  <p className="text-xs text-gray-400 mb-2">Estimated Certifications:</p>
                  <div className="space-y-1">
                    {employee.certifications >= 1 && (
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <CheckCircle size={12} className="text-green-400" />
                        <span>Safety & Security</span>
                      </div>
                    )}
                    {employee.certifications >= 2 && (
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <CheckCircle size={12} className="text-green-400" />
                        <span>Technical Operations</span>
                      </div>
                    )}
                    {employee.certifications >= 3 && (
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <CheckCircle size={12} className="text-green-400" />
                        <span>Emergency Response</span>
                      </div>
                    )}
                    {employee.certifications >= 4 && (
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <CheckCircle size={12} className="text-green-400" />
                        <span>Advanced Specialist</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Organizer Notes */}
        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white mb-1">Organizer Notes:</p>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>• Use this data to verify local hiring commitments</li>
                <li>• Track if salaries meet "good jobs" standards ($70K+)</li>
                <li>• Monitor certification levels for workforce quality</li>
                <li>• Compare tenure across facilities for turnover analysis</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-cyan-400 text-black font-bold rounded hover:bg-cyan-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper component
interface DetailRowProps {
  label: string;
  value: string;
  valueColor?: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, valueColor = 'text-gray-300' }) => {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}:</span>
      <span className={`text-xs font-medium ${valueColor} text-right`}>
        {value}
      </span>
    </div>
  );
};

export default EmployeeDetailModal;

