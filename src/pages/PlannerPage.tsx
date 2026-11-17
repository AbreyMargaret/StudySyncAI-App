import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coffee,
  Flame,
  HelpCircle,
  LifeBuoy,
  Sliders,
  XCircle,
} from 'lucide-react';
import { useStudySync } from '../hooks/useStudySync';
import {
  EnergyLevel,
  RescueSummaryItem,
  StudyIntensity,
  StudyPlan,
} from '../types/studysync';
import {
  applyStudyRescueMode,
  generateAdaptiveStudyPlan,
  simulateStudyScenario,
} from '../utils/schedulerEngine';

export function PlannerPage() {
  const {
    state,
    plannerFocusMode,
    setPlannerFocusMode,
    crammingModePreferred,
    setCrammingModePreferred,
    latestWellness,
    setActiveStudyPlan,
    refreshStudyPlanFromPerformance,
    updateStudyTaskStatus,
    buildBaseSchedulerInput,
    setActiveSection,
  } = useStudySync();

  const soonestExam = useMemo(() => {
    return (
      [...state.subjects].sort((a, b) =>
        a.examDate.localeCompare(b.examDate)
      )[0]?.examDate ?? new Date().toISOString().split('T')[0]
    );
  }, [state.subjects]);

  // Generator controls
  const [availableMinutes, setAvailableMinutes] = useState<number>(
    () => latestWellness?.availableMinutesToday ?? 120
  );
  const [targetExamDate, setTargetExamDate] = useState<string>(soonestExam);
  const [expandedExplainId, setExpandedExplainId] = useState<string | null>(
    null
  );
  const [syncNotice, setSyncNotice] = useState<string>('');

  // Rescue Mode controls
  const [rescueRemainingMinutes, setRescueRemainingMinutes] =
    useState<number>(60);
  const [rescuePreview, setRescuePreview] = useState<{
    rescuedPlan: StudyPlan;
    summary: RescueSummaryItem[];
  } | null>(null);

  // Scenario Simulator controls
  const [simMinutes, setSimMinutes] = useState<number>(90);
  const [simExamDate, setSimExamDate] = useState<string>(soonestExam);
  const [simEnergy, setSimEnergy] = useState<EnergyLevel>(
    latestWellness?.energyLevel ?? 'low'
  );
  const [simIntensity, setSimIntensity] = useState<StudyIntensity>(
    latestWellness?.preferredIntensity ?? 'light'
  );
  const [simCramming, setSimCramming] = useState<boolean>(false);
  const [simAppliedMessage, setSimAppliedMessage] = useState<string>('');

  const activePlan = state.activeStudyPlan;

  const handleGeneratePlan = (overrideCramming?: boolean) => {
    const useCramming =
      typeof overrideCramming === 'boolean'
        ? overrideCramming
        : crammingModePreferred;

    const input = buildBaseSchedulerInput({
      availableMinutes,
      targetExamDate,
      crammingMode: useCramming,
    });
    const nextPlan = generateAdaptiveStudyPlan(input);
    setActiveStudyPlan(nextPlan);
    setRescuePreview(null);
    setSyncNotice('Schedule rebuilt using current topic performance and settings.');
  };

  const handleSyncLatestResults = () => {
    const updated = refreshStudyPlanFromPerformance();
    if (updated) {
      setRescuePreview(null);
      setSyncNotice(
        'Study plan updated from your latest quiz accuracy, confidence gaps, and wellness check-in.'
      );
    }
  };

  const handleToggleCramming = () => {
    const next = !crammingModePreferred;
    setCrammingModePreferred(next);
    handleGeneratePlan(next);
  };

  const handleRunRescue = () => {
    if (!activePlan) return;
    const result = applyStudyRescueMode({
      currentPlan: activePlan,
      updatedRemainingMinutes: rescueRemainingMinutes,
      wellness: latestWellness,
    });
    setRescuePreview(result);
  };

  const handleApplyRescuePlan = () => {
    if (!rescuePreview) return;
    setActiveStudyPlan(rescuePreview.rescuedPlan);
    setRescuePreview(null);
    setPlannerFocusMode('schedule');
  };

  const simulationComparison = useMemo(() => {
    const baseInput = buildBaseSchedulerInput({
      availableMinutes,
      targetExamDate,
      crammingMode: crammingModePreferred,
    });

    return simulateStudyScenario(baseInput, {
      name: 'What-If Scenario',
      availableMinutes: simMinutes,
      examDate: simExamDate,
      energyLevel: simEnergy,
      intensity: simIntensity,
      crammingMode: simCramming,
    });
  }, [
    buildBaseSchedulerInput,
    availableMinutes,
    targetExamDate,
    crammingModePreferred,
    simMinutes,
    simExamDate,
    simEnergy,
    simIntensity,
    simCramming,
  ]);

  const handleApplySimulatedPlan = () => {
    setActiveStudyPlan(simulationComparison.scenario.simulatedPlan);
    setAvailableMinutes(simulationComparison.scenario.availableMinutes);
    setTargetExamDate(simulationComparison.scenario.examDate);
    setCrammingModePreferred(simulationComparison.scenario.crammingMode);
    setSimAppliedMessage('Simulated plan applied as your active schedule.');
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-Mode Switcher */}
      <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Adaptive Study Planner &amp; Recovery Workspace
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Deterministic scheduling powered by quiz accuracy, confidence gaps, exam proximity, and optional wellness capacity.
            </p>
          </div>

          <div className="inline-flex flex-wrap items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 self-start">
            <button
              type="button"
              onClick={() => setPlannerFocusMode('schedule')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                plannerFocusMode === 'schedule'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Adaptive Schedule</span>
            </button>
            <button
              type="button"
              onClick={() => setPlannerFocusMode('rescue')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                plannerFocusMode === 'rescue'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>Study Rescue Mode</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSimAppliedMessage('');
                setPlannerFocusMode('simulator');
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                plannerFocusMode === 'simulator'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Scenario Simulator</span>
            </button>
          </div>
        </div>
      </section>

      {/* VIEW 1: ADAPTIVE SCHEDULE & CRAMMING MODE */}
      {plannerFocusMode === 'schedule' && (
        <div className="space-y-6">
          {/* Parameters & Cramming Toggle */}
          <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Available Study Time Today (min)
                </label>
                <input
                  type="number"
                  min={20}
                  max={360}
                  step={10}
                  value={availableMinutes}
                  onChange={(e) => setAvailableMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Target Examination Date
                </label>
                <input
                  type="date"
                  value={targetExamDate}
                  onChange={(e) => setTargetExamDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Wellness Capacity Sync
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSection('wellness')}
                  className="w-full px-3 py-2 rounded-lg text-xs font-medium text-left bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500 transition-colors truncate"
                >
                  {latestWellness
                    ? `${latestWellness.energyLevel} energy · ${latestWellness.preferredIntensity} pace`
                    : 'Moderate energy · Balanced'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleGeneratePlan()}
                  className="flex-1 px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Rebuild Plan
                </button>
                <button
                  type="button"
                  onClick={handleToggleCramming}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                    crammingModePreferred
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300'
                      : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>
                    {crammingModePreferred ? 'Cramming On' : 'Cramming Mode'}
                  </span>
                </button>
              </div>
            </div>

            {activePlan && (
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="text-slate-700 dark:text-slate-300">
                  {activePlan.advisoryNotice}
                </span>
                <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                  {activePlan.allocatedStudyMinutes}m study ·{' '}
                  {activePlan.allocatedBreakMinutes}m breaks
                </span>
              </div>
            )}

            {syncNotice && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{syncNotice}</span>
              </p>
            )}
          </section>

          {/* Study Timeline with Innovation C: Explainable Study Decisions */}
          <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Generated Study Timeline
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Click &quot;Why this recommendation?&quot; on any block to inspect the exact calculation factors.
                  {activePlan
                    ? ` Last calculated at ${new Date(
                        activePlan.generatedAt
                      ).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}.`
                    : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSyncLatestResults}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Sync Latest Quiz &amp; Wellness</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlannerFocusMode('rescue')}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                >
                  <LifeBuoy className="w-3.5 h-3.5" />
                  <span>Missed a block? Rescue Mode</span>
                </button>
              </div>
            </div>

            {activePlan && activePlan.tasks.length > 0 ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {activePlan.tasks.map((task) => {
                  const isBreak = task.taskType === 'break';
                  const isExpanded = expandedExplainId === task.id;
                  const isCompleted = task.status === 'completed';
                  const isMissed = task.status === 'missed';

                  return (
                    <div key={task.id} className="py-4 space-y-3">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="w-16 shrink-0 pt-0.5">
                            <span className="font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                              {task.startTimeLabel}
                            </span>
                            <span className="block text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                              {task.durationMinutes} min
                            </span>
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                              {isBreak ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                  <Coffee className="w-3.5 h-3.5" />
                                  <span>Protected Break</span>
                                </span>
                              ) : (
                                <span>
                                  Priority {task.priorityScore}/100 ·{' '}
                                  {task.taskType.replace('_', ' ')}
                                </span>
                              )}
                              {task.rescueNote && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                                    {task.rescueNote}
                                  </span>
                                </>
                              )}
                            </div>

                            <h4
                              className={`text-sm font-semibold ${
                                isCompleted
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : isMissed
                                  ? 'text-amber-700 dark:text-amber-300'
                                  : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {task.title}
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {task.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {!isBreak && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  updateStudyTaskStatus(
                                    task.id,
                                    isCompleted ? 'scheduled' : 'completed'
                                  )
                                }
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap ${
                                  isCompleted
                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{isCompleted ? 'Completed' : 'Complete'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateStudyTaskStatus(
                                    task.id,
                                    isMissed ? 'scheduled' : 'missed'
                                  )
                                }
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap ${
                                  isMissed
                                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>{isMissed ? 'Missed' : 'Mark Missed'}</span>
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedExplainId(isExpanded ? null : task.id)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors whitespace-nowrap"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Why this recommendation?</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Innovation C: Explainable Study Decisions Drawer */}
                      {isExpanded && (
                        <div className="md:ml-20 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2.5">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            Deterministic Factors Driving This Recommendation
                          </p>
                          <div className="space-y-2">
                            {task.explanationFactors.map((factor, idx) => (
                              <div
                                key={idx}
                                className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 text-xs"
                              >
                                <span className="font-medium text-slate-900 dark:text-slate-100">
                                  {factor.factor} ({factor.impactWeight} weight)
                                </span>
                                <span className="text-slate-600 dark:text-slate-400 sm:text-right">
                                  {factor.detail}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Click &quot;Rebuild Plan&quot; to generate your adaptive study schedule.
              </p>
            )}
          </section>
        </div>
      )}

      {/* VIEW 2: INNOVATION D — STUDY RESCUE MODE */}
      {plannerFocusMode === 'rescue' && (
        <div className="space-y-6">
          <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Study Rescue Mode — Recover Without Overloading
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Mark completed or missed blocks below, enter your realistic remaining study minutes, and StudySync AI will retain, shorten, or defer tasks cleanly.
                </p>
              </div>
              <div className="flex items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Remaining Time Today (min)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={240}
                    step={5}
                    value={rescueRemainingMinutes}
                    onChange={(e) =>
                      setRescueRemainingMinutes(Number(e.target.value))
                    }
                    className="w-36 px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                </div>
                <button
                  type="button"
                  disabled={!activePlan}
                  onClick={handleRunRescue}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                >
                  <LifeBuoy className="w-3.5 h-3.5" />
                  <span>Recalculate Plan</span>
                </button>
              </div>
            </div>

            {activePlan ? (
              <div className="space-y-2.5">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Current Study Blocks (mark status before recalculating):
                </p>
                <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
                  {activePlan.tasks
                    .filter((t) => t.taskType !== 'break')
                    .map((task) => (
                      <div
                        key={task.id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {task.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            {task.durationMinutes} min · Priority{' '}
                            {task.priorityScore}/100 · Status: {task.status}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              updateStudyTaskStatus(task.id, 'completed')
                            }
                            className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                              task.status === 'completed'
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            Completed
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateStudyTaskStatus(task.id, 'missed')
                            }
                            className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                              task.status === 'missed'
                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            Missed
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateStudyTaskStatus(task.id, 'scheduled')
                            }
                            className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                              task.status === 'scheduled'
                                ? 'bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            Pending
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate a plan in Adaptive Schedule first to use Rescue Mode.
              </p>
            )}
          </section>

          {rescuePreview && (
            <section className="rounded-xl bg-white dark:bg-[#111827] border border-blue-500/40 p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    Rescue Plan Preview Ready
                  </p>
                  <h4 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {rescuePreview.rescuedPlan.advisoryNotice}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={handleApplyRescuePlan}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
                >
                  Apply Rescued Schedule
                </button>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {rescuePreview.summary.map((item) => (
                  <div
                    key={item.taskId}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {item.title}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.reason}
                      </p>
                    </div>
                    <span
                      className={`font-mono font-semibold uppercase shrink-0 ${
                        item.action === 'retained' || item.action === 'completed'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : item.action === 'shortened'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {item.action} ({item.newDurationMinutes}m)
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* VIEW 3: INNOVATION E — STUDY SCENARIO SIMULATOR */}
      {plannerFocusMode === 'simulator' && (
        <div className="space-y-6">
          <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Study Scenario Simulator (&quot;What If?&quot; Planner)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Explore hypothetical time, exam date, energy, or intensity changes safely—your active plan will not change unless you click Apply.
                </p>
              </div>
              <button
                type="button"
                onClick={handleApplySimulatedPlan}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
              >
                Apply Simulated Plan
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Hypothetical Time (min)
                </label>
                <input
                  type="number"
                  min={20}
                  max={360}
                  step={10}
                  value={simMinutes}
                  onChange={(e) => setSimMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Hypothetical Exam Date
                </label>
                <input
                  type="date"
                  value={simExamDate}
                  onChange={(e) => setSimExamDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Energy Level
                </label>
                <select
                  value={simEnergy}
                  onChange={(e) => setSimEnergy(e.target.value as EnergyLevel)}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Study Intensity
                </label>
                <select
                  value={simIntensity}
                  onChange={(e) =>
                    setSimIntensity(e.target.value as StudyIntensity)
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="light">Light</option>
                  <option value="balanced">Balanced</option>
                  <option value="focused">Focused</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setSimCramming((v) => !v)}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    simCramming
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300'
                      : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {simCramming ? 'Cramming: Enabled' : 'Cramming: Off'}
                </button>
              </div>
            </div>

            {simAppliedMessage && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>{simAppliedMessage}</span>
              </div>
            )}

            {/* Delta Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Study Time Change
                </p>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {simulationComparison.deltas.studyMinutesDelta >= 0
                    ? `+${simulationComparison.deltas.studyMinutesDelta}`
                    : simulationComparison.deltas.studyMinutesDelta}{' '}
                  min
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Protected Break Change
                </p>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {simulationComparison.deltas.breakMinutesDelta >= 0
                    ? `+${simulationComparison.deltas.breakMinutesDelta}`
                    : simulationComparison.deltas.breakMinutesDelta}{' '}
                  min
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Top Priority in Scenario
                </p>
                <p className="mt-1 text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                  {simulationComparison.deltas.topPriorityTopic}
                </p>
              </div>
            </div>
          </section>

          {/* Side-by-side Original vs Simulated Comparison */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[
              {
                label: 'Current Baseline Plan',
                plan: simulationComparison.originalPlan,
              },
              {
                label: 'Simulated "What-If" Plan',
                plan: simulationComparison.scenario.simulatedPlan,
              },
            ].map((col, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 space-y-4"
              >
                <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                    {col.label}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    {col.plan.allocatedStudyMinutes}m study ·{' '}
                    {col.plan.allocatedBreakMinutes}m breaks ·{' '}
                    {col.plan.energyLevelUsed} energy / {col.plan.intensityUsed}
                  </p>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
                  {col.plan.tasks.map((t) => (
                    <div
                      key={t.id}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p
                          className={`font-medium truncate ${
                            t.taskType === 'break'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {t.startTimeLabel} · {t.title}
                        </p>
                      </div>
                      <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                        {t.durationMinutes}m
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
