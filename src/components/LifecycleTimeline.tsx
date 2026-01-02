import { useState, useEffect } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Tooltip } from './shared/Tooltip';
import { db, SubsidyAgreement } from '../db/database';
import { Facility } from '../types';
import { Calendar, Building, Zap, CheckCircle, TrendingDown, Info } from 'lucide-react';

interface LifecycleTimelineProps {
  facilityId: number;
}

interface Phase {
  name: string;
  start: Date;
  end: Date;
  employment: number;
  color: string;
}

interface TimelineEvent {
  date: Date;
  label: string;
  icon: React.ReactNode;
}

export function LifecycleTimeline({ facilityId }: LifecycleTimelineProps) {
  const [facility, setFacility] = useState<Facility | null>(null);
  const [agreement, setAgreement] = useState<SubsidyAgreement | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    async function loadData() {
      try {
        setLoading(true);
        
        const [facilityData, agreementData] = await Promise.all([
          db.facilities.get(facilityId),
          db.subsidyAgreements.where('facilityId').equals(facilityId).first()
        ]);

        if (isMounted && !abortController.signal.aborted) {
          setFacility(facilityData || null);
        setAgreement(agreementData || null);

        if (agreementData) {
          // Calculate phases
          const permitDate = new Date(agreementData.permitDate);
          const constructionStart = permitDate;
          const constructionEnd = new Date(permitDate);
          constructionEnd.setMonth(constructionEnd.getMonth() + 24); // 2 years construction
          
          const commissioningStart = constructionEnd;
          const commissioningEnd = new Date(commissioningStart);
          commissioningEnd.setMonth(commissioningEnd.getMonth() + 6); // 6 months commissioning
          
          const operationalDate = commissioningEnd;
          const now = new Date();

          const calculatedPhases: Phase[] = [
            {
              name: 'Construction',
              start: constructionStart,
              end: constructionEnd,
              employment: 1200, // Peak construction employment
              color: '#ff6b35' // orange
            },
            {
              name: 'Commissioning',
              start: commissioningStart,
              end: commissioningEnd,
              employment: 150, // Commissioning team
              color: '#ffa502' // yellow
            },
            {
              name: 'Operations',
              start: operationalDate,
              end: now,
              employment: 23, // Steady-state employment
              color: '#2ed573' // green
            }
          ];

          setPhases(calculatedPhases);

          // Create events
          const calculatedEvents: TimelineEvent[] = [
            {
              date: permitDate,
              label: 'Board Approval',
              icon: <Calendar className="w-4 h-4" />
            },
            {
              date: constructionStart,
              label: 'Construction Start',
              icon: <Building className="w-4 h-4" />
            },
            {
              date: new Date(constructionEnd.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days before end
              label: 'First Power Draw',
              icon: <Zap className="w-4 h-4" />
            },
            {
              date: operationalDate,
              label: 'Operational Declaration',
              icon: <CheckCircle className="w-4 h-4" />
            },
            {
              date: new Date(operationalDate.getTime() + 365 * 24 * 60 * 60 * 1000), // 1 year after
              label: 'Steady-State Reached',
              icon: <TrendingDown className="w-4 h-4" />
            }
          ];

          setEvents(calculatedEvents);
        }
        }
      } catch (error) {
        console.error('Error loading lifecycle data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [facilityId]);

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="h-64 bg-gray-900 rounded animate-pulse" />
        </div>
      </ErrorBoundary>
    );
  }

  if (!facility || !agreement || phases.length === 0) {
    return (
      <ErrorBoundary>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="text-sm text-gray-400">Lifecycle timeline data unavailable</div>
        </div>
      </ErrorBoundary>
    );
  }

  // Calculate timeline span
  const timelineStart = phases[0].start;
  const timelineEnd = phases[phases.length - 1].end;
  const totalDays = Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate drop percentage
  const peakEmployment = Math.max(...phases.map(p => p.employment));
  const steadyStateEmployment = phases[phases.length - 1].employment;
  const dropPercentage = peakEmployment > 0
    ? ((peakEmployment - steadyStateEmployment) / peakEmployment) * 100
    : 0;

  return (
    <ErrorBoundary>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <h3 className="text-lg font-semibold text-gray-200">Facility Lifecycle Timeline</h3>
          <Tooltip content="This shows how the facility changed over time - from construction (lots of jobs) to operations (fewer permanent jobs). This timeline helps explain why job promises often don't match reality.">
            <Info className="w-4 h-4 text-gray-400" />
          </Tooltip>
        </div>

        {/* Timeline */}
        <div className="mb-8">
          {/* Year markers */}
          <div className="flex justify-between mb-4 text-xs text-gray-400">
            {Array.from({ length: Math.ceil((timelineEnd.getFullYear() - timelineStart.getFullYear()) + 1) }, (_, i) => {
              const year = timelineStart.getFullYear() + i;
              return <span key={year}>{year}</span>;
            })}
          </div>

          {/* Phase bars */}
          <div className="relative h-32 mb-4">
            {phases.map((phase, index) => {
              const phaseStart = phase.start.getTime();
              const phaseEnd = phase.end.getTime();
              const phaseDays = Math.ceil((phaseEnd - phaseStart) / (1000 * 60 * 60 * 24));
              const leftPercent = ((phaseStart - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100;
              const widthPercent = (phaseDays / totalDays) * 100;

              return (
                <div
                  key={index}
                  className="absolute h-16 rounded flex items-center justify-center text-xs font-medium text-white"
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    backgroundColor: phase.color,
                    minWidth: '80px'
                  }}
                >
                  <div className="text-center">
                    <div>{phase.name}</div>
                    <div className="text-xs opacity-90">{phase.employment} jobs</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Events */}
          <div className="relative">
            {events.map((event, index) => {
              const eventPercent = ((event.date.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100;
              
              return (
                <div
                  key={index}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${eventPercent}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="w-2 h-2 rounded-full bg-gray-400 mb-1" />
                  <div className="text-xs text-gray-400 text-center whitespace-nowrap">
                    {event.icon}
                    <div className="mt-1">{event.label}</div>
                    <div className="text-gray-500">{event.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Phase Transition Analysis */}
        <div className="mt-8 p-4 bg-gray-900 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <h4 className="text-sm font-medium text-gray-200">Phase Transition Analysis</h4>
            <Tooltip content="This compares employment during construction (when lots of people are needed to build) vs. operations (when the facility is running). The big drop shows why job promises often don't match reality.">
              <Info className="w-3 h-3 text-gray-400" />
            </Tooltip>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400 flex items-center gap-1">
                Peak Construction Employment
                <Tooltip content="The highest number of workers during the building phase. This is temporary - these jobs go away when construction ends.">
                  <Info className="w-3 h-3" />
                </Tooltip>
                :
              </span>
              <span className="text-gray-200">{peakEmployment.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 flex items-center gap-1">
                Steady-State Employment
                <Tooltip content="The number of permanent workers after construction is done. This is usually much lower than construction jobs.">
                  <Info className="w-3 h-3" />
                </Tooltip>
                :
              </span>
              <span className="text-gray-200">{steadyStateEmployment.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 flex items-center gap-1">
                Employment Drop
                <Tooltip content="How much employment decreased from peak construction to steady operations. A high percentage means most construction jobs disappeared.">
                  <Info className="w-3 h-3" />
                </Tooltip>
                :
              </span>
              <span className="text-red-400">{dropPercentage.toFixed(1)}%</span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-300">
              <strong>Insight:</strong> This pattern—high construction followed by minimal permanent staffing—explains why job promises often fail to materialize. 
              The employment drop from {peakEmployment.toLocaleString()} to {steadyStateEmployment.toLocaleString()} jobs ({dropPercentage.toFixed(1)}% reduction) 
              represents the transition from construction workforce to operational staffing.
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

