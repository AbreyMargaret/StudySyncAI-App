import {
  ConfidenceAssessment,
  LearningMaterial,
  QuizAttempt,
  QuizQuestion,
  Student,
  StudyPlan,
  Subject,
  TeachBackSubmission,
  Topic,
  WellnessCheckIn,
} from '../types/studysync';
import {
  DEMO_STUDENT,
  SAMPLE_CONFIDENCE_ASSESSMENTS,
  SAMPLE_MATERIALS,
  SAMPLE_QUIZ_ATTEMPTS,
  SAMPLE_SUBJECTS,
  SAMPLE_TOPICS,
  SAMPLE_WELLNESS_CHECKIN,
} from '../data/sampleData';

const STORAGE_KEY = 'studysync_ai_workspace_v1';

export interface PersistedWorkspaceState {
  version: number;
  student: Student;
  subjects: Subject[];
  topics: Topic[];
  materials: LearningMaterial[];
  generatedQuestions: QuizQuestion[];
  quizAttempts: QuizAttempt[];
  confidenceAssessments: ConfidenceAssessment[];
  wellnessHistory: WellnessCheckIn[];
  activeStudyPlan: StudyPlan | null;
  teachBackHistory: TeachBackSubmission[];
  theme: 'dark' | 'light';
}

export function createDemoWorkspaceState(
  theme: 'dark' | 'light' = 'dark'
): PersistedWorkspaceState {
  return {
    version: 1,
    student: DEMO_STUDENT,
    subjects: SAMPLE_SUBJECTS,
    topics: SAMPLE_TOPICS,
    materials: SAMPLE_MATERIALS,
    generatedQuestions: [],
    quizAttempts: SAMPLE_QUIZ_ATTEMPTS,
    confidenceAssessments: SAMPLE_CONFIDENCE_ASSESSMENTS,
    wellnessHistory: [SAMPLE_WELLNESS_CHECKIN],
    activeStudyPlan: null,
    teachBackHistory: [],
    theme,
  };
}

/**
 * Loads workspace state from localStorage with defensive validation
 * so corrupted or partial browser data gracefully recovers to demo defaults.
 */
export function loadWorkspaceState(): PersistedWorkspaceState {
  const fallback = createDemoWorkspaceState('dark');
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedWorkspaceState>;
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) {
      return fallback;
    }

    return {
      version: 1,
      student:
        parsed.student && typeof parsed.student.displayName === 'string'
          ? parsed.student
          : fallback.student,
      subjects: Array.isArray(parsed.subjects)
        ? parsed.subjects
        : fallback.subjects,
      topics: Array.isArray(parsed.topics) ? parsed.topics : fallback.topics,
      materials: Array.isArray(parsed.materials)
        ? parsed.materials
        : fallback.materials,
      generatedQuestions: Array.isArray(parsed.generatedQuestions)
        ? parsed.generatedQuestions
        : [],
      quizAttempts: Array.isArray(parsed.quizAttempts)
        ? parsed.quizAttempts
        : fallback.quizAttempts,
      confidenceAssessments: Array.isArray(parsed.confidenceAssessments)
        ? parsed.confidenceAssessments
        : fallback.confidenceAssessments,
      wellnessHistory: Array.isArray(parsed.wellnessHistory)
        ? parsed.wellnessHistory
        : fallback.wellnessHistory,
      activeStudyPlan:
        parsed.activeStudyPlan && Array.isArray(parsed.activeStudyPlan.tasks)
          ? parsed.activeStudyPlan
          : null,
      teachBackHistory: Array.isArray(parsed.teachBackHistory)
        ? parsed.teachBackHistory
        : [],
      theme: parsed.theme === 'light' ? 'light' : 'dark',
    };
  } catch {
    return fallback;
  }
}

export function saveWorkspaceState(state: PersistedWorkspaceState): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function resetWorkspaceToDemo(
  theme: 'dark' | 'light' = 'dark'
): PersistedWorkspaceState {
  const fresh = createDemoWorkspaceState(theme);
  saveWorkspaceState(fresh);
  return fresh;
}
