import React, { useMemo, useState } from 'react';
import {
  Battery,
  BatteryCharging,
  BatteryLow,
  CalendarClock,
  CheckCircle2,
  HeartHandshake,
  ShieldCheck,
} from 'lucide-react';
import { useStudySync } from '../hooks/useStudySync';
import { EnergyLevel, StudyIntensity } from '../types/studysync';
import { generateAdaptiveStudyPlan } from '../utils/schedulerEngine';

export function WellnessPage() {
  const {
    state,
    latestWellness,
    saveWellnessCheckIn,
    setActiveStudyPlan,
    buildBaseSchedulerInput,
    crammingModePreferred,
    navigateToPlannerMode,
  } = useStudySync();

  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>(
    () => latestWellness?.energyLevel ?? 'moderate'
  );
  const [intensity, setIntensity] = useState<StudyIntensity>(
    () => latestWellness?.preferredIntensity ?? 'balanced'
  );
  const [availableMinutes, setAvailableMinutes] = useState<number>(
    () => latestWellness?.availableMinutesToday ?? 120
  );
  const [blockMinutes, setBlockMinutes] = useState<number>(
    () => latestWellness?.preferredBlockMinutes ?? 35
  );
  const [breakMinutes, setBreakMinutes] = useState<number>(
    () => latestWellness?.breakMinutesPerBlock ?? 10
  );
  const [notes, setNotes] = useState<string>(
    () => latestWellness?.notes ?? ''
  );
  const [savedNotice, setSavedNotice] = useState<string>('');

  const pacingGuidance = useMemo(() => {
    if (energyLevel === 'low') {
      return {
        headline: 'Gentle Pacing & Protected Breaks Recommended',
        bullets: [
          'Study blocks are automatically capped at 25 minutes so focus stays sharp without fatigue.',
          'At least 10-minute breaks are placed between blocks, and daily workload utilizes ~72% of available minutes.',
          'Prioritize single-concept recall or light Teach-Back review; preserve full sleep rather than extending late hours.',
        ],
      };
    }
    if (energyLevel === 'high') {
      return {
        headline: 'Sustained Pacing With Structured Recovery',
        bullets: [
          `Blocks run ${intensity === 'focused' ? '40–50' : '35'} minutes followed by ${breakMinutes}-minute recovery breaks.`,
          'Tackle high-priority confidence-gap topics first while focus is highest.',
          'Even at high energy, daily planning respects healthy rest boundaries.',
        ],
      };
    }
    return {
      headline: 'Steady Balanced Study Rhythm',
      bullets: [
        `Sessions run ${Math.min(40, Math.max(25, blockMinutes))} minutes with ${breakMinutes}-minute breaks between topics.`,
        'Balances weakest exam-proximate topics with active recall practice.',
        'You can adjust energy or skip check-ins anytime—your plan adapts dynamically.',
      ],
    };
  }, [energyLevel, intensity, blockMinutes, breakMinutes]);

  const handleSaveAndApply = (e: React.FormEvent) => {
    e.preventDefault();
    const record = saveWellnessCheckIn({
      energyLevel,
      preferredIntensity: intensity,
      availableMinutesToday: availableMinutes,
      preferredBlockMinutes: blockMinutes,
      breakMinutesPerBlock: breakMinutes,
      notes: notes.trim(),
      isOptionalSkipped: false,
    });

    const nextPlan = generateAdaptiveStudyPlan(
      buildBaseSchedulerInput({
        availableMinutes: record.availableMinutesToday,
        energyLevel: record.energyLevel,
        intensity: record.preferredIntensity,
        preferredBlockMinutes: record.preferredBlockMinutes,
        breakMinutesPerBlock: record.breakMinutesPerBlock,
        crammingMode: crammingModePreferred,
      })
    );
    setActiveStudyPlan(nextPlan);
    setSavedNotice(
      `Check-in saved and study plan updated (${nextPlan.allocatedStudyMinutes}m study, ${nextPlan.allocatedBreakMinutes}m breaks).`
    );
  };

  const handleSkipCheckIn = () => {
    saveWellnessCheckIn({
      energyLevel: 'moderate',
      preferredIntensity: 'balanced',
      availableMinutesToday: 120,
      preferredBlockMinutes: 35,
      breakMinutesPerBlock: 10,
      notes: 'Skipped check-in — using balanced default pacing.',
      isOptionalSkipped: true,
    });
    setSavedNotice(
      'Check-in skipped. Your schedule remains on balanced default pacing.'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Privacy Assurance */}
      <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Student Wellness &amp; Capacity Check-In (Optional)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Adjust your study block length, break cadence, and daily capacity to match how you feel today.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Voluntary · Stored locally · Non-clinical study pacing only</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Check-In Form (7 cols) */}
        <form
          onSubmit={handleSaveAndApply}
          className="lg:col-span-7 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 space-y-6"
        >
          {/* Energy Level */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
              Current Energy Level
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  value: 'low' as EnergyLevel,
                  label: 'Low',
                  sub: 'Short 20–25m blocks',
                  icon: BatteryLow,
                },
                {
                  value: 'moderate' as EnergyLevel,
                  label: 'Moderate',
                  sub: 'Steady 30–40m blocks',
                  icon: Battery,
                },
                {
                  value: 'high' as EnergyLevel,
                  label: 'High',
                  sub: 'Deep 40–50m blocks',
                  icon: BatteryCharging,
                },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = energyLevel === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEnergyLevel(opt.value)}
                    className={`p-3.5 rounded-xl border text-left transition-colors ${
                      active
                        ? 'bg-blue-50 border-blue-600 text-slate-900 dark:bg-blue-950/40 dark:border-blue-500 dark:text-slate-100'
                        : 'bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mb-2 ${
                        active
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-400'
                      }`}
                    />
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {opt.sub}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferred Study Intensity */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
              Preferred Study Intensity
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  {
                    value: 'light',
                    label: 'Light',
                    desc: 'Lower cognitive load, extra breaks',
                  },
                  {
                    value: 'balanced',
                    label: 'Balanced',
                    desc: 'Mix of recall and review',
                  },
                  {
                    value: 'focused',
                    label: 'Focused',
                    desc: 'Priority exam practice',
                  },
                ] as const
              ).map((opt) => {
                const active = intensity === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setIntensity(opt.value)}
                    className={`p-3.5 rounded-xl border text-left transition-colors ${
                      active
                        ? 'bg-blue-50 border-blue-600 text-slate-900 dark:bg-blue-950/40 dark:border-blue-500 dark:text-slate-100'
                        : 'bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {opt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Capacity & Break Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Study Capacity Today (min)
              </label>
              <input
                type="number"
                min={20}
                max={300}
                step={10}
                value={availableMinutes}
                onChange={(e) => setAvailableMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Focus Block Target (min)
              </label>
              <input
                type="number"
                min={15}
                max={60}
                step={5}
                value={blockMinutes}
                onChange={(e) => setBlockMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Break per Block (min)
              </label>
              <input
                type="number"
                min={5}
                max={25}
                step={5}
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 tabular-nums"
              />
            </div>
          </div>

          {/* Optional Personal Pacing Note */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Optional Pacing Note (for your own reference)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Afternoon lab at 3pm, keep study blocks light before evening."
              className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            />
          </div>

          {savedNotice && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{savedNotice}</span>
              </span>
              <button
                type="button"
                onClick={() => navigateToPlannerMode('schedule', false)}
                className="font-semibold underline whitespace-nowrap"
              >
                View Updated Schedule
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleSkipCheckIn}
              className="px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Skip Check-In for Now
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Save &amp; Update Study Plan</span>
            </button>
          </div>
        </form>

        {/* Right: Pacing Recommendations & History (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
              <HeartHandshake className="w-4 h-4" />
              <span>Wellness-Aware Pacing Recommendation</span>
            </div>
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              {pacingGuidance.headline}
            </h3>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4 leading-relaxed">
              {pacingGuidance.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
              StudySync AI never recommends sacrificing sleep or regular rest, and wellness inputs are strictly non-clinical scheduling preferences.
            </p>
          </section>

          <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 pb-3 border-b border-slate-200 dark:border-slate-800">
              Recent Check-In History
            </h3>
            {state.wellnessHistory.length > 0 ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {state.wellnessHistory.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="py-3 text-xs space-y-1">
                    <div className="flex items-center justify-between font-medium text-slate-900 dark:text-slate-100">
                      <span className="capitalize">
                        {entry.isOptionalSkipped
                          ? 'Skipped (Balanced Defaults)'
                          : `${entry.energyLevel} energy · ${entry.preferredIntensity} pace`}
                      </span>
                      <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {entry.availableMinutesToday}m
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-slate-500 dark:text-slate-400">
                        {entry.notes}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                      {new Date(entry.recordedAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No check-ins recorded yet.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
