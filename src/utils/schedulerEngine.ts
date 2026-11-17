import {
  EnergyLevel,
  ExplanationFactor,
  RescueSummaryItem,
  StudyIntensity,
  StudyPlan,
  StudyScenario,
  StudyTask,
  Subject,
  Topic,
  TopicPerformance,
  WellnessCheckIn,
} from '../types/studysync';

/**
 * Deterministic, reusable adaptive scheduling engine for StudySync AI.
 * Powers:
 * 1. Adaptive Study Planner
 * 2. Cramming Mode
 * 3. Explainable Study Decisions ("Why this recommendation?")
 * 4. Study Rescue Mode
 * 5. Study Scenario Simulator
 */

export interface SchedulerInput {
  studentId: string;
  subjects: Subject[];
  topics: Topic[];
  performances: TopicPerformance[];
  availableMinutes: number;
  targetExamDate: string; // YYYY-MM-DD
  energyLevel: EnergyLevel;
  intensity: StudyIntensity;
  crammingMode: boolean;
  preferredBlockMinutes?: number;
  breakMinutesPerBlock?: number;
  startHour?: number;
}

const MAX_SAFE_DAILY_STUDY_MINUTES = 300; // Guardrail: never recommend excessive marathon studying

function formatTimeFromOffset(startHour: number, offsetMinutes: number): string {
  const totalMinutes = startHour * 60 + offsetMinutes;
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = Math.floor(normalized / 60);
  const mm = normalized % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function daysUntilDate(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return 7;
  const diffMs = target.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

interface ScoredTopicCandidate {
  topic: Topic;
  subject: Subject;
  performance?: TopicPerformance;
  priorityScore: number;
  daysLeft: number;
  explanationFactors: ExplanationFactor[];
}

function scoreTopicPriority(
  topic: Topic,
  subject: Subject,
  perf: TopicPerformance | undefined,
  overrideExamDate: string,
  energyLevel: EnergyLevel,
  intensity: StudyIntensity,
  crammingMode: boolean
): ScoredTopicCandidate {
  const factors: ExplanationFactor[] = [];
  let score = 20; // baseline

  // Factor 1: Quiz accuracy deficit
  if (!perf || perf.latestAccuracy === null) {
    score += 24;
    factors.push({
      factor: 'Unassessed Topic',
      impactWeight: 'medium',
      detail:
        'No quiz attempt recorded yet; prioritized for diagnostic review so hidden gaps do not persist.',
    });
  } else {
    const accuracyDeficit = Math.max(0, 100 - perf.latestAccuracy);
    const accuracyPoints = Math.round(accuracyDeficit * 0.5);
    score += accuracyPoints;
    factors.push({
      factor: `Quiz Accuracy (${perf.latestAccuracy}%)`,
      impactWeight: perf.latestAccuracy < 65 ? 'high' : perf.latestAccuracy < 80 ? 'medium' : 'low',
      detail:
        perf.latestAccuracy < 70
          ? `Latest accuracy of ${perf.latestAccuracy}% is below the ${subject.targetMastery}% mastery goal (+${accuracyPoints} priority weight).`
          : `Latest accuracy is ${perf.latestAccuracy}%, requiring lighter maintenance (+${accuracyPoints} priority weight).`,
    });
  }

  // Factor 2: Confidence Gap Detector
  if (perf && perf.latestConfidenceGap !== null && perf.latestConfidenceGap >= 15) {
    const gapPoints = Math.round(perf.latestConfidenceGap * 0.35);
    score += gapPoints;
    factors.push({
      factor: `Confidence Gap (+${perf.latestConfidenceGap} pts)`,
      impactWeight: perf.latestConfidenceGap >= 30 ? 'high' : 'medium',
      detail: `Reported confidence (${perf.latestConfidence}%) exceeded quiz accuracy (${perf.latestAccuracy}%) by ${perf.latestConfidenceGap} pts, signaling potential false mastery.`,
    });
  } else if (perf && perf.latestConfidenceGap !== null && perf.latestConfidenceGap <= -15) {
    factors.push({
      factor: `Underconfidence Signal (${perf.latestConfidenceGap} pts)`,
      impactWeight: 'low',
      detail: `Accuracy (${perf.latestAccuracy}%) outperformed confidence (${perf.latestConfidence}%), suggesting a short confidence-building review.`,
    });
  }

  // Factor 3: Exam Deadline Proximity (using closest of subject exam or selected target date)
  const subjectDays = daysUntilDate(subject.examDate);
  const targetDays = daysUntilDate(overrideExamDate);
  const effectiveDays = Math.min(subjectDays, targetDays);
  const urgencyPoints =
    effectiveDays <= 2 ? 32 : effectiveDays <= 5 ? 22 : effectiveDays <= 10 ? 12 : 5;
  score += urgencyPoints;

  factors.push({
    factor: `Exam Proximity (${effectiveDays}d left)`,
    impactWeight: effectiveDays <= 4 ? 'high' : effectiveDays <= 10 ? 'medium' : 'low',
    detail:
      effectiveDays <= 4
        ? `${subject.name} exam is ${effectiveDays === 0 ? 'today' : `in ${effectiveDays} day(s)`}, increasing priority (+${urgencyPoints} urgency weight).`
        : `${effectiveDays} days remain until target exam window (+${urgencyPoints} urgency weight).`,
  });

  // Factor 4: Wellness Energy & Intensity / Cramming Mode
  if (crammingMode) {
    score += 10;
    factors.push({
      factor: 'Cramming Mode Active',
      impactWeight: 'high',
      detail:
        'Focused on high-yield weak concepts and error correction within remaining preparation hours while preserving recovery breaks.',
    });
  }

  factors.push({
    factor: `Capacity Calibration (${energyLevel} energy / ${intensity})`,
    impactWeight: energyLevel === 'low' ? 'high' : 'low',
    detail:
      energyLevel === 'low'
        ? 'Session duration shortened with more frequent breaks to match low reported energy without burnout.'
        : `Block length calibrated to ${intensity} study intensity and ${energyLevel} energy.`,
  });

  return {
    topic,
    subject,
    performance: perf,
    priorityScore: Math.min(100, Math.round(score)),
    daysLeft: effectiveDays,
    explanationFactors: factors,
  };
}

/**
 * Generates an adaptive, wellness-aware, explainable study plan.
 */
export function generateAdaptiveStudyPlan(input: SchedulerInput): StudyPlan {
  const safeRequestedMinutes = Math.max(
    15,
    Math.min(MAX_SAFE_DAILY_STUDY_MINUTES, Math.round(input.availableMinutes))
  );

  // Energy & intensity determine block length, break cadence, and utilization ceiling
  let blockLength = input.preferredBlockMinutes ?? 35;
  let breakLength = input.breakMinutesPerBlock ?? 10;
  let utilizationRatio = 0.85;

  if (input.energyLevel === 'low') {
    blockLength = Math.min(blockLength, 25);
    breakLength = Math.max(breakLength, 10);
    utilizationRatio = 0.72;
  } else if (input.energyLevel === 'moderate') {
    blockLength = Math.min(Math.max(blockLength, 30), 40);
    breakLength = Math.max(breakLength, 10);
    utilizationRatio = input.intensity === 'focused' ? 0.85 : 0.8;
  } else {
    blockLength = input.intensity === 'focused' ? Math.min(Math.max(blockLength, 40), 50) : 35;
    breakLength = input.intensity === 'light' ? 12 : 8;
    utilizationRatio = input.intensity === 'focused' ? 0.88 : 0.82;
  }

  if (input.intensity === 'light') {
    blockLength = Math.min(blockLength, 25);
    utilizationRatio = Math.min(utilizationRatio, 0.72);
  }

  if (input.crammingMode) {
    // Cramming mode uses tighter high-yield blocks, never skipping rest breaks
    blockLength = input.energyLevel === 'low' ? 25 : 35;
    breakLength = Math.max(8, breakLength);
  }

  const subjectMap = new Map(input.subjects.map((s) => [s.id, s]));
  const perfMap = new Map(input.performances.map((p) => [p.topicId, p]));

  const candidates = input.topics
    .map((topic) => {
      const subject = subjectMap.get(topic.subjectId);
      if (!subject) return null;
      return scoreTopicPriority(
        topic,
        subject,
        perfMap.get(topic.id),
        input.targetExamDate,
        input.energyLevel,
        input.intensity,
        input.crammingMode
      );
    })
    .filter((c): c is ScoredTopicCandidate => c !== null)
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const tasks: StudyTask[] = [];
  const startHour = input.startHour ?? 9;
  let cursorMinutes = 0;
  let remainingBudget = safeRequestedMinutes;
  let allocatedStudyMinutes = 0;
  let allocatedBreakMinutes = 0;
  const maxProductiveMinutes = Math.round(safeRequestedMinutes * utilizationRatio);

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    if (remainingBudget < 20 || allocatedStudyMinutes >= maxProductiveMinutes) {
      break;
    }

    const desiredMinutes = Math.min(
      blockLength,
      remainingBudget,
      maxProductiveMinutes - allocatedStudyMinutes
    );

    if (desiredMinutes < 15) break;

    const needsQuizOrTeachBack =
      candidate.performance?.latestConfidenceGap !== null &&
      candidate.performance?.latestConfidenceGap !== undefined &&
      candidate.performance.latestConfidenceGap >= 25;

    const taskType: StudyTask['taskType'] = !candidate.performance?.attemptsCount
      ? 'quiz_review'
      : needsQuizOrTeachBack
      ? 'teach_back'
      : input.crammingMode
      ? 'quiz_review'
      : 'study';

    const actionVerb =
      taskType === 'teach_back'
        ? 'Teach-Back & Error Review'
        : taskType === 'quiz_review'
        ? 'Active Recall Practice'
        : 'Concept Review';

    tasks.push({
      id: `task-${candidate.topic.id}-${i}`,
      subjectId: candidate.subject.id,
      topicId: candidate.topic.id,
      title: `${candidate.topic.title} — ${actionVerb}`,
      description:
        taskType === 'teach_back'
          ? `Explain core ideas (${candidate.topic.keyConcepts.slice(0, 2).join(', ')}) in your own words to close the confidence gap.`
          : `Focus on ${candidate.topic.keyConcepts.slice(0, 3).join(', ')} for ${candidate.subject.name}.`,
      taskType,
      startTimeLabel: formatTimeFromOffset(startHour, cursorMinutes),
      durationMinutes: desiredMinutes,
      originalDurationMinutes: desiredMinutes,
      priorityScore: candidate.priorityScore,
      status: 'scheduled',
      explanationFactors: candidate.explanationFactors,
    });

    cursorMinutes += desiredMinutes;
    remainingBudget -= desiredMinutes;
    allocatedStudyMinutes += desiredMinutes;

    // Insert mandatory break if there is enough room for another session
    const hasMoreRoom =
      i < candidates.length - 1 &&
      remainingBudget >= breakLength + 15 &&
      allocatedStudyMinutes < maxProductiveMinutes;

    if (hasMoreRoom) {
      tasks.push({
        id: `task-break-${i}`,
        subjectId: candidate.subject.id,
        title: 'Rest & Cognitive Recovery Break',
        description:
          'Step away from the screen, hydrate, and let recently reviewed concepts consolidate.',
        taskType: 'break',
        startTimeLabel: formatTimeFromOffset(startHour, cursorMinutes),
        durationMinutes: breakLength,
        originalDurationMinutes: breakLength,
        priorityScore: 0,
        status: 'scheduled',
        explanationFactors: [
          {
            factor: 'Sustainable Pacing Guardrail',
            impactWeight: 'medium',
            detail: `Inserted ${breakLength}-minute break after ${desiredMinutes} minutes of study based on ${input.energyLevel} energy check-in.`,
          },
        ],
      });
      cursorMinutes += breakLength;
      remainingBudget -= breakLength;
      allocatedBreakMinutes += breakLength;
    }
  }

  const daysToTarget = daysUntilDate(input.targetExamDate);
  let advisoryNotice = '';

  if (input.availableMinutes > MAX_SAFE_DAILY_STUDY_MINUTES) {
    advisoryNotice = `Requested ${input.availableMinutes} minutes was capped at ${MAX_SAFE_DAILY_STUDY_MINUTES} minutes/day to protect rest, sleep, and retention quality.`;
  } else if (input.crammingMode) {
    advisoryNotice = `Cramming Mode active (${daysToTarget} day(s) to target date). Prioritizing highest-impact weak topics with mandatory breaks—consistent sleep remains essential for recall.`;
  } else if (input.energyLevel === 'low') {
    advisoryNotice =
      'Low-energy pacing active: shorter blocks and protected recovery breaks prevent cognitive overload.';
  } else {
    advisoryNotice = `Balanced ${allocatedStudyMinutes}-minute study plan with ${allocatedBreakMinutes} minutes of scheduled breaks.`;
  }

  return {
    id: `plan-${Date.now()}`,
    studentId: input.studentId,
    generatedAt: new Date().toISOString(),
    targetExamDate: input.targetExamDate,
    availableMinutes: safeRequestedMinutes,
    allocatedStudyMinutes,
    allocatedBreakMinutes,
    crammingMode: input.crammingMode,
    rescueApplied: false,
    energyLevelUsed: input.energyLevel,
    intensityUsed: input.intensity,
    advisoryNotice,
    tasks,
  };
}

/**
 * Innovation D — Study Rescue Mode.
 * Recovers gracefully from missed tasks and reduced remaining time without piling everything onto an overloaded schedule.
 */
export function applyStudyRescueMode(params: {
  currentPlan: StudyPlan;
  updatedRemainingMinutes: number;
  wellness?: WellnessCheckIn;
  startHour?: number;
}): {
  rescuedPlan: StudyPlan;
  summary: RescueSummaryItem[];
} {
  const { currentPlan, updatedRemainingMinutes, wellness } = params;
  const safeBudget = Math.max(
    15,
    Math.min(MAX_SAFE_DAILY_STUDY_MINUTES, Math.round(updatedRemainingMinutes))
  );

  const completedTasks = currentPlan.tasks.filter(
    (t) => t.status === 'completed' && t.taskType !== 'break'
  );
  const candidateStudyTasks = currentPlan.tasks
    .filter((t) => t.taskType !== 'break' && t.status !== 'completed')
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const energy = wellness?.energyLevel ?? currentPlan.energyLevelUsed;
  const minBlock = energy === 'low' ? 15 : 20;
  const breakBlock = energy === 'low' ? 10 : 8;

  const summary: RescueSummaryItem[] = completedTasks.map((t) => ({
    taskId: t.id,
    title: t.title,
    action: 'completed',
    reason: 'Already completed before schedule rescue.',
    newDurationMinutes: t.durationMinutes,
  }));

  const newTasks: StudyTask[] = [...completedTasks];
  let budgetLeft = safeBudget;
  const startHour = params.startHour ?? new Date().getHours();
  let cursorMinutes = 0;
  let allocatedStudyMinutes = 0;
  let allocatedBreakMinutes = 0;

  for (let i = 0; i < candidateStudyTasks.length; i++) {
    const task = candidateStudyTasks[i];
    const wasMissed = task.status === 'missed';

    if (budgetLeft < minBlock) {
      summary.push({
        taskId: task.id,
        title: task.title,
        action: 'deferred',
        reason: `Deferred to next study window: remaining ${safeBudget} min budget prioritized higher-urgency topics (priority ${task.priorityScore}).`,
        newDurationMinutes: 0,
      });
      newTasks.push({
        ...task,
        status: 'deferred',
        durationMinutes: 0,
        rescueNote: 'Deferred to tomorrow to prevent schedule overload.',
      });
      continue;
    }

    const desired = task.originalDurationMinutes || task.durationMinutes;
    const allocated = Math.min(desired, budgetLeft);
    const shortened = allocated < desired;

    const rescueFactor: ExplanationFactor = {
      factor: 'Study Rescue Rebalancing',
      impactWeight: 'high',
      detail: wasMissed
        ? `Recovered from missed status; kept due to priority score (${task.priorityScore}/100)${shortened ? ` and trimmed from ${desired}m to ${allocated}m to fit ${safeBudget}m budget.` : '.'}`
        : shortened
        ? `Shortened from ${desired}m to ${allocated}m so top priorities fit within ${safeBudget}m.`
        : `Retained at full ${allocated}m duration based on priority score (${task.priorityScore}/100).`,
    };

    newTasks.push({
      ...task,
      startTimeLabel: formatTimeFromOffset(startHour, cursorMinutes),
      durationMinutes: allocated,
      status: shortened ? 'shortened' : 'scheduled',
      rescueNote: shortened
        ? `Shortened from ${desired}m to ${allocated}m`
        : wasMissed
        ? 'Recovered into revised plan'
        : 'Retained in revised plan',
      explanationFactors: [
        rescueFactor,
        ...task.explanationFactors.filter(
          (f) => f.factor !== 'Study Rescue Rebalancing'
        ),
      ],
    });

    summary.push({
      taskId: task.id,
      title: task.title,
      action: shortened ? 'shortened' : 'retained',
      reason: rescueFactor.detail,
      newDurationMinutes: allocated,
    });

    cursorMinutes += allocated;
    budgetLeft -= allocated;
    allocatedStudyMinutes += allocated;

    const moreCandidatesFollow = i < candidateStudyTasks.length - 1;
    if (moreCandidatesFollow && budgetLeft >= breakBlock + minBlock) {
      newTasks.push({
        id: `rescue-break-${i}-${Date.now()}`,
        subjectId: task.subjectId,
        title: 'Recovery Break (Rescue Protected)',
        description: 'Short restorative pause preserved during schedule recovery.',
        taskType: 'break',
        startTimeLabel: formatTimeFromOffset(startHour, cursorMinutes),
        durationMinutes: breakBlock,
        originalDurationMinutes: breakBlock,
        priorityScore: 0,
        status: 'scheduled',
        explanationFactors: [
          {
            factor: 'Burnout Prevention',
            impactWeight: 'medium',
            detail: 'Breaks are retained even during Rescue Mode so compressed study remains effective.',
          },
        ],
      });
      cursorMinutes += breakBlock;
      budgetLeft -= breakBlock;
      allocatedBreakMinutes += breakBlock;
    }
  }

  const retainedCount = summary.filter((s) => s.action === 'retained').length;
  const shortenedCount = summary.filter((s) => s.action === 'shortened').length;
  const deferredCount = summary.filter((s) => s.action === 'deferred').length;

  const rescuedPlan: StudyPlan = {
    ...currentPlan,
    id: `plan-rescued-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    availableMinutes: safeBudget,
    allocatedStudyMinutes,
    allocatedBreakMinutes,
    rescueApplied: true,
    advisoryNotice: `Rescue Mode applied for ${safeBudget}m remaining: ${retainedCount} retained, ${shortenedCount} shortened, ${deferredCount} deferred to protect focus and rest.`,
    tasks: newTasks,
  };

  return { rescuedPlan, summary };
}

/**
 * Innovation E — Study Scenario Simulator.
 * Reuses `generateAdaptiveStudyPlan` directly without mutating the student's active plan.
 */
export function simulateStudyScenario(
  baseInput: SchedulerInput,
  scenarioInput: {
    name: string;
    availableMinutes: number;
    examDate: string;
    energyLevel: EnergyLevel;
    intensity: StudyIntensity;
    crammingMode: boolean;
  }
): {
  originalPlan: StudyPlan;
  scenario: StudyScenario;
  deltas: {
    studyMinutesDelta: number;
    breakMinutesDelta: number;
    tasksCountDelta: number;
    topPriorityTopic: string;
  };
} {
  const originalPlan = generateAdaptiveStudyPlan(baseInput);
  const simulatedPlan = generateAdaptiveStudyPlan({
    ...baseInput,
    availableMinutes: scenarioInput.availableMinutes,
    targetExamDate: scenarioInput.examDate,
    energyLevel: scenarioInput.energyLevel,
    intensity: scenarioInput.intensity,
    crammingMode: scenarioInput.crammingMode,
  });

  const originalStudyTasks = originalPlan.tasks.filter((t) => t.taskType !== 'break');
  const simStudyTasks = simulatedPlan.tasks.filter((t) => t.taskType !== 'break');

  return {
    originalPlan,
    scenario: {
      id: `scenario-${Date.now()}`,
      name: scenarioInput.name,
      availableMinutes: scenarioInput.availableMinutes,
      examDate: scenarioInput.examDate,
      energyLevel: scenarioInput.energyLevel,
      intensity: scenarioInput.intensity,
      crammingMode: scenarioInput.crammingMode,
      simulatedPlan,
    },
    deltas: {
      studyMinutesDelta:
        simulatedPlan.allocatedStudyMinutes - originalPlan.allocatedStudyMinutes,
      breakMinutesDelta:
        simulatedPlan.allocatedBreakMinutes - originalPlan.allocatedBreakMinutes,
      tasksCountDelta: simStudyTasks.length - originalStudyTasks.length,
      topPriorityTopic: simStudyTasks[0]?.title ?? 'No active study blocks',
    },
  };
}
