/**
 * Core domain types for StudySync AI.
 * Designed for shared use across React state, browser storage,
 * and future Cloudflare Workers + Hono + D1 + R2 API contracts.
 */

export type NavigationSection =
  | 'dashboard'
  | 'library'
  | 'quizzes'
  | 'analytics'
  | 'planner'
  | 'wellness';

export type MaterialFormat = 'pdf' | 'txt' | 'docx' | 'pptx' | 'mp3' | 'mp4';

export type MaterialProcessingStatus =
  | 'parsed_client'
  | 'awaiting_backend_ai'
  | 'ai_processed'
  | 'error';

export type EnergyLevel = 'low' | 'moderate' | 'high';
export type StudyIntensity = 'light' | 'balanced' | 'focused';

export type ConfidenceCalibration =
  | 'overconfident'
  | 'well_calibrated'
  | 'underconfident';

export type StudyTaskStatus =
  | 'scheduled'
  | 'completed'
  | 'missed'
  | 'shortened'
  | 'deferred';

export type StudyTaskType = 'study' | 'quiz_review' | 'teach_back' | 'break';

export interface Student {
  id: string;
  displayName: string;
  program: string;
  isDemoUser: boolean;
  dailyStudyGoalMinutes: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  examDate: string; // ISO date YYYY-MM-DD
  targetMastery: number; // 0-100
  createdAt: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  title: string;
  summary: string;
  keyConcepts: string[];
  difficulty: 'introductory' | 'intermediate' | 'advanced';
  estimatedStudyMinutes: number;
}

export interface LearningMaterial {
  id: string;
  subjectId: string;
  topicId?: string;
  fileName: string;
  format: MaterialFormat;
  fileSizeBytes: number;
  uploadedAt: string;
  processingStatus: MaterialProcessingStatus;
  processingNote: string;
  extractedText?: string;
  extractedTopics: string[];
  mediaDurationSeconds?: number;
  isSampleData: boolean;
  /** Future Cloudflare R2 object key */
  r2ObjectKey?: string;
}

export interface QuizQuestion {
  id: string;
  subjectId: string;
  topicId: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  origin?: 'sample' | 'gemini_generated';
  sourceMaterialId?: string;
}

export interface QuizGenerationResult {
  mode: 'live_gemini' | 'unavailable';
  modelLabel: string;
  statusMessage: string;
  questions: QuizQuestion[];
}

export interface QuizAnswerRecord {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
}

export interface ConfidenceAssessment {
  id: string;
  subjectId: string;
  topicId: string;
  reportedConfidence: number; // 0-100
  actualAccuracy: number; // 0-100
  confidenceGap: number; // reportedConfidence - actualAccuracy (percentage points)
  calibration: ConfidenceCalibration;
  interpretation: string;
  recordedAt: string;
}

export interface QuizAttempt {
  id: string;
  studentId: string;
  subjectId: string;
  topicId: string;
  questionIds: string[];
  answers: QuizAnswerRecord[];
  score: number;
  totalQuestions: number;
  accuracyPercent: number;
  reportedConfidence: number;
  confidenceAssessmentId: string;
  completedAt: string;
  durationSeconds: number;
}

export interface TopicPerformance {
  topicId: string;
  subjectId: string;
  topicTitle: string;
  subjectName: string;
  attemptsCount: number;
  latestAccuracy: number | null;
  averageAccuracy: number | null;
  latestConfidence: number | null;
  latestConfidenceGap: number | null;
  calibration: ConfidenceCalibration | null;
  needsReview: boolean;
  reviewReason: string;
  lastStudiedAt: string | null;
}

export interface WellnessCheckIn {
  id: string;
  studentId: string;
  energyLevel: EnergyLevel;
  preferredIntensity: StudyIntensity;
  availableMinutesToday: number;
  preferredBlockMinutes: number;
  breakMinutesPerBlock: number;
  notes: string;
  recordedAt: string;
  isOptionalSkipped?: boolean;
}

export interface ExplanationFactor {
  factor: string;
  impactWeight: 'high' | 'medium' | 'low';
  detail: string;
}

export interface StudyTask {
  id: string;
  subjectId: string;
  topicId?: string;
  title: string;
  description: string;
  taskType: StudyTaskType;
  startTimeLabel: string; // e.g., "09:00"
  durationMinutes: number;
  originalDurationMinutes: number;
  priorityScore: number;
  status: StudyTaskStatus;
  explanationFactors: ExplanationFactor[];
  rescueNote?: string;
}

export interface StudyPlan {
  id: string;
  studentId: string;
  generatedAt: string;
  targetExamDate: string;
  availableMinutes: number;
  allocatedStudyMinutes: number;
  allocatedBreakMinutes: number;
  crammingMode: boolean;
  rescueApplied: boolean;
  energyLevelUsed: EnergyLevel;
  intensityUsed: StudyIntensity;
  advisoryNotice: string;
  tasks: StudyTask[];
}

export interface StudyScenario {
  id: string;
  name: string;
  availableMinutes: number;
  examDate: string;
  energyLevel: EnergyLevel;
  intensity: StudyIntensity;
  crammingMode: boolean;
  simulatedPlan: StudyPlan;
}

export interface TeachBackSubmission {
  id: string;
  subjectId: string;
  topicId: string;
  promptQuestion: string;
  studentExplanation: string;
  submittedAt: string;
  result: AIProcessingResult;
}

export interface AIProcessingResult {
  mode: 'live_gemini' | 'demonstration';
  modelLabel: string;
  statusMessage: string;
  strengths: string[];
  missingConcepts: string[];
  suggestedImprovements: string[];
  groundedMaterialTitle?: string;
  clarityScoreNote: string;
}

export interface RescueSummaryItem {
  taskId: string;
  title: string;
  action: 'retained' | 'shortened' | 'deferred' | 'completed';
  reason: string;
  newDurationMinutes: number;
}
