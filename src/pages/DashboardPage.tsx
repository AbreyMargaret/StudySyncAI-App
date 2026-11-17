import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Flame,
  HeartHandshake,
  HelpCircle,
  LifeBuoy,
  Upload,
} from 'lucide-react';
import { useStudySync } from '../hooks/useStudySync';
import { daysUntilDate } from '../utils/schedulerEngine';

export function DashboardPage() {
  const {
    state,
    topicPerformances,
    latestWellness,
    setActiveSection,
    navigateToQuizForTopic,
    navigateToPlannerMode,
    updateStudyTaskStatus,
  } = useStudySync();

  const sortedSubjects = [...state.subjects].sort((a, b) =>
    a.examDate.localeCompare(b.examDate)
  );

  const reviewTopics = topicPerformances
    .filter((t) => t.needsReview)
    .sort((a, b) => (a.latestAccuracy ?? -1) - (b.latestAccuracy ?? -1));

  const confidenceBlindSpots = topicPerformances.filter(
    (t) => t.latestConfidenceGap !== null && t.latestConfidenceGap >= 15
  );

  const recentAttempts = [...state.quizAttempts]
    .sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    )
    .slice(0, 4);

  const plan = state.activeStudyPlan;
  const studyTasks = plan
    ? plan.tasks.filter((t) => t.taskType !== 'break')
    : [];
  const completedTasksCount = studyTasks.filter(
    (t) => t.status === 'completed'
  ).length;
  const planProgressPercent =
    studyTasks.length > 0
      ? Math.round((completedTasksCount / studyTasks.length) * 100)
      : 0;

  const subjectMap = new Map(state.subjects.map((s) => [s.id, s]));
  const topicMap = new Map(state.topics.map((t) => [t.id, t]));

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Actions Header */}
      <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Try Demo Workspace · {state.student.program}
            </p>
            <h2 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100 text-balance">
              Welcome back, {state.student.displayName}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Your learning library, quiz diagnostics, confidence calibration, and wellness capacity stay synchronized so every study block reflects what you need most today.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveSection('library')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Material</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('quizzes')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Take a Quiz</span>
            </button>
            <button
              type="button"
              onClick={() => navigateToPlannerMode('schedule', false)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Generate Study Plan</span>
            </button>
            <button
              type="button"
              onClick={() => navigateToPlannerMode('schedule', true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/5 hover:bg-amber-500/10 transition-colors whitespace-nowrap shrink-0"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Cramming Mode</span>
            </button>
            <button
              type="button"
              onClick={() => navigateToPlannerMode('rescue', false)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>Study Rescue Mode</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4-Column Key Metrics Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Active Subjects
          </p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {state.subjects.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {state.topics.length} topics · {state.materials.length} materials
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Next Examination
          </p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {sortedSubjects[0]
              ? `${daysUntilDate(sortedSubjects[0].examDate)}d left`
              : 'None set'}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
            {sortedSubjects[0]?.name ?? 'Add a subject exam date'}
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Topics Requiring Review
          </p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {reviewTopics.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {confidenceBlindSpots.length} confidence gap alert(s)
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Today&apos;s Plan Progress
          </p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {planProgressPercent}%
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {completedTasksCount}/{studyTasks.length} study blocks complete
          </p>
        </div>
      </section>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Primary Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Today's Recommended Study Activities */}
          <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Today&apos;s Recommended Study Activities
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {plan
                    ? `${plan.allocatedStudyMinutes}m study · ${plan.allocatedBreakMinutes}m protected breaks · ${plan.energyLevelUsed} energy`
                    : 'Generate your adaptive schedule in Study Planner'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigateToPlannerMode('schedule', false)}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                <span>Open Planner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {plan && plan.tasks.length > 0 ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {plan.tasks.slice(0, 5).map((task) => {
                  const isBreak = task.taskType === 'break';
                  const isDone = task.status === 'completed';
                  const isMissed = task.status === 'missed';

                  return (
                    <div
                      key={task.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                            {task.startTimeLabel}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{task.durationMinutes} min</span>
                          {!isBreak && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>Priority {task.priorityScore}/100</span>
                            </>
                          )}
                          {isDone && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                Completed
                              </span>
                            </>
                          )}
                          {isMissed && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-amber-600 dark:text-amber-400 font-medium">
                                Missed
                              </span>
                            </>
                          )}
                        </div>
                        <p
                          className={`text-sm font-medium ${
                            isDone
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {task.description}
                        </p>
                      </div>

                      {!isBreak && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              updateStudyTaskStatus(
                                task.id,
                                isDone ? 'scheduled' : 'completed'
                              )
                            }
                            className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap ${
                              isDone
                                ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {isDone ? 'Completed' : 'Mark Done'}
                          </button>
                          <button
                            type="button"
                            onClick={() => navigateToPlannerMode('schedule', false)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                            title="Inspect explanation factors in Study Planner"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Why?</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No study schedule generated yet.
                </p>
                <button
                  type="button"
                  onClick={() => navigateToPlannerMode('schedule', false)}
                  className="mt-3 px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
                >
                  Generate Study Plan
                </button>
              </div>
            )}
          </section>

          {/* Confidence-Gap Insights & Topics Requiring Review */}
          <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Confidence-Gap Insights &amp; Review Priorities
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Comparing self-reported confidence against actual quiz performance
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('analytics')}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                <span>View Analytics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {reviewTopics.length > 0 ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {reviewTopics.slice(0, 4).map((perf) => (
                  <div
                    key={perf.topicId}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>{perf.subjectName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {perf.latestAccuracy !== null
                            ? `Accuracy ${perf.latestAccuracy}%`
                            : 'Not quizzed'}
                        </span>
                        {perf.latestConfidenceGap !== null && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span
                              className={`tabular-nums font-medium ${
                                perf.latestConfidenceGap >= 15
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              Gap{' '}
                              {perf.latestConfidenceGap >= 0
                                ? `+${perf.latestConfidenceGap}`
                                : perf.latestConfidenceGap}{' '}
                              pts
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {perf.topicTitle}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        {perf.latestConfidenceGap !== null &&
                          perf.latestConfidenceGap >= 15 && (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          )}
                        <span>{perf.reviewReason}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          navigateToQuizForTopic(
                            perf.subjectId,
                            perf.topicId,
                            'quiz'
                          )
                        }
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
                      >
                        Quiz Topic
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          navigateToQuizForTopic(
                            perf.subjectId,
                            perf.topicId,
                            'teach_back'
                          )
                        }
                        className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                      >
                        Teach-Back
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-sm text-slate-500 dark:text-slate-400">
                All tracked topics currently meet target mastery.
              </p>
            )}
          </section>
        </div>

        {/* Right Secondary Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Optional Wellness Check-in Reminder */}
          <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <HeartHandshake className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Optional Student Wellness Check-In</span>
                </div>
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  {latestWellness && !latestWellness.isOptionalSkipped
                    ? `Current capacity: ${latestWellness.energyLevel} energy · ${latestWellness.preferredIntensity} pace`
                    : 'No wellness check-in logged today'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {latestWellness && !latestWellness.isOptionalSkipped
                    ? `Available ${latestWellness.availableMinutesToday}m today (${latestWellness.preferredBlockMinutes}m blocks with ${latestWellness.breakMinutesPerBlock}m breaks). Voluntary & non-clinical.`
                    : 'Optionally log your current energy and time capacity to keep your study plan realistic and burnout-free.'}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setActiveSection('wellness')}
                className="px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                Update Check-In
              </button>
              <button
                type="button"
                onClick={() => navigateToPlannerMode('simulator', false)}
                className="px-3 py-2 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
              >
                Simulate Capacity Changes
              </button>
            </div>
          </section>

          {/* Active Subjects & Upcoming Exams */}
          <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Active Subjects &amp; Exam Windows
              </h3>
              <button
                type="button"
                onClick={() => setActiveSection('library')}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Library</span>
              </button>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {sortedSubjects.map((subj) => {
                const daysLeft = daysUntilDate(subj.examDate);
                const subjTopics = state.topics.filter(
                  (t) => t.subjectId === subj.id
                );
                const subjPerfs = topicPerformances.filter(
                  (p) => p.subjectId === subj.id && p.latestAccuracy !== null
                );
                const avgAcc =
                  subjPerfs.length > 0
                    ? Math.round(
                        subjPerfs.reduce(
                          (sum, p) => sum + (p.latestAccuracy ?? 0),
                          0
                        ) / subjPerfs.length
                      )
                    : null;

                return (
                  <div key={subj.id} className="py-3.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {subj.code} · {subj.name}
                      </p>
                      <span
                        className={`text-xs font-medium tabular-nums shrink-0 ${
                          daysLeft <= 5
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {daysLeft}d to exam ({subj.examDate})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      <span>{subjTopics.length} topics</span>
                      <span>
                        {avgAcc !== null
                          ? `Avg mastery ${avgAcc}% / Target ${subj.targetMastery}%`
                          : `Target ${subj.targetMastery}% · Unassessed`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recent Quiz Results */}
          <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Recent Quiz Results
              </h3>
              <button
                type="button"
                onClick={() => setActiveSection('quizzes')}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
              >
                All Quizzes
              </button>
            </div>
            {recentAttempts.length > 0 ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {recentAttempts.map((att) => {
                  const topic = topicMap.get(att.topicId);
                  const subj = subjectMap.get(att.subjectId);
                  const gap = att.reportedConfidence - att.accuracyPercent;
                  return (
                    <div
                      key={att.id}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {topic?.title ?? 'Topic Quiz'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate tabular-nums">
                          {subj?.name ?? 'Subject'} · Confidence {att.reportedConfidence}% · Gap{' '}
                          {gap >= 0 ? `+${gap}` : gap} pts
                        </p>
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {att.accuracyPercent}%
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {att.score}/{att.totalQuestions}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-6 text-xs text-slate-500 dark:text-slate-400">
                Complete your first quiz to see performance and confidence tracking.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
