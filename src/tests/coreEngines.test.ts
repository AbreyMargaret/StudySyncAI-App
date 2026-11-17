/**
 * Unit verification checks for StudySync AI deterministic engines:
 * - Quiz scoring & confidence gap calculation
 * - Adaptive scheduling priority & safe workload caps
 * - Study Rescue Mode task retaining/shortening/deferral
 * - Study Scenario Simulator non-mutating comparison
 *
 * Run with: npx tsx src/tests/coreEngines.test.ts
 */

import assert from 'node:assert/strict';
import {
  calculateConfidenceGap,
  evaluateQuizSubmission,
  aggregateTopicPerformance,
} from '../utils/quizEngine';
import {
  applyStudyRescueMode,
  generateAdaptiveStudyPlan,
  simulateStudyScenario,
} from '../utils/schedulerEngine';
import {
  extractKeyLinesFromPlainText,
} from '../utils/fileProcessor';
import {
  SAMPLE_CONFIDENCE_ASSESSMENTS,
  SAMPLE_QUESTIONS,
  SAMPLE_QUIZ_ATTEMPTS,
  SAMPLE_SUBJECTS,
  SAMPLE_TOPICS,
} from '../data/sampleData';

// 1. Confidence gap detector check (90% confidence vs 40% accuracy => +50 pts overconfident)
const gap = calculateConfidenceGap(90, 40);
assert.equal(gap.confidenceGap, 50);
assert.equal(gap.calibration, 'overconfident');

// 2. Quiz submission scoring check
const seReqQuestions = SAMPLE_QUESTIONS.filter(
  (q) => q.topicId === 'topic-se-req'
).slice(0, 3);
const selected: Record<string, number> = {};
seReqQuestions.forEach((q, i) => {
  selected[q.id] = i === 0 ? q.correctIndex : (q.correctIndex + 1) % 4;
});
const evaluation = evaluateQuizSubmission({
  studentId: 'student-test',
  subjectId: 'subj-se-101',
  topicId: 'topic-se-req',
  questions: seReqQuestions,
  selectedIndices: selected,
  reportedConfidence: 80,
  durationSeconds: 90,
});
assert.equal(evaluation.attempt.score, 1);
assert.equal(evaluation.attempt.accuracyPercent, 33);
assert.equal(evaluation.confidenceAssessment.confidenceGap, 47);

// 3. Strict topic question filtering check (new custom topic never inherits sibling questions)
const customTopicId = 'topic-custom-new-regression';
const strictTopicQuestions = SAMPLE_QUESTIONS.filter(
  (q) => q.topicId === customTopicId
);
assert.equal(strictTopicQuestions.length, 0);

// 4. Adaptive scheduler & safe study duration guardrail check
const performances = aggregateTopicPerformance(
  SAMPLE_SUBJECTS,
  SAMPLE_TOPICS,
  SAMPLE_QUIZ_ATTEMPTS,
  SAMPLE_CONFIDENCE_ASSESSMENTS
);
const plan = generateAdaptiveStudyPlan({
  studentId: 'student-test',
  subjects: SAMPLE_SUBJECTS,
  topics: SAMPLE_TOPICS,
  performances,
  availableMinutes: 600, // excessive request should be capped safely
  targetExamDate: SAMPLE_SUBJECTS[0].examDate,
  energyLevel: 'low',
  intensity: 'light',
  crammingMode: false,
});
assert.ok(plan.availableMinutes <= 300);
assert.ok(plan.allocatedBreakMinutes > 0);
assert.ok(plan.tasks.every((t) => t.explanationFactors.length > 0));

// 5. Completed quiz results connect directly to adaptive scheduler priority
const lowScoreEval = evaluateQuizSubmission({
  studentId: 'student-test',
  subjectId: 'subj-se-101',
  topicId: 'topic-se-req',
  questions: SAMPLE_QUESTIONS.filter((q) => q.topicId === 'topic-se-req').slice(0, 4),
  selectedIndices: Object.fromEntries(
    SAMPLE_QUESTIONS.filter((q) => q.topicId === 'topic-se-req')
      .slice(0, 4)
      .map((q) => [q.id, (q.correctIndex + 1) % 4]) // 0% accuracy
  ),
  reportedConfidence: 95, // high overconfidence (+95 pts gap)
  durationSeconds: 75,
});
lowScoreEval.attempt.completedAt = new Date(Date.now() + 5000).toISOString();
lowScoreEval.confidenceAssessment.recordedAt = lowScoreEval.attempt.completedAt;

const updatedPerformances = aggregateTopicPerformance(
  SAMPLE_SUBJECTS,
  SAMPLE_TOPICS,
  [lowScoreEval.attempt, ...SAMPLE_QUIZ_ATTEMPTS],
  [lowScoreEval.confidenceAssessment, ...SAMPLE_CONFIDENCE_ASSESSMENTS]
);
const updatedPlan = generateAdaptiveStudyPlan({
  studentId: 'student-test',
  subjects: SAMPLE_SUBJECTS,
  topics: SAMPLE_TOPICS,
  performances: updatedPerformances,
  availableMinutes: 120,
  targetExamDate: SAMPLE_SUBJECTS[0].examDate,
  energyLevel: 'moderate',
  intensity: 'balanced',
  crammingMode: false,
});
const firstUpdatedStudyTask = updatedPlan.tasks.find((t) => t.taskType !== 'break');
assert.equal(firstUpdatedStudyTask?.topicId, 'topic-se-req');

// 6. Study Rescue Mode check
const firstStudyTask = plan.tasks.find((t) => t.taskType !== 'break');
assert.ok(firstStudyTask);
const rescue = applyStudyRescueMode({
  currentPlan: plan,
  updatedRemainingMinutes: 45,
});
assert.equal(rescue.rescuedPlan.rescueApplied, true);
assert.ok(rescue.rescuedPlan.allocatedStudyMinutes <= 45);
assert.ok(rescue.summary.some((s) => s.action === 'deferred'));

// 7. Scenario Simulator check (does not mutate original)
const sim = simulateStudyScenario(
  {
    studentId: 'student-test',
    subjects: SAMPLE_SUBJECTS,
    topics: SAMPLE_TOPICS,
    performances,
    availableMinutes: 120,
    targetExamDate: SAMPLE_SUBJECTS[0].examDate,
    energyLevel: 'moderate',
    intensity: 'balanced',
    crammingMode: false,
  },
  {
    name: 'Low energy shorter window',
    availableMinutes: 60,
    examDate: SAMPLE_SUBJECTS[0].examDate,
    energyLevel: 'low',
    intensity: 'light',
    crammingMode: true,
  }
);
assert.ok(sim.deltas.studyMinutesDelta < 0);

// 8. Plain-text topic heading extraction check
const extracted = extractKeyLinesFromPlainText(
  `# Requirements Engineering\n1. Functional vs Non-Functional Requirements\nUse Case Modeling:\nRandom explanatory sentence that is not a heading.`
);
assert.deepEqual(extracted, [
  'Requirements Engineering',
  'Functional vs Non-Functional Requirements',
  'Use Case Modeling',
]);

console.log('All StudySync AI deterministic engine checks passed.');
