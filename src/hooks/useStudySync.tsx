import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ConfidenceAssessment,
  LearningMaterial,
  NavigationSection,
  QuizAttempt,
  QuizQuestion,
  Student,
  StudyPlan,
  StudyTaskStatus,
  Subject,
  TeachBackSubmission,
  Topic,
  TopicPerformance,
  WellnessCheckIn,
} from '../types/studysync';
import { SAMPLE_QUESTIONS } from '../data/sampleData';
import {
  loadWorkspaceState,
  PersistedWorkspaceState,
  resetWorkspaceToDemo,
  saveWorkspaceState,
} from '../services/storageService';
import {
  aggregateTopicPerformance,
  evaluateQuizSubmission,
} from '../utils/quizEngine';
import {
  BackendHealthStatus,
  fetchBackendHealth,
} from '../services/apiClient';
import {
  generateAdaptiveStudyPlan,
  SchedulerInput,
} from '../utils/schedulerEngine';

export type PlannerFocusMode = 'schedule' | 'rescue' | 'simulator';
export type QuizFocusMode = 'quiz' | 'teach_back';

interface StudySyncContextValue {
  state: PersistedWorkspaceState;
  activeSection: NavigationSection;
  setActiveSection: (section: NavigationSection) => void;
  selectedSubjectId: string;
  setSelectedSubjectId: (id: string) => void;
  selectedTopicId: string;
  setSelectedTopicId: (id: string) => void;
  plannerFocusMode: PlannerFocusMode;
  setPlannerFocusMode: (mode: PlannerFocusMode) => void;
  quizFocusMode: QuizFocusMode;
  setQuizFocusMode: (mode: QuizFocusMode) => void;
  crammingModePreferred: boolean;
  setCrammingModePreferred: (enabled: boolean) => void;
  backendHealth: BackendHealthStatus;
  topicPerformances: TopicPerformance[];
  latestWellness: WellnessCheckIn | undefined;
  questionsBank: QuizQuestion[];
  storageQuotaWarning: boolean;

  // Cross-module actions
  navigateToQuizForTopic: (subjectId: string, topicId: string, mode?: QuizFocusMode) => void;
  navigateToPlannerMode: (mode: PlannerFocusMode, enableCramming?: boolean) => void;
  toggleTheme: () => void;
  resetDemoWorkspace: () => void;

  // Library CRUD
  addSubject: (input: {
    name: string;
    code: string;
    description: string;
    examDate: string;
    targetMastery: number;
  }) => Subject;
  updateSubject: (subject: Subject) => void;
  removeSubject: (subjectId: string) => void;
  addTopic: (input: {
    subjectId: string;
    title: string;
    summary: string;
    keyConcepts: string[];
    difficulty: Topic['difficulty'];
    estimatedStudyMinutes: number;
  }) => Topic;
  promoteExtractedTopics: (subjectId: string, titles: string[]) => Topic[];
  addMaterial: (material: LearningMaterial) => void;
  updateMaterial: (material: LearningMaterial) => void;
  removeMaterial: (materialId: string) => void;

  // Quiz & Teach-Back
  addGeneratedQuestions: (questions: QuizQuestion[]) => void;
  submitQuizAttempt: (params: {
    subjectId: string;
    topicId: string;
    questions: QuizQuestion[];
    selectedIndices: Record<string, number>;
    reportedConfidence: number;
    durationSeconds: number;
  }) => { attempt: QuizAttempt; confidenceAssessment: ConfidenceAssessment };
  addTeachBackSubmission: (submission: TeachBackSubmission) => void;

  // Planner & Wellness
  saveWellnessCheckIn: (
    checkIn: Omit<WellnessCheckIn, 'id' | 'studentId' | 'recordedAt'>
  ) => WellnessCheckIn;
  setActiveStudyPlan: (plan: StudyPlan) => void;
  refreshStudyPlanFromPerformance: () => StudyPlan | null;
  updateStudyTaskStatus: (taskId: string, status: StudyTaskStatus) => void;
  buildBaseSchedulerInput: (overrides?: Partial<SchedulerInput>) => SchedulerInput;
}

const StudySyncContext = createContext<StudySyncContextValue | null>(null);

export function StudySyncProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedWorkspaceState>(() =>
    loadWorkspaceState()
  );
  const [activeSection, setActiveSection] =
    useState<NavigationSection>('dashboard');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    () => state.subjects[0]?.id ?? ''
  );
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    () => state.topics[0]?.id ?? ''
  );
  const [plannerFocusMode, setPlannerFocusMode] =
    useState<PlannerFocusMode>('schedule');
  const [quizFocusMode, setQuizFocusMode] = useState<QuizFocusMode>('quiz');
  const [crammingModePreferred, setCrammingModePreferred] = useState(false);
  const [backendHealth, setBackendHealth] = useState<BackendHealthStatus>({
    status: 'offline',
    aiConnected: false,
    runtime: 'checking',
  });

  const [storageQuotaWarning, setStorageQuotaWarning] = useState(false);

  // Sync HTML dark class with state.theme
  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state.theme]);

  // Persist state on change
  useEffect(() => {
    const saved = saveWorkspaceState(state);
    setStorageQuotaWarning(!saved);
  }, [state]);

  // Probe backend health on mount
  useEffect(() => {
    let mounted = true;
    fetchBackendHealth().then((health) => {
      if (mounted) setBackendHealth(health);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const topicPerformances = useMemo(
    () =>
      aggregateTopicPerformance(
        state.subjects,
        state.topics,
        state.quizAttempts,
        state.confidenceAssessments
      ),
    [
      state.subjects,
      state.topics,
      state.quizAttempts,
      state.confidenceAssessments,
    ]
  );

  const latestWellness = useMemo(() => {
    if (state.wellnessHistory.length === 0) return undefined;
    return state.wellnessHistory[0];
  }, [state.wellnessHistory]);

  // Generate an initial plan automatically on first load if none saved yet
  useEffect(() => {
    if (!state.activeStudyPlan && state.subjects.length > 0 && state.topics.length > 0) {
      const soonestExam = [...state.subjects].sort((a, b) =>
        a.examDate.localeCompare(b.examDate)
      )[0]?.examDate;

      const initialPlan = generateAdaptiveStudyPlan({
        studentId: state.student.id,
        subjects: state.subjects,
        topics: state.topics,
        performances: topicPerformances,
        availableMinutes: latestWellness?.availableMinutesToday ?? 120,
        targetExamDate: soonestExam ?? new Date().toISOString().split('T')[0],
        energyLevel: latestWellness?.energyLevel ?? 'moderate',
        intensity: latestWellness?.preferredIntensity ?? 'balanced',
        crammingMode: false,
        preferredBlockMinutes: latestWellness?.preferredBlockMinutes ?? 35,
        breakMinutesPerBlock: latestWellness?.breakMinutesPerBlock ?? 10,
      });

      setState((prev) =>
        prev.activeStudyPlan ? prev : { ...prev, activeStudyPlan: initialPlan }
      );
    }
  }, [
    state.activeStudyPlan,
    state.subjects,
    state.topics,
    state.student.id,
    topicPerformances,
    latestWellness,
  ]);

  const toggleTheme = useCallback(() => {
    setState((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  }, []);

  const resetDemoWorkspace = useCallback(() => {
    const fresh = resetWorkspaceToDemo(state.theme);
    setState(fresh);
    setSelectedSubjectId(fresh.subjects[0]?.id ?? '');
    setSelectedTopicId(fresh.topics[0]?.id ?? '');
    setPlannerFocusMode('schedule');
    setQuizFocusMode('quiz');
    setCrammingModePreferred(false);
  }, [state.theme]);

  const navigateToQuizForTopic = useCallback(
    (subjectId: string, topicId: string, mode: QuizFocusMode = 'quiz') => {
      setSelectedSubjectId(subjectId);
      setSelectedTopicId(topicId);
      setQuizFocusMode(mode);
      setActiveSection('quizzes');
    },
    []
  );

  const navigateToPlannerMode = useCallback(
    (mode: PlannerFocusMode, enableCramming = false) => {
      setPlannerFocusMode(mode);
      if (enableCramming) {
        setCrammingModePreferred(true);
      }
      setActiveSection('planner');
    },
    []
  );

  const addSubject = useCallback(
    (input: {
      name: string;
      code: string;
      description: string;
      examDate: string;
      targetMastery: number;
    }) => {
      const created: Subject = {
        id: `subj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: input.name.trim(),
        code: input.code.trim() || 'STEM',
        description: input.description.trim(),
        examDate: input.examDate,
        targetMastery: Math.max(50, Math.min(100, input.targetMastery)),
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        subjects: [...prev.subjects, created],
      }));
      setSelectedSubjectId(created.id);
      return created;
    },
    []
  );

  const updateSubject = useCallback((updated: Subject) => {
    setState((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s) => (s.id === updated.id ? updated : s)),
    }));
  }, []);

  const removeSubject = useCallback((subjectId: string) => {
    setState((prev) => {
      const remainingSubjects = prev.subjects.filter((s) => s.id !== subjectId);
      const remainingTopics = prev.topics.filter((t) => t.subjectId !== subjectId);
      const remainingMaterials = prev.materials.filter(
        (m) => m.subjectId !== subjectId
      );
      return {
        ...prev,
        subjects: remainingSubjects,
        topics: remainingTopics,
        materials: remainingMaterials,
      };
    });
  }, []);

  const addTopic = useCallback(
    (input: {
      subjectId: string;
      title: string;
      summary: string;
      keyConcepts: string[];
      difficulty: Topic['difficulty'];
      estimatedStudyMinutes: number;
    }) => {
      const created: Topic = {
        id: `topic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        subjectId: input.subjectId,
        title: input.title.trim(),
        summary: input.summary.trim(),
        keyConcepts:
          input.keyConcepts.length > 0
            ? input.keyConcepts
            : [input.title.trim()],
        difficulty: input.difficulty,
        estimatedStudyMinutes: Math.max(15, input.estimatedStudyMinutes),
      };
      setState((prev) => ({
        ...prev,
        topics: [...prev.topics, created],
      }));
      setSelectedTopicId(created.id);
      return created;
    },
    []
  );

  const promoteExtractedTopics = useCallback(
    (subjectId: string, titles: string[]) => {
      const existingLower = new Set(
        state.topics
          .filter((t) => t.subjectId === subjectId)
          .map((t) => t.title.trim().toLowerCase())
      );

      const createdTopics: Topic[] = [];
      titles.forEach((rawTitle, idx) => {
        const clean = rawTitle.trim();
        if (!clean || existingLower.has(clean.toLowerCase())) return;
        existingLower.add(clean.toLowerCase());
        createdTopics.push({
          id: `topic-ext-${Date.now()}-${idx}-${Math.random()
            .toString(36)
            .slice(2, 5)}`,
          subjectId,
          title: clean,
          summary: `Study topic extracted from uploaded material: ${clean}.`,
          keyConcepts: [clean],
          difficulty: 'intermediate',
          estimatedStudyMinutes: 35,
        });
      });

      if (createdTopics.length > 0) {
        setState((prev) => ({
          ...prev,
          topics: [...prev.topics, ...createdTopics],
        }));
        setSelectedTopicId(createdTopics[0].id);
      }
      return createdTopics;
    },
    [state.topics]
  );

  const addMaterial = useCallback((material: LearningMaterial) => {
    setState((prev) => ({
      ...prev,
      materials: [material, ...prev.materials],
    }));
  }, []);

  const updateMaterial = useCallback((updated: LearningMaterial) => {
    setState((prev) => ({
      ...prev,
      materials: prev.materials.map((m) => (m.id === updated.id ? updated : m)),
    }));
  }, []);

  const removeMaterial = useCallback((materialId: string) => {
    setState((prev) => ({
      ...prev,
      materials: prev.materials.filter((m) => m.id !== materialId),
    }));
  }, []);

  const addGeneratedQuestions = useCallback((questions: QuizQuestion[]) => {
    if (questions.length === 0) return;
    setState((prev) => ({
      ...prev,
      generatedQuestions: [...questions, ...prev.generatedQuestions],
    }));
  }, []);

  const submitQuizAttempt = useCallback(
    (params: {
      subjectId: string;
      topicId: string;
      questions: QuizQuestion[];
      selectedIndices: Record<string, number>;
      reportedConfidence: number;
      durationSeconds: number;
    }) => {
      const evaluation = evaluateQuizSubmission({
        studentId: state.student.id,
        ...params,
      });

      setState((prev) => {
        const nextAttempts = [evaluation.attempt, ...prev.quizAttempts];
        const nextConfidence = [
          evaluation.confidenceAssessment,
          ...prev.confidenceAssessments,
        ];
        const nextPerformances = aggregateTopicPerformance(
          prev.subjects,
          prev.topics,
          nextAttempts,
          nextConfidence
        );
        const wellness = prev.wellnessHistory[0];
        const soonestExam =
          [...prev.subjects].sort((a, b) =>
            a.examDate.localeCompare(b.examDate)
          )[0]?.examDate ?? new Date().toISOString().split('T')[0];

        const updatedPlan = generateAdaptiveStudyPlan({
          studentId: prev.student.id,
          subjects: prev.subjects,
          topics: prev.topics,
          performances: nextPerformances,
          availableMinutes:
            prev.activeStudyPlan?.availableMinutes ??
            wellness?.availableMinutesToday ??
            120,
          targetExamDate: prev.activeStudyPlan?.targetExamDate ?? soonestExam,
          energyLevel: wellness?.energyLevel ?? 'moderate',
          intensity: wellness?.preferredIntensity ?? 'balanced',
          crammingMode:
            prev.activeStudyPlan?.crammingMode ?? crammingModePreferred,
          preferredBlockMinutes: wellness?.preferredBlockMinutes ?? 35,
          breakMinutesPerBlock: wellness?.breakMinutesPerBlock ?? 10,
        });

        return {
          ...prev,
          quizAttempts: nextAttempts,
          confidenceAssessments: nextConfidence,
          activeStudyPlan: updatedPlan,
        };
      });

      return evaluation;
    },
    [state.student.id, crammingModePreferred]
  );

  const addTeachBackSubmission = useCallback(
    (submission: TeachBackSubmission) => {
      setState((prev) => ({
        ...prev,
        teachBackHistory: [submission, ...prev.teachBackHistory].slice(0, 20),
      }));
    },
    []
  );

  const saveWellnessCheckIn = useCallback(
    (checkIn: Omit<WellnessCheckIn, 'id' | 'studentId' | 'recordedAt'>) => {
      const record: WellnessCheckIn = {
        ...checkIn,
        id: `well-${Date.now()}`,
        studentId: state.student.id,
        recordedAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        wellnessHistory: [record, ...prev.wellnessHistory].slice(0, 20),
      }));
      return record;
    },
    [state.student.id]
  );

  const setActiveStudyPlan = useCallback((plan: StudyPlan) => {
    setState((prev) => ({
      ...prev,
      activeStudyPlan: plan,
    }));
  }, []);

  const updateStudyTaskStatus = useCallback(
    (taskId: string, status: StudyTaskStatus) => {
      setState((prev) => {
        if (!prev.activeStudyPlan) return prev;
        return {
          ...prev,
          activeStudyPlan: {
            ...prev.activeStudyPlan,
            tasks: prev.activeStudyPlan.tasks.map((task) =>
              task.id === taskId ? { ...task, status } : task
            ),
          },
        };
      });
    },
    []
  );

  const buildBaseSchedulerInput = useCallback(
    (overrides?: Partial<SchedulerInput>): SchedulerInput => {
      const soonestExam =
        [...state.subjects].sort((a, b) =>
          a.examDate.localeCompare(b.examDate)
        )[0]?.examDate ?? new Date().toISOString().split('T')[0];

      return {
        studentId: state.student.id,
        subjects: state.subjects,
        topics: state.topics,
        performances: topicPerformances,
        availableMinutes: latestWellness?.availableMinutesToday ?? 120,
        targetExamDate: soonestExam,
        energyLevel: latestWellness?.energyLevel ?? 'moderate',
        intensity: latestWellness?.preferredIntensity ?? 'balanced',
        crammingMode: crammingModePreferred,
        preferredBlockMinutes: latestWellness?.preferredBlockMinutes ?? 35,
        breakMinutesPerBlock: latestWellness?.breakMinutesPerBlock ?? 10,
        ...overrides,
      };
    },
    [
      state.student.id,
      state.subjects,
      state.topics,
      topicPerformances,
      latestWellness,
      crammingModePreferred,
    ]
  );

  const refreshStudyPlanFromPerformance = useCallback(() => {
    if (state.subjects.length === 0 || state.topics.length === 0) return null;
    const soonestExam =
      [...state.subjects].sort((a, b) =>
        a.examDate.localeCompare(b.examDate)
      )[0]?.examDate ?? new Date().toISOString().split('T')[0];

    const refreshed = generateAdaptiveStudyPlan({
      studentId: state.student.id,
      subjects: state.subjects,
      topics: state.topics,
      performances: topicPerformances,
      availableMinutes:
        state.activeStudyPlan?.availableMinutes ??
        latestWellness?.availableMinutesToday ??
        120,
      targetExamDate: state.activeStudyPlan?.targetExamDate ?? soonestExam,
      energyLevel: latestWellness?.energyLevel ?? 'moderate',
      intensity: latestWellness?.preferredIntensity ?? 'balanced',
      crammingMode:
        state.activeStudyPlan?.crammingMode ?? crammingModePreferred,
      preferredBlockMinutes: latestWellness?.preferredBlockMinutes ?? 35,
      breakMinutesPerBlock: latestWellness?.breakMinutesPerBlock ?? 10,
    });

    setActiveStudyPlan(refreshed);
    return refreshed;
  }, [
    state.subjects,
    state.topics,
    state.student.id,
    state.activeStudyPlan,
    topicPerformances,
    latestWellness,
    crammingModePreferred,
    setActiveStudyPlan,
  ]);

  const questionsBank = useMemo(
    () => [
      ...SAMPLE_QUESTIONS.map((q) => ({
        ...q,
        origin: q.origin ?? ('sample' as const),
      })),
      ...state.generatedQuestions,
    ],
    [state.generatedQuestions]
  );

  const value: StudySyncContextValue = {
    state,
    activeSection,
    setActiveSection,
    selectedSubjectId,
    setSelectedSubjectId,
    selectedTopicId,
    setSelectedTopicId,
    plannerFocusMode,
    setPlannerFocusMode,
    quizFocusMode,
    setQuizFocusMode,
    crammingModePreferred,
    setCrammingModePreferred,
    backendHealth,
    topicPerformances,
    latestWellness,
    questionsBank,
    storageQuotaWarning,
    navigateToQuizForTopic,
    navigateToPlannerMode,
    toggleTheme,
    resetDemoWorkspace,
    addSubject,
    updateSubject,
    removeSubject,
    addTopic,
    promoteExtractedTopics,
    addMaterial,
    updateMaterial,
    removeMaterial,
    addGeneratedQuestions,
    submitQuizAttempt,
    addTeachBackSubmission,
    saveWellnessCheckIn,
    setActiveStudyPlan,
    refreshStudyPlanFromPerformance,
    updateStudyTaskStatus,
    buildBaseSchedulerInput,
  };

  return (
    <StudySyncContext.Provider value={value}>
      {children}
    </StudySyncContext.Provider>
  );
}

export function useStudySync(): StudySyncContextValue {
  const ctx = useContext(StudySyncContext);
  if (!ctx) {
    throw new Error('useStudySync must be used within StudySyncProvider');
  }
  return ctx;
}
