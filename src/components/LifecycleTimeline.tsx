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
  /** R-F6: employment is DESIGN placeholder — do not derive drop % from it */
  employmentIsDesign?: boolean;
  color: string;
}

interface TimelineEvent {
  date: Date;
  label: string;
  icon: React.ReactNode;
}

/** R-F6: synthetic steady-state placeholder — not OSINT, not facility-sourced. */
export const DESIGN_PLACEHOLDER_EMPLOYMENT = 23 as const;

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
          db.subsidyAgreements.where('facilityId').equals(facilityId).first(),
        ]);

        if (isMounted && !abortController.signal.aborted) {
          setFacility(facilityData || null);
          setAgreement(agreementData || null);

          if (agreementData) {
            const permitDate = new Date(agreementData.permitDate);
            const constructionStart = permitDate;
            const constructionEnd = new Date(permitDate);
            constructionEnd.setMonth(constructionEnd.getMonth() + 24);

            const commissioningStart = constructionEnd;
            const commissioningEnd = new Date(commissioningStart);
            commissioningEnd.setMonth(commissioningEnd.getMonth() + 6);

            const operationalDate = commissioningEnd;
            const now = new Date();

            const calculatedPhases: Phase[] = [
              {
                name: 'Construction',
                start: constructionStart,
                end: constructionEnd,
                employment: 1200,
                color: '#ff6b35',
              },
              {
                name: 'Commissioning',
                start: commissioningStart,
                end: commissioningEnd,
                employment: 150,
                color: '#ffa502',
              },
              {
                name: 'Operations',
                start: operationalDate,
                end: now,
                // R-F6 DESIGN quarantine — synthetic placeholder, not live headcount
                employment: DESIGN_PLACEHOLDER_EMPLOYMENT,
                employmentIsDesign: true,
                color: '#2ed573',
              },
            ];

            setPhases(calculatedPhases);

            const calculatedEvents: TimelineEvent[] = [
              {
                date: permitDate,
                label: 'Board Approval',
                icon: <Calendar className="w-4 h-4" />,
              },
              {
                date: constructionStart,
                label: 'Construction Start',
                icon: <Building className="w-4 h-4" />,
              },
              {
                date: new Date(constructionEnd.getTime() - 30 * 24 * 60 * 60 * 1000),
                label: 'First Power Draw',
                icon: <Zap className="w-4 h-4" />,
              },
              {
                date: operationalDate,
                label: 'Operational Declaration',
                icon: <CheckCircle className="w-4 h-4" />,
              },
              {
                date: new Date(operationalDate.getTime() + 365 * 24 * 60 * 60 * 1000),
                label: 'Steady-State Reached',
                icon: <TrendingDown className="w-4 h-4" />,
              },
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

    return () => {
      isMounted = false;
      abortController.abort();
    };
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

  const timelineStart = phases[0].start;
  const timelineEnd = phases[phases.length - 1].end;
  const totalDays = Math.ceil(
    (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24),
  );

  const peakEmployment = Math.max(...phases.map((p) => p.employment));
  const steadyPhase = phases[phases.length - 1];
  const steadyStateIsDesign = Boolean(steadyPhase.employmentIsDesign);
  const steadyStateEmployment = steadyPhase.employment;

  return (
    <ErrorBoundary>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <h3 className="text-lg font-semibold text-gray-200">Facility Lifecycle Timeline</h3>
          <Tooltip content="This shows how the facility changed over time - from construction (lots of jobs) to operations (fewer permanent jobs). This timeline helps explain why job promises often don't match reality.">
            <Info className="w-4 h-4 text-gray-400" />
          </Tooltip>
        </div>

        <div className="mb-8">
          <div className="flex justify-between mb-4 text-xs text-gray-400">
            {Array.from(
              { length: Math.ceil(timelineEnd.getFullYear() - timelineStart.getFullYear() + 1) },
              (_, i) => {
                const year = timelineStart.getFullYear() + i;
                return <span key={year}>{year}</span>;
              },
            )}
          </div>

          <div className="relative h-32 mb-4">
            {phases.map((phase, index) => {
              const phaseStart = phase.start.getTime();
              const phaseEnd = phase.end.getTime();
              const phaseDays = Math.ceil((phaseEnd - phaseStart) / (1000 * 60 * 60 * 24));
              const leftPercent =
                ((phaseStart - timelineStart.getTime()) /
                  (timelineEnd.getTime() - timelineStart.getTime())) *
                100;
              const widthPercent = (phaseDays / totalDays) * 100;

              return (
                <div
                  key={index}
                  className="absolute h-16 rounded flex items-center justify-center text-xs font-medium text-white"
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    backgroundColor: phase.color,
                    minWidth: '80px',
                  }}
                >
                  <div className="text-center">
                    <div>{phase.name}</div>
                    <div
                      className="text-xs opacity-90"
                      data-design-placeholder={phase.employmentIsDesign ? 'employment' : undefined}
                    >
                      {phase.employment} jobs
                    </div>
                    {phase.employmentIsDesign && (
                      <div
                        className="mt-0.5 px-1 py-0.5 rounded text-[10px] border bg-amber-900/40 text-amber-200 border-amber-700"
                        data-design-badge="employment"
                        title="LIVE/DESIGN honesty layer — synthetic placeholder, not observed OSINT"
                      >
                        DESIGN · synthetic / placeholder
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative">
            {events.map((event, index) => {
              const eventPercent =
                ((event.date.getTime() - timelineStart.getTime()) /
                  (timelineEnd.getTime() - timelineStart.getTime())) *
                100;

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
                    <div className="text-gray-500">
                      {event.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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
              <span className="text-gray-200 text-right">
                {steadyStateEmployment.toLocaleString()}
                {steadyStateIsDesign && (
                  <div
                    className="mt-1 px-2 py-0.5 rounded text-xs border bg-amber-900/30 text-amber-300 border-amber-700 inline-block"
                    data-design-badge="steady-state"
                  >
                    DESIGN · synthetic / placeholder
                  </div>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 flex items-center gap-1">
                Employment Drop
                <Tooltip content="Withheld when steady-state employment is a DESIGN placeholder. Not computed from unsourced figures.">
                  <Info className="w-3 h-3" />
                </Tooltip>
                :
              </span>
              {steadyStateIsDesign ? (
                <span
                  className="text-amber-200 text-right"
                  data-design-withheld="employment-drop"
                >
                  Not computed
                </span>
              ) : null}
            </div>
            {steadyStateIsDesign ? (
              <div
                className="mt-3 pt-3 border-t border-gray-700 text-xs text-amber-100"
                data-design-withheld="employment-drop-insight"
              >
                Not computed — steady-state employment is DESIGN placeholder, not live observed
                data. Employment-drop % is withheld until operations headcount has a dated source
                warrant.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
