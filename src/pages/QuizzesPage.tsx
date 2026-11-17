import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Gauge,
  MessageSquareText,
  RefreshCw,
  Send,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useStudySync } from '../hooks/useStudySync';
import {
  ConfidenceAssessment,
  QuizAttempt,
  QuizGenerationResult,
  QuizQuestion,
  TeachBackSubmission,
} from '../types/studysync';
import {
  evaluateTeachBackExplanation,
  generateQuizFromMaterial,
} from '../services/aiService';

type QuizStage = 'setup' | 'active' | 'results';

export function QuizzesPage() {
  const {
    state,
    selectedSubjectId,
    setSelectedSubjectId,
    selectedTopicId,
    setSelectedTopicId,
    quizFocusMode,
    setQuizFocusMode,
    backendHealth,
    questionsBank,
    addGeneratedQuestions,
    submitQuizAttempt,
    addTeachBackSubmission,
    navigateToPlannerMode,
    setActiveSection,
  } = useStudySync();

  // Ensure selectedSubjectId and selectedTopicId stay valid
  const activeSubject = useMemo(
    () =>
      state.subjects.find((s) => s.id === selectedSubjectId) ??
      state.subjects[0] ??
      null,
    [state.subjects, selectedSubjectId]
  );

  const subjectTopics = useMemo(
    () =>
      activeSubject
        ? state.topics.filter((t) => t.subjectId === activeSubject.id)
        : [],
    [state.topics, activeSubject]
  );

  const activeTopic = useMemo(
    () =>
      subjectTopics.find((t) => t.id === selectedTopicId) ??
      subjectTopics[0] ??
      null,
    [subjectTopics, selectedTopicId]
  );

  useEffect(() => {
    if (activeTopic && activeTopic.id !== selectedTopicId) {
      setSelectedTopicId(activeTopic.id);
    }
  }, [activeTopic, selectedTopicId, setSelectedTopicId]);

  // Strict topic-level question matching: never fall back to unrelated sibling topic questions
  const availableTopicQuestions = useMemo(() => {
    if (!activeTopic) return [];
    return questionsBank.filter((q) => q.topicId === activeTopic.id);
  }, [questionsBank, activeTopic]);

  const sampleQuestionCount = useMemo(
    () =>
      availableTopicQuestions.filter((q) => q.origin !== 'gemini_generated')
        .length,
    [availableTopicQuestions]
  );

  const aiQuestionCount = useMemo(
    () =>
      availableTopicQuestions.filter((q) => q.origin === 'gemini_generated')
        .length,
    [availableTopicQuestions]
  );

  // Quiz state
  const [stage, setStage] = useState<QuizStage>('setup');
  const [quizLength, setQuizLength] = useState<number>(3);
  const [confidenceInput, setConfidenceInput] = useState<number>(75);
  const [runQuestions, setRunQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>(
    {}
  );
  const [quizStartedAt, setQuizStartedAt] = useState<number>(Date.now());
  const [quizError, setQuizError] = useState<string>('');
  const [latestResult, setLatestResult] = useState<{
    attempt: QuizAttempt;
    confidenceAssessment: ConfidenceAssessment;
  } | null>(null);

  // AI Quiz generation state
  const [quizGenLoading, setQuizGenLoading] = useState<boolean>(false);
  const [quizGenStatus, setQuizGenStatus] =
    useState<QuizGenerationResult | null>(null);
  const [quizGenError, setQuizGenError] = useState<string>('');

  // Teach-Back AI state
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [teachBackExplanation, setTeachBackExplanation] = useState<string>('');
  const [teachBackLoading, setTeachBackLoading] = useState<boolean>(false);
  const [teachBackError, setTeachBackError] = useState<string>('');
  const [latestTeachBack, setLatestTeachBack] =
    useState<TeachBackSubmission | null>(null);

  const topicMaterials = useMemo(() => {
    if (!activeTopic) return [];
    return state.materials.filter(
      (m) =>
        m.subjectId === activeTopic.subjectId &&
        (!m.topicId || m.topicId === activeTopic.id)
    );
  }, [state.materials, activeTopic]);

  useEffect(() => {
    if (topicMaterials.length > 0) {
      const withText = topicMaterials.find((m) => Boolean(m.extractedText));
      setSelectedMaterialId(withText?.id ?? topicMaterials[0].id);
    } else {
      setSelectedMaterialId('');
    }
  }, [topicMaterials]);

  useEffect(() => {
    setQuizGenStatus(null);
    setQuizGenError('');
    setQuizError('');
  }, [activeSubject?.id, activeTopic?.id]);

  const handleGenerateAiQuiz = async () => {
    if (!activeSubject || !activeTopic) return;
    setQuizGenLoading(true);
    setQuizGenError('');
    setQuizGenStatus(null);
    setQuizError('');

    try {
      const grounded = state.materials.find((m) => m.id === selectedMaterialId);
      const { result, apiError } = await generateQuizFromMaterial({
        subject: activeSubject,
        topic: activeTopic,
        material: grounded,
        questionCount: Math.max(3, Math.min(5, quizLength)),
      });

      setQuizGenStatus(result);
      if (apiError) {
        setQuizGenError(apiError);
      }
      if (result.mode === 'live_gemini' && result.questions.length > 0) {
        addGeneratedQuestions(result.questions);
      }
    } finally {
      setQuizGenLoading(false);
    }
  };

  const handleStartQuiz = () => {
    if (!activeSubject || !activeTopic) return;
    if (availableTopicQuestions.length === 0) {
      setQuizError(
        `No questions exist for "${activeTopic.title}" yet. Generate a Gemini AI quiz from your study materials or use Teach-Back AI.`
      );
      return;
    }

    setQuizError('');
    // Prioritize newly generated questions alongside sample questions up to requested length
    const sortedPool = [...availableTopicQuestions].sort((a, b) => {
      const aGen = a.origin === 'gemini_generated' ? 0 : 1;
      const bGen = b.origin === 'gemini_generated' ? 0 : 1;
      return aGen - bGen;
    });
    const count = Math.min(quizLength, sortedPool.length);
    const chosen = sortedPool.slice(0, count);
    setRunQuestions(chosen);
    setCurrentIdx(0);
    setSelectedAnswers({});
    setQuizStartedAt(Date.now());
    setLatestResult(null);
    setStage('active');
  };

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
    setQuizError('');
  };

  const handleSubmitQuiz = () => {
    if (!activeSubject || !activeTopic) return;
    const unansweredCount = runQuestions.filter(
      (q) => typeof selectedAnswers[q.id] !== 'number'
    ).length;

    if (unansweredCount > 0) {
      setQuizError(
        `Please answer all remaining questions (${unansweredCount} unanswered) before submitting.`
      );
      return;
    }

    const elapsedSeconds = Math.max(
      10,
      Math.round((Date.now() - quizStartedAt) / 1000)
    );

    const evaluated = submitQuizAttempt({
      subjectId: activeSubject.id,
      topicId: activeTopic.id,
      questions: runQuestions,
      selectedIndices: selectedAnswers,
      reportedConfidence: confidenceInput,
      durationSeconds: elapsedSeconds,
    });

    setLatestResult(evaluated);
    setStage('results');
  };

  const teachBackPrompt = activeTopic
    ? `In your own words, explain "${activeTopic.title}" as if teaching a peer. Try to cover ${activeTopic.keyConcepts.slice(0, 3).join(', ')}.`
    : 'Select a topic to begin Teach-Back.';

  const handleSubmitTeachBack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubject || !activeTopic) return;
    if (teachBackExplanation.trim().length < 15) {
      setTeachBackError(
        'Please write at least a couple of sentences (15+ characters) so we can evaluate your explanation.'
      );
      return;
    }

    setTeachBackError('');
    setTeachBackLoading(true);
    try {
      const grounded = state.materials.find((m) => m.id === selectedMaterialId);
      const { result, apiError } = await evaluateTeachBackExplanation({
        topic: activeTopic,
        promptQuestion: teachBackPrompt,
        studentExplanation: teachBackExplanation.trim(),
        groundedMaterial: grounded,
      });

      if (apiError) {
        setTeachBackError(apiError);
      }

      const submission: TeachBackSubmission = {
        id: `tb-${Date.now()}`,
        subjectId: activeSubject.id,
        topicId: activeTopic.id,
        promptQuestion: teachBackPrompt,
        studentExplanation: teachBackExplanation.trim(),
        submittedAt: new Date().toISOString(),
        result,
      };
      addTeachBackSubmission(submission);
      setLatestTeachBack(submission);
    } finally {
      setTeachBackLoading(false);
    }
  };

  const currentQuestion = runQuestions[currentIdx];
  const answeredCount = runQuestions.filter(
    (q) => typeof selectedAnswers[q.id] === 'number'
  ).length;
  const quizLengthOptions =
    availableTopicQuestions.length > 0 && availableTopicQuestions.length < 3
      ? [availableTopicQuestions.length]
      : [3, 4, 5];

  return (
    <div className="space-y-6">
      {/* Header & Sub-Mode Switcher */}
      <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              AI-Assisted Quizzes, Confidence Calibration &amp; Teach-Back
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Measure actual topic mastery, surface confidence blind spots, and test understanding in your own words.
            </p>
          </div>

          <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 self-start">
            <button
              type="button"
              onClick={() => setQuizFocusMode('quiz')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                quizFocusMode === 'quiz'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>Quiz &amp; Confidence Gap</span>
            </button>
            <button
              type="button"
              onClick={() => setQuizFocusMode('teach_back')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                quizFocusMode === 'teach_back'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              <span>Teach-Back AI</span>
            </button>
          </div>
        </div>
      </section>

      {/* Shared Subject & Topic Selector Bar */}
      <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Subject
            </label>
            <select
              value={activeSubject?.id ?? ''}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setStage('setup');
                setLatestResult(null);
                setLatestTeachBack(null);
              }}
              className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            >
              {state.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} · {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Topic
            </label>
            <select
              value={activeTopic?.id ?? ''}
              onChange={(e) => {
                setSelectedTopicId(e.target.value);
                setStage('setup');
                setLatestResult(null);
                setLatestTeachBack(null);
              }}
              className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            >
              {subjectTopics.length === 0 ? (
                <option value="">No topics in this subject</option>
              ) : (
                subjectTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </section>

      {/* MODE 1: QUIZ + CONFIDENCE GAP DETECTOR */}
      {quizFocusMode === 'quiz' && (
        <>
          {stage === 'setup' && (
            <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                      Configure Assessment: {activeTopic?.title ?? 'Select Topic'}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      {activeTopic?.summary ??
                        'Add a topic in the Learning Library to generate an assessment.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 tabular-nums">
                      Quiz Length ({availableTopicQuestions.length} topic questions
                      {availableTopicQuestions.length > 0
                        ? `: ${sampleQuestionCount} sample · ${aiQuestionCount} AI-generated`
                        : ''}
                      )
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {quizLengthOptions.map((len) => {
                        const disabled = availableTopicQuestions.length < 1;
                        return (
                          <button
                            key={len}
                            type="button"
                            disabled={disabled}
                            onClick={() => setQuizLength(len)}
                            className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors tabular-nums ${
                              quizLength === len ||
                              (quizLengthOptions.length === 1 && len === quizLengthOptions[0])
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {len} {len === 1 ? 'Question' : 'Questions'}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI-Generated Quiz Grounded in Material */}
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>Generate Quiz from Study Material (Gemini AI)</span>
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {backendHealth.aiConnected
                            ? 'Server-side Gemini API ready. Questions will be grounded in your selected material and saved to this topic.'
                            : 'Demonstration State: Gemini API key not configured on server. Will clearly report unavailable without fabricating fake AI questions.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!activeTopic || quizGenLoading}
                        onClick={handleGenerateAiQuiz}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border border-blue-500/40 bg-blue-600/10 text-blue-700 dark:text-blue-300 hover:bg-blue-600/20 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          {quizGenLoading ? 'Generating...' : 'Generate AI Quiz'}
                        </span>
                      </button>
                    </div>

                    {topicMaterials.length > 0 && (
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Source Material for AI Quiz
                        </label>
                        <select
                          value={selectedMaterialId}
                          onChange={(e) => setSelectedMaterialId(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                        >
                          <option value="">
                            Topic metadata only ({activeTopic?.title})
                          </option>
                          {topicMaterials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.fileName}{' '}
                              {m.extractedText
                                ? '(Extracted text ready)'
                                : '(Metadata only — extract text in Library first)'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {quizGenStatus && (
                      <div
                        className={`p-3 rounded-lg border text-xs space-y-1 ${
                          quizGenStatus.mode === 'live_gemini'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        <p className="font-semibold flex items-center gap-1.5">
                          {quizGenStatus.mode === 'live_gemini' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>{quizGenStatus.modelLabel}</span>
                        </p>
                        <p className="leading-relaxed">{quizGenStatus.statusMessage}</p>
                      </div>
                    )}

                    {quizGenError && (
                      <p className="text-xs text-rose-600 dark:text-rose-400">
                        {quizGenError}
                      </p>
                    )}
                  </div>

                  {availableTopicQuestions.length === 0 && (
                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                      <p>
                        No questions are attached to <span className="font-semibold">{activeTopic?.title}</span> yet. StudySync AI never substitutes unrelated questions from other topics.
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">
                        Click <span className="font-medium">Generate AI Quiz</span> above (with Gemini connected) or switch to{' '}
                        <button
                          type="button"
                          onClick={() => setQuizFocusMode('teach_back')}
                          className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                        >
                          Teach-Back AI
                        </button>{' '}
                        to practice active recall immediately.
                      </p>
                    </div>
                  )}
                </div>

                {/* Innovation A: Pre-Quiz Confidence Rating */}
                <div className="lg:col-span-5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      Confidence Gap Detector
                    </span>
                    <span className="font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {confidenceInput}%
                    </span>
                  </div>

                  <label
                    htmlFor="confidence-slider"
                    className="block text-xs text-slate-600 dark:text-slate-300 leading-relaxed"
                  >
                    Before seeing the questions, how confident do you feel about{' '}
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {activeTopic?.title ?? 'this topic'}
                    </span>
                    ?
                  </label>

                  <input
                    id="confidence-slider"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={confidenceInput}
                    onChange={(e) => setConfidenceInput(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />

                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    <span>0% Unsure</span>
                    <span>50% Moderate</span>
                    <span>100% Very Confident</span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Confidence ratings are self-reflective study signals—not clinical measures—and help the Adaptive Scheduler spot blind spots.
                  </p>
                </div>
              </div>

              {quizError && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {quizError}
                </p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Results save automatically to Performance Analytics &amp; recalculate your Study Plan.
                </span>
                <button
                  type="button"
                  disabled={!activeTopic || availableTopicQuestions.length === 0}
                  onClick={handleStartQuiz}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  <span>Begin Quiz</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </section>
          )}

          {stage === 'active' && currentQuestion && (
            <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 space-y-6">
              {/* Progress Bar & Metadata */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {activeTopic?.title} · Question {currentIdx + 1} of{' '}
                    {runQuestions.length} · Confidence Logged: {confidenceInput}%
                  </p>
                  <div className="w-full sm:w-64 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-200"
                      style={{
                        width: `${Math.round(
                          ((currentIdx + 1) / runQuestions.length) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {runQuestions.map((q, idx) => {
                    const isAnswered = typeof selectedAnswers[q.id] === 'number';
                    const isCurr = idx === currentIdx;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setCurrentIdx(idx)}
                        className={`w-7 h-7 rounded-md text-xs font-mono tabular-nums border transition-colors ${
                          isCurr
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : isAnswered
                            ? 'bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-300'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                        aria-label={`Jump to question ${idx + 1}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question Prompt & Options */}
              <div className="space-y-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 capitalize">
                  Difficulty: {currentQuestion.difficulty} · Source:{' '}
                  {currentQuestion.origin === 'gemini_generated'
                    ? 'Gemini AI (Grounded)'
                    : 'Sample Bank'}
                </p>
                <h3 className="font-display text-lg font-medium text-slate-900 dark:text-slate-100 leading-snug">
                  {currentQuestion.prompt}
                </h3>

                <div className="space-y-2.5 pt-2">
                  {currentQuestion.options.map((opt, oIdx) => {
                    const isPicked = selectedAnswers[currentQuestion.id] === oIdx;
                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => handleSelectOption(currentQuestion.id, oIdx)}
                        className={`w-full text-left p-4 rounded-xl border text-sm transition-colors flex items-start gap-3 ${
                          isPicked
                            ? 'bg-blue-50 border-blue-600 text-slate-900 dark:bg-blue-950/40 dark:border-blue-500 dark:text-slate-100'
                            : 'bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <span
                          className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center text-xs font-mono shrink-0 ${
                            isPicked
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-slate-400 dark:border-slate-600 text-slate-500'
                          }`}
                        >
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span className="leading-relaxed">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {quizError && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {quizError}
                </p>
              )}

              {/* Navigation Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-2.5">
                  {currentIdx < runQuestions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentIdx((i) =>
                          Math.min(runQuestions.length - 1, i + 1)
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <span>Next</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmitQuiz}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        Submit Quiz ({answeredCount}/{runQuestions.length})
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {stage === 'results' && latestResult && (
            <section className="space-y-6">
              {/* Confidence Gap Comparison Card */}
              <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      Assessment &amp; Confidence Gap Analysis
                    </p>
                    <h3 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">
                      Score: {latestResult.attempt.score}/
                      {latestResult.attempt.totalQuestions} (
                      {latestResult.attempt.accuracyPercent}%)
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStage('setup')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retake Quiz</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuizFocusMode('teach_back')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                    >
                      <MessageSquareText className="w-3.5 h-3.5" />
                      <span>Practice Teach-Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateToPlannerMode('schedule', false)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap"
                    >
                      <CalendarClock className="w-3.5 h-3.5" />
                      <span>View Updated Study Plan</span>
                    </button>
                  </div>
                </div>

                {/* Visual Confidence vs Accuracy Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5 tabular-nums">
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                          Self-Reported Confidence
                        </span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {latestResult.confidenceAssessment.reportedConfidence}%
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-slate-500 dark:bg-slate-400 rounded-full"
                          style={{
                            width: `${latestResult.confidenceAssessment.reportedConfidence}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1.5 tabular-nums">
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                          Actual Quiz Accuracy
                        </span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {latestResult.confidenceAssessment.actualAccuracy}%
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{
                            width: `${latestResult.confidenceAssessment.actualAccuracy}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Confidence Gap
                    </p>
                    <p
                      className={`font-display text-2xl font-semibold tabular-nums ${
                        latestResult.confidenceAssessment.calibration ===
                        'overconfident'
                          ? 'text-amber-600 dark:text-amber-400'
                          : latestResult.confidenceAssessment.calibration ===
                            'underconfident'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {latestResult.confidenceAssessment.confidenceGap >= 0
                        ? `+${latestResult.confidenceAssessment.confidenceGap}`
                        : latestResult.confidenceAssessment.confidenceGap}{' '}
                      pts
                    </p>
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      {latestResult.confidenceAssessment.calibration ===
                        'overconfident' && (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      )}
                      <span>
                        {latestResult.confidenceAssessment.calibration ===
                        'overconfident'
                          ? 'Possible Overconfidence'
                          : latestResult.confidenceAssessment.calibration ===
                            'underconfident'
                          ? 'Possible Underconfidence'
                          : 'Well Calibrated'}
                      </span>
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-2 border-t border-slate-200 dark:border-slate-800">
                  {latestResult.confidenceAssessment.interpretation}{' '}
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                    Your Adaptive Study Plan has been recalculated using this accuracy and confidence gap.
                  </span>
                </p>
              </div>

              {/* Per-Question Explanations */}
              <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6">
                <h4 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 pb-4 border-b border-slate-200 dark:border-slate-800">
                  Question Review &amp; Explanations
                </h4>
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {runQuestions.map((q, idx) => {
                    const ans = latestResult.attempt.answers.find(
                      (a) => a.questionId === q.id
                    );
                    const isCorrect = Boolean(ans?.isCorrect);
                    return (
                      <div key={q.id} className="py-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {idx + 1}. {q.prompt}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium shrink-0 ${
                              isCorrect
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isCorrect ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            <span>{isCorrect ? 'Correct' : 'Incorrect'}</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Your answer:{' '}
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {ans && ans.selectedIndex >= 0
                              ? q.options[ans.selectedIndex]
                              : 'No answer'}
                          </span>
                        </p>
                        {!isCorrect && (
                          <p className="text-xs text-emerald-700 dark:text-emerald-400">
                            Correct answer: {q.options[q.correctIndex]}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Explanation: {q.explanation}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* MODE 2: INNOVATION B — TEACH-BACK AI */}
      {quizFocusMode === 'teach_back' && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  Teach-Back AI · Active Recall Exercise
                </p>
                <span
                  className={`text-[11px] font-medium ${
                    backendHealth.aiConnected
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {backendHealth.aiConnected
                    ? 'Live Gemini API Connected'
                    : 'Demonstration Fallback (GEMINI_API_KEY unset)'}
                </span>
              </div>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 mt-1">
                {teachBackPrompt}
              </h3>
              {activeTopic && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  Topic key concepts: {activeTopic.keyConcepts.join(' · ')}
                </p>
              )}
            </div>

            {topicMaterials.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Ground AI Feedback in Study Material
                </label>
                <select
                  value={selectedMaterialId}
                  onChange={(e) => setSelectedMaterialId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                >
                  <option value="">None (topic checklist only)</option>
                  {topicMaterials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fileName}{' '}
                      {m.extractedText ? '(Text available)' : '(Metadata only)'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <form onSubmit={handleSubmitTeachBack} className="space-y-4">
              <div>
                <label
                  htmlFor="teach-back-input"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Your Explanation (in your own words)
                </label>
                <textarea
                  id="teach-back-input"
                  rows={6}
                  value={teachBackExplanation}
                  onChange={(e) => setTeachBackExplanation(e.target.value)}
                  placeholder="Write a clear explanation as if teaching a classmate..."
                  className="w-full p-3.5 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  {
                    teachBackExplanation
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean).length
                  }{' '}
                  words
                </p>
              </div>

              {teachBackError && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {teachBackError}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTeachBackExplanation('');
                    setLatestTeachBack(null);
                    setTeachBackError('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry / Clear</span>
                </button>

                <button
                  type="submit"
                  disabled={teachBackLoading || !activeTopic}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {teachBackLoading
                      ? 'Evaluating...'
                      : 'Submit for Teach-Back Feedback'}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Feedback Output Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Evaluation Feedback
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveSection('analytics')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <span>Analytics</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {latestTeachBack ? (
                <div className="space-y-4">
                  <div
                    className={`p-3 rounded-lg border space-y-1 ${
                      latestTeachBack.result.mode === 'live_gemini'
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-amber-500/10 border-amber-500/30'
                    }`}
                  >
                    <p
                      className={`text-xs font-semibold flex items-center gap-1.5 ${
                        latestTeachBack.result.mode === 'live_gemini'
                          ? 'text-emerald-800 dark:text-emerald-300'
                          : 'text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {latestTeachBack.result.mode === 'live_gemini' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{latestTeachBack.result.modelLabel}</span>
                    </p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {latestTeachBack.result.statusMessage}
                    </p>
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 pt-1">
                      {latestTeachBack.result.clarityScoreNote}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5">
                      Potentially Correct Concepts Covered
                    </h4>
                    <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4">
                      {latestTeachBack.result.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1.5">
                      Missing or Unclear Points
                    </h4>
                    <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4">
                      {latestTeachBack.result.missingConcepts.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1.5">
                      Suggested Improvements
                    </h4>
                    <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4">
                      {latestTeachBack.result.suggestedImprovements.map(
                        (imp, i) => (
                          <li key={i}>{imp}</li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center space-y-2">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Submit your explanation to review covered concepts, gaps, and grounded improvements.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    If the Gemini API key is not configured on the server, StudySync AI clearly labels its output as a Demonstration Concept Rubric rather than faking a live AI call.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
