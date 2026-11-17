import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStudySync } from '../hooks/useStudySync';

export function AnalyticsPage() {
  const {
    state,
    topicPerformances,
    navigateToQuizForTopic,
    setActiveSection,
  } = useStudySync();
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  const isDark = state.theme === 'dark';
  const gridColor = isDark ? '#1E293B' : '#E2E8F0';
  const axisColor = isDark ? '#94A3B8' : '#64748B';
  const tooltipBg = isDark ? '#0F172A' : '#FFFFFF';
  const tooltipBorder = isDark ? '#334155' : '#CBD5E1';

  const filteredPerformances = useMemo(() => {
    if (subjectFilter === 'all') return topicPerformances;
    return topicPerformances.filter((p) => p.subjectId === subjectFilter);
  }, [topicPerformances, subjectFilter]);

  const confidenceChartData = useMemo(() => {
    return filteredPerformances
      .filter((p) => p.latestAccuracy !== null)
      .map((p) => ({
        name:
          p.topicTitle.length > 18
            ? `${p.topicTitle.slice(0, 16)}…`
            : p.topicTitle,
        fullTitle: p.topicTitle,
        Confidence: p.latestConfidence ?? 0,
        Accuracy: p.latestAccuracy ?? 0,
        Gap: p.latestConfidenceGap ?? 0,
      }));
  }, [filteredPerformances]);

  const timelineChartData = useMemo(() => {
    const topicMap = new Map(state.topics.map((t) => [t.id, t]));
    return [...state.quizAttempts]
      .filter((a) => subjectFilter === 'all' || a.subjectId === subjectFilter)
      .sort(
        (a, b) =>
          new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
      )
      .map((a, idx) => ({
        attempt: `#${idx + 1}`,
        topic: topicMap.get(a.topicId)?.title ?? 'Topic',
        Accuracy: a.accuracyPercent,
        Confidence: a.reportedConfidence,
        date: new Date(a.completedAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
      }));
  }, [state.quizAttempts, state.topics, subjectFilter]);

  const overallAccuracy = useMemo(() => {
    const relevant = state.quizAttempts.filter(
      (a) => subjectFilter === 'all' || a.subjectId === subjectFilter
    );
    if (relevant.length === 0) return null;
    return Math.round(
      relevant.reduce((sum, a) => sum + a.accuracyPercent, 0) / relevant.length
    );
  }, [state.quizAttempts, subjectFilter]);

  const averageAbsGap = useMemo(() => {
    const assessed = filteredPerformances.filter(
      (p) => p.latestConfidenceGap !== null
    );
    if (assessed.length === 0) return null;
    return Math.round(
      assessed.reduce(
        (sum, p) => sum + Math.abs(p.latestConfidenceGap ?? 0),
        0
      ) / assessed.length
    );
  }, [filteredPerformances]);

  const subjectMap = new Map(state.subjects.map((s) => [s.id, s]));
  const topicMap = new Map(state.topics.map((t) => [t.id, t]));

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Performance Analytics &amp; Confidence Calibration
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Track quiz accuracy trends, topic-level mastery, and confidence calibration across subjects.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              aria-label="Filter analytics by subject"
              className="px-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Subjects</option>
              {state.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} · {s.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setActiveSection('quizzes')}
              className="px-3.5 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap"
            >
              Take New Quiz
            </button>
          </div>
        </div>
      </section>

      {/* 3 Summary Stat Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Average Quiz Accuracy
          </p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {overallAccuracy !== null ? `${overallAccuracy}%` : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Across {state.quizAttempts.length} saved quiz attempt(s)
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Mean Absolute Confidence Gap
          </p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {averageAbsGap !== null ? `${averageAbsGap} pts` : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Closer to 0 pts indicates stronger self-calibration
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Topics Flagged for Review
          </p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {filteredPerformances.filter((p) => p.needsReview).length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Prioritized automatically in Study Planner
          </p>
        </div>
      </section>

      {/* Charts Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confidence vs Accuracy Chart */}
        <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
            <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Confidence vs. Actual Accuracy by Topic
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Highlights overconfidence gaps sent to the adaptive scheduler
              </p>
            </div>
          </div>
          <div className="h-72 pt-4">
            {confidenceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={confidenceChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: axisColor, fontSize: 11 }}
                    axisLine={{ stroke: gridColor }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: axisColor, fontSize: 11 }}
                    axisLine={{ stroke: gridColor }}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar
                    dataKey="Confidence"
                    fill="#64748B"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="Accuracy"
                    fill="#2563EB"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                Complete at least one quiz to visualize confidence vs. accuracy.
              </div>
            )}
          </div>
        </div>

        {/* Quiz Progress Over Time */}
        <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Quiz Accuracy &amp; Confidence Trend
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chronological progression across completed assessments
              </p>
            </div>
          </div>
          <div className="h-72 pt-4">
            {timelineChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="attempt"
                    tick={{ fill: axisColor, fontSize: 11 }}
                    axisLine={{ stroke: gridColor }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: axisColor, fontSize: 11 }}
                    axisLine={{ stroke: gridColor }}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="Accuracy"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Confidence"
                    stroke="#94A3B8"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                Quiz trend data will appear after completing assessments.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Topic-Level Performance & Review Table */}
      <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6">
        <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Topic-Level Performance &amp; Recommended Reviews
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                <th className="py-3 pr-4">Topic</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4 text-right">Attempts</th>
                <th className="py-3 px-4 text-right">Accuracy</th>
                <th className="py-3 px-4 text-right">Confidence Gap</th>
                <th className="py-3 px-4">Recommendation</th>
                <th className="py-3 pl-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 text-xs">
              {filteredPerformances.map((perf) => (
                <tr
                  key={perf.topicId}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">
                    {perf.topicTitle}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    {perf.subjectName}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {perf.attemptsCount}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100">
                    {perf.latestAccuracy !== null
                      ? `${perf.latestAccuracy}%`
                      : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {perf.latestConfidenceGap !== null ? (
                      <span
                        className={
                          perf.latestConfidenceGap >= 15
                            ? 'text-amber-600 dark:text-amber-400 font-medium'
                            : 'text-slate-700 dark:text-slate-300'
                        }
                      >
                        {perf.latestConfidenceGap >= 0
                          ? `+${perf.latestConfidenceGap}`
                          : perf.latestConfidenceGap}{' '}
                        pts
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1.5">
                      {perf.needsReview ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      )}
                      <span>{perf.reviewReason}</span>
                    </span>
                  </td>
                  <td className="py-3 pl-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() =>
                        navigateToQuizForTopic(
                          perf.subjectId,
                          perf.topicId,
                          'quiz'
                        )
                      }
                      className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                    >
                      Reassess
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Quiz History Log */}
      <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 pb-4 border-b border-slate-200 dark:border-slate-800">
          Saved Quiz History
        </h3>
        {state.quizAttempts.length === 0 ? (
          <p className="py-6 text-xs text-slate-500 dark:text-slate-400">
            No quiz attempts recorded yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
            {state.quizAttempts
              .filter(
                (a) => subjectFilter === 'all' || a.subjectId === subjectFilter
              )
              .map((att) => {
                const subj = subjectMap.get(att.subjectId);
                const topic = topicMap.get(att.topicId);
                const gap = att.reportedConfidence - att.accuracyPercent;
                return (
                  <div
                    key={att.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {topic?.title ?? 'Topic'} · {subj?.name ?? 'Subject'}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                        {new Date(att.completedAt).toLocaleString()} ·{' '}
                        {Math.round(att.durationSeconds / 60)}m{' '}
                        {att.durationSeconds % 60}s duration
                      </p>
                    </div>
                    <div className="flex items-center gap-4 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      <span>
                        Score {att.score}/{att.totalQuestions} ({att.accuracyPercent}%)
                      </span>
                      <span>Conf {att.reportedConfidence}%</span>
                      <span
                        className={
                          gap >= 15
                            ? 'text-amber-600 dark:text-amber-400 font-medium'
                            : ''
                        }
                      >
                        Gap {gap >= 0 ? `+${gap}` : gap} pts
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>
    </div>
  );
}
