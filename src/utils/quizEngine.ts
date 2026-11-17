import {
  ConfidenceAssessment,
  ConfidenceCalibration,
  QuizAnswerRecord,
  QuizAttempt,
  QuizQuestion,
  Subject,
  Topic,
  TopicPerformance,
} from '../types/studysync';

/**
 * Actual TypeScript logic for confidence gap calibration.
 * Note: Confidence ratings are treated strictly as self-reflective study signals,
 * never as clinical or definitive measurements of student ability.
 */
export function calculateConfidenceGap(
  reportedConfidence: number,
  actualAccuracy: number
): {
  confidenceGap: number;
  calibration: ConfidenceCalibration;
  interpretation: string;
} {
  const clampedConfidence = Math.max(0, Math.min(100, Math.round(reportedConfidence)));
  const clampedAccuracy = Math.max(0, Math.min(100, Math.round(actualAccuracy)));
  const confidenceGap = clampedConfidence - clampedAccuracy;

  if (confidenceGap >= 15) {
    return {
      confidenceGap,
      calibration: 'overconfident',
      interpretation: `Self-reported confidence (${clampedConfidence}%) was +${confidenceGap} percentage points above quiz accuracy (${clampedAccuracy}%). This suggests you may understand certain concepts less thoroughly than expected—prioritizing active recall on missed items is recommended.`,
    };
  }

  if (confidenceGap <= -15) {
    return {
      confidenceGap,
      calibration: 'underconfident',
      interpretation: `Quiz accuracy (${clampedAccuracy}%) exceeded self-reported confidence (${clampedConfidence}%) by ${Math.abs(confidenceGap)} percentage points. You appear to grasp more of this topic than your initial estimate suggested.`,
    };
  }

  return {
    confidenceGap,
    calibration: 'well_calibrated',
    interpretation: `Self-reported confidence (${clampedConfidence}%) and quiz accuracy (${clampedAccuracy}%) are aligned within ${Math.abs(confidenceGap)} percentage points, indicating realistic self-assessment on this set.`,
  };
}

/**
 * Evaluates a completed quiz submission and generates both QuizAttempt and ConfidenceAssessment records.
 */
export function evaluateQuizSubmission(params: {
  studentId: string;
  subjectId: string;
  topicId: string;
  questions: QuizQuestion[];
  selectedIndices: Record<string, number>;
  reportedConfidence: number;
  durationSeconds: number;
}): {
  attempt: QuizAttempt;
  confidenceAssessment: ConfidenceAssessment;
} {
  const {
    studentId,
    subjectId,
    topicId,
    questions,
    selectedIndices,
    reportedConfidence,
    durationSeconds,
  } = params;

  const answers: QuizAnswerRecord[] = questions.map((q) => {
    const selectedIndex =
      typeof selectedIndices[q.id] === 'number' ? selectedIndices[q.id] : -1;
    return {
      questionId: q.id,
      selectedIndex,
      isCorrect: selectedIndex === q.correctIndex,
    };
  });

  const score = answers.filter((a) => a.isCorrect).length;
  const totalQuestions = questions.length;
  const accuracyPercent =
    totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  const now = new Date().toISOString();
  const confidenceId = `conf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const gapResult = calculateConfidenceGap(reportedConfidence, accuracyPercent);

  const confidenceAssessment: ConfidenceAssessment = {
    id: confidenceId,
    subjectId,
    topicId,
    reportedConfidence: Math.round(reportedConfidence),
    actualAccuracy: accuracyPercent,
    confidenceGap: gapResult.confidenceGap,
    calibration: gapResult.calibration,
    interpretation: gapResult.interpretation,
    recordedAt: now,
  };

  const attempt: QuizAttempt = {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    studentId,
    subjectId,
    topicId,
    questionIds: questions.map((q) => q.id),
    answers,
    score,
    totalQuestions,
    accuracyPercent,
    reportedConfidence: Math.round(reportedConfidence),
    confidenceAssessmentId: confidenceId,
    completedAt: now,
    durationSeconds: Math.max(1, Math.round(durationSeconds)),
  };

  return { attempt, confidenceAssessment };
}

/**
 * Aggregates topic-level performance and review recommendations across quiz history and confidence records.
 */
export function aggregateTopicPerformance(
  subjects: Subject[],
  topics: Topic[],
  attempts: QuizAttempt[],
  confidenceAssessments: ConfidenceAssessment[]
): TopicPerformance[] {
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  return topics.map((topic) => {
    const subject = subjectMap.get(topic.subjectId);
    const topicAttempts = attempts
      .filter((a) => a.topicId === topic.id)
      .sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );

    const latestAttempt = topicAttempts[0] ?? null;
    const latestConf = latestAttempt
      ? confidenceAssessments.find(
          (c) => c.id === latestAttempt.confidenceAssessmentId
        ) ??
        confidenceAssessments
          .filter((c) => c.topicId === topic.id)
          .sort(
            (a, b) =>
              new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
          )[0] ??
        null
      : null;

    const averageAccuracy =
      topicAttempts.length > 0
        ? Math.round(
            topicAttempts.reduce((sum, a) => sum + a.accuracyPercent, 0) /
              topicAttempts.length
          )
        : null;

    const latestAccuracy = latestAttempt ? latestAttempt.accuracyPercent : null;
    const latestConfidence = latestConf ? latestConf.reportedConfidence : null;
    const latestConfidenceGap = latestConf ? latestConf.confidenceGap : null;
    const calibration = latestConf ? latestConf.calibration : null;

    let needsReview = false;
    let reviewReason = 'On track';

    if (topicAttempts.length === 0) {
      needsReview = true;
      reviewReason = 'Not yet assessed — diagnostic quiz recommended';
    } else if (latestAccuracy !== null && latestAccuracy < 70) {
      needsReview = true;
      if (latestConfidenceGap !== null && latestConfidenceGap >= 15) {
        reviewReason = `Low accuracy (${latestAccuracy}%) paired with +${latestConfidenceGap} pt confidence gap`;
      } else {
        reviewReason = `Latest accuracy (${latestAccuracy}%) is below 70% target`;
      }
    } else if (latestConfidenceGap !== null && latestConfidenceGap >= 20) {
      needsReview = true;
      reviewReason = `Confidence gap of +${latestConfidenceGap} pts warrants reinforcement`;
    } else if (subject && latestAccuracy !== null && latestAccuracy < subject.targetMastery) {
      needsReview = true;
      reviewReason = `Below ${subject.name} target mastery (${subject.targetMastery}%)`;
    }

    return {
      topicId: topic.id,
      subjectId: topic.subjectId,
      topicTitle: topic.title,
      subjectName: subject?.name ?? 'Unknown Subject',
      attemptsCount: topicAttempts.length,
      latestAccuracy,
      averageAccuracy,
      latestConfidence,
      latestConfidenceGap,
      calibration,
      needsReview,
      reviewReason,
      lastStudiedAt: latestAttempt ? latestAttempt.completedAt : null,
    };
  });
}
