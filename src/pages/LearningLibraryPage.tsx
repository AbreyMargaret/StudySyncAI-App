import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Edit3,
  FileAudio,
  FileText,
  FileVideo,
  FolderPlus,
  MessageSquareText,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useStudySync } from '../hooks/useStudySync';
import { LearningMaterial, MaterialFormat, Subject, Topic } from '../types/studysync';
import {
  clearSessionFile,
  formatFileSize,
  processUploadedLearningFile,
  SUPPORTED_MATERIAL_FORMATS,
} from '../utils/fileProcessor';
import {
  generateQuizFromMaterial,
  requestBackendMaterialExtraction,
} from '../services/aiService';

const FORMAT_LABELS: Record<MaterialFormat, string> = {
  pdf: 'PDF Document',
  txt: 'Plain Text',
  docx: 'Word DOCX',
  pptx: 'PowerPoint PPTX',
  mp3: 'Audio MP3',
  mp4: 'Video MP4',
};

export function LearningLibraryPage() {
  const {
    state,
    selectedSubjectId,
    setSelectedSubjectId,
    backendHealth,
    navigateToQuizForTopic,
    addSubject,
    updateSubject,
    removeSubject,
    addTopic,
    promoteExtractedTopics,
    addMaterial,
    updateMaterial,
    removeMaterial,
    addGeneratedQuestions,
  } = useStudySync();

  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'all' | MaterialFormat>('all');

  // Subject create/edit state
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjName, setSubjName] = useState('');
  const [subjCode, setSubjCode] = useState('');
  const [subjDesc, setSubjDesc] = useState('');
  const [subjExamDate, setSubjExamDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [subjTarget, setSubjTarget] = useState(85);
  const [subjFormError, setSubjFormError] = useState('');

  // Topic create state
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicSummary, setTopicSummary] = useState('');
  const [topicConceptsRaw, setTopicConceptsRaw] = useState('');
  const [topicDifficulty, setTopicDifficulty] =
    useState<Topic['difficulty']>('intermediate');
  const [topicMinutes, setTopicMinutes] = useState(40);
  const [topicFormError, setTopicFormError] = useState('');

  // Upload & inspection state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadTopicId, setUploadTopicId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [inspectedMaterial, setInspectedMaterial] =
    useState<LearningMaterial | null>(null);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [generatingQuizId, setGeneratingQuizId] = useState<string | null>(null);
  const [extractionFeedback, setExtractionFeedback] = useState<string>('');

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

  const filteredMaterials = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return state.materials.filter((m) => {
      if (activeSubject && m.subjectId !== activeSubject.id) return false;
      if (formatFilter !== 'all' && m.format !== formatFilter) return false;
      if (!q) return true;
      return (
        m.fileName.toLowerCase().includes(q) ||
        m.extractedTopics.some((t) => t.toLowerCase().includes(q)) ||
        (m.extractedText ?? '').toLowerCase().includes(q)
      );
    });
  }, [state.materials, activeSubject, formatFilter, searchQuery]);

  const openNewSubjectForm = () => {
    setEditingSubject(null);
    setSubjName('');
    setSubjCode('');
    setSubjDesc('');
    setSubjTarget(85);
    setSubjFormError('');
    setShowAddSubject(true);
  };

  const openEditSubjectForm = (subject: Subject) => {
    setEditingSubject(subject);
    setSubjName(subject.name);
    setSubjCode(subject.code);
    setSubjDesc(subject.description);
    setSubjExamDate(subject.examDate);
    setSubjTarget(subject.targetMastery);
    setSubjFormError('');
    setShowAddSubject(true);
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjName.trim()) {
      setSubjFormError('Subject name is required.');
      return;
    }
    if (!subjExamDate) {
      setSubjFormError('Please select a target exam date.');
      return;
    }

    if (editingSubject) {
      updateSubject({
        ...editingSubject,
        name: subjName.trim(),
        code: subjCode.trim() || editingSubject.code,
        description: subjDesc.trim(),
        examDate: subjExamDate,
        targetMastery: Number(subjTarget) || 85,
      });
    } else {
      addSubject({
        name: subjName,
        code: subjCode,
        description: subjDesc,
        examDate: subjExamDate,
        targetMastery: Number(subjTarget) || 85,
      });
    }

    setShowAddSubject(false);
    setEditingSubject(null);
  };

  const handleSaveTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubject) return;
    if (!topicTitle.trim()) {
      setTopicFormError('Topic title is required.');
      return;
    }

    const concepts = topicConceptsRaw
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    addTopic({
      subjectId: activeSubject.id,
      title: topicTitle,
      summary:
        topicSummary.trim() ||
        `Core concepts and practice checks for ${topicTitle.trim()}.`,
      keyConcepts: concepts,
      difficulty: topicDifficulty,
      estimatedStudyMinutes: Number(topicMinutes) || 40,
    });

    setTopicTitle('');
    setTopicSummary('');
    setTopicConceptsRaw('');
    setTopicFormError('');
    setShowAddTopic(false);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !activeSubject) return;
    setUploadError('');
    setUploadSuccess('');
    setExtractionFeedback('');
    setIsUploading(true);

    try {
      const file = files[0];
      const { material, error } = await processUploadedLearningFile({
        file,
        subjectId: activeSubject.id,
        topicId: uploadTopicId || undefined,
      });

      if (error || !material) {
        setUploadError(error ?? 'Unable to validate uploaded file.');
      } else {
        addMaterial(material);
        setInspectedMaterial(material);
        if (material.processingStatus === 'parsed_client') {
          setUploadSuccess(
            `"${material.fileName}" validated and plain text extracted locally.`
          );
        } else if (material.format === 'pdf' && backendHealth.aiConnected) {
          setUploadSuccess(
            `"${material.fileName}" verified (%PDF-). Extracting PDF text and topics via Gemini...`
          );
          await handleTriggerAIExtraction(material);
        } else {
          setUploadSuccess(
            `"${material.fileName}" validated locally and prepared for backend Gemini/R2 extraction.`
          );
        }
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleTriggerAIExtraction = async (material: LearningMaterial) => {
    if (!activeSubject) return;
    setExtractingId(material.id);
    setExtractionFeedback('');

    const result = await requestBackendMaterialExtraction({
      material,
      subjectName: activeSubject.name,
    });

    if (result.error) {
      setExtractionFeedback(`Backend extraction error: ${result.error}`);
    } else if (!result.connected) {
      setExtractionFeedback(
        result.summaryNote ??
          'Gemini API not connected on backend. File remains validated locally.'
      );
    } else {
      const hasExtracted =
        (result.extractedTopics && result.extractedTopics.length > 0) ||
        Boolean(result.extractedText);
      const updated: LearningMaterial = {
        ...material,
        processingStatus: hasExtracted
          ? 'ai_processed'
          : material.processingStatus,
        extractedTopics:
          result.extractedTopics && result.extractedTopics.length > 0
            ? result.extractedTopics
            : material.extractedTopics,
        extractedText: result.extractedText ?? material.extractedText,
        processingNote: result.summaryNote ?? material.processingNote,
      };
      updateMaterial(updated);
      setInspectedMaterial(updated);
      setExtractionFeedback(
        result.summaryNote ?? 'Gemini API extraction complete.'
      );
    }

    setExtractingId(null);
  };

  const handlePromoteTopicsFromMaterial = (material: LearningMaterial) => {
    if (!activeSubject || material.extractedTopics.length === 0) return;
    const created = promoteExtractedTopics(
      activeSubject.id,
      material.extractedTopics
    );
    if (created.length > 0) {
      setExtractionFeedback(
        `Added ${created.length} extracted topic${
          created.length === 1 ? '' : 's'
        } to ${activeSubject.name}.`
      );
    } else {
      setExtractionFeedback(
        `All extracted topics already exist under ${activeSubject.name}.`
      );
    }
  };

  const handleGenerateQuizFromMaterial = async (material: LearningMaterial) => {
    if (!activeSubject) return;
    let targetTopic =
      subjectTopics.find((t) => t.id === material.topicId) ?? subjectTopics[0];

    if (!targetTopic && material.extractedTopics.length > 0) {
      const created = promoteExtractedTopics(activeSubject.id, [
        material.extractedTopics[0],
      ]);
      targetTopic = created[0];
    }

    if (!targetTopic) {
      setExtractionFeedback(
        'Create or select a topic under this subject first to attach the generated quiz.'
      );
      return;
    }

    setGeneratingQuizId(material.id);
    setExtractionFeedback('');
    try {
      const { result, apiError } = await generateQuizFromMaterial({
        subject: activeSubject,
        topic: targetTopic,
        material,
        questionCount: 4,
      });

      if (apiError) {
        setExtractionFeedback(apiError);
        return;
      }

      if (result.mode === 'live_gemini' && result.questions.length > 0) {
        addGeneratedQuestions(result.questions);
        navigateToQuizForTopic(activeSubject.id, targetTopic.id, 'quiz');
      } else {
        setExtractionFeedback(result.statusMessage);
      }
    } finally {
      setGeneratingQuizId(null);
    }
  };

  const renderFormatIcon = (format: MaterialFormat) => {
    if (format === 'mp3') return <FileAudio className="w-4 h-4 text-blue-500" />;
    if (format === 'mp4') return <FileVideo className="w-4 h-4 text-blue-500" />;
    return <FileText className="w-4 h-4 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Learning Library &amp; Material Processing
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Organize subjects, topics, and study files. Supports client-side TXT reading and validated R2/Gemini contracts for PDF, DOCX, PPTX, MP3, and MP4.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={openNewSubjectForm}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Add Subject</span>
            </button>
          </div>
        </div>
      </section>

      {/* Add / Edit Subject Modal-style Inline Panel */}
      {showAddSubject && (
        <section className="rounded-xl bg-white dark:bg-[#111827] border border-blue-500/40 p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              {editingSubject ? `Edit ${editingSubject.name}` : 'Create New Subject'}
            </h3>
            <button
              type="button"
              onClick={() => setShowAddSubject(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              aria-label="Close subject form"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSaveSubject} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Subject Name
              </label>
              <input
                type="text"
                value={subjName}
                onChange={(e) => setSubjName(e.target.value)}
                placeholder="e.g., Linear Algebra"
                className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Course Code
              </label>
              <input
                type="text"
                value={subjCode}
                onChange={(e) => setSubjCode(e.target.value)}
                placeholder="e.g., MATH 240"
                className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Examination Date
              </label>
              <input
                type="date"
                value={subjExamDate}
                onChange={(e) => setSubjExamDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Target Mastery (%)
              </label>
              <input
                type="number"
                min={50}
                max={100}
                value={subjTarget}
                onChange={(e) => setSubjTarget(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={subjDesc}
                onChange={(e) => setSubjDesc(e.target.value)}
                placeholder="Brief summary of syllabus or exam focus..."
                className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {subjFormError && (
              <p className="md:col-span-2 text-xs text-rose-600 dark:text-rose-400">
                {subjFormError}
              </p>
            )}
            <div className="md:col-span-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddSubject(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
              >
                {editingSubject ? 'Save Changes' : 'Create Subject'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Main 12-Col Layout: Subjects (4) + Topics & Materials (8) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Subject Cards */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Subjects ({state.subjects.length})
            </h3>
          </div>

          {state.subjects.length === 0 ? (
            <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No subjects in your library yet.
              </p>
              <button
                type="button"
                onClick={openNewSubjectForm}
                className="mt-3 px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
              >
                Add First Subject
              </button>
            </div>
          ) : (
            state.subjects.map((subject) => {
              const isSelected = activeSubject?.id === subject.id;
              const tCount = state.topics.filter(
                (t) => t.subjectId === subject.id
              ).length;
              const mCount = state.materials.filter(
                (m) => m.subjectId === subject.id
              ).length;

              return (
                <div
                  key={subject.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-500/50 dark:bg-blue-950/25 dark:border-blue-500/50'
                      : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSubjectId(subject.id);
                        setInspectedMaterial(null);
                      }}
                      className="text-left flex-1 min-w-0 focus:outline-none"
                    >
                      <p className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                        {subject.code} · Exam {subject.examDate}
                      </p>
                      <h4 className="mt-1 font-display text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {subject.name}
                      </h4>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {subject.description}
                      </p>
                      <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {tCount} topics · {mCount} materials · Target {subject.targetMastery}%
                      </p>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditSubjectForm(subject)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800"
                        aria-label={`Edit ${subject.name}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {state.subjects.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSubject(subject.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/50 dark:hover:bg-slate-800"
                          aria-label={`Remove ${subject.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Topics & Learning Materials for Active Subject */}
        <div className="lg:col-span-8 space-y-6">
          {activeSubject ? (
            <>
              {/* Topics Section */}
              <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                      {activeSubject.name} — Topics
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Select any topic to launch an assessment quiz or Teach-Back review.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddTopic((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Topic</span>
                  </button>
                </div>

                {showAddTopic && (
                  <form
                    onSubmit={handleSaveTopic}
                    className="mt-4 pb-4 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Topic Title
                      </label>
                      <input
                        type="text"
                        value={topicTitle}
                        onChange={(e) => setTopicTitle(e.target.value)}
                        placeholder="e.g., Integration Testing"
                        className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Key Concepts (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={topicConceptsRaw}
                        onChange={(e) => setTopicConceptsRaw(e.target.value)}
                        placeholder="e.g., Mocking, Contract tests, Fixtures"
                        className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Summary
                      </label>
                      <input
                        type="text"
                        value={topicSummary}
                        onChange={(e) => setTopicSummary(e.target.value)}
                        placeholder="What should you master in this topic?"
                        className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Difficulty
                      </label>
                      <select
                        value={topicDifficulty}
                        onChange={(e) =>
                          setTopicDifficulty(e.target.value as Topic['difficulty'])
                        }
                        className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                      >
                        <option value="introductory">Introductory</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Estimated Study Minutes
                      </label>
                      <input
                        type="number"
                        min={15}
                        max={120}
                        value={topicMinutes}
                        onChange={(e) => setTopicMinutes(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 tabular-nums"
                      />
                    </div>
                    {topicFormError && (
                      <p className="sm:col-span-2 text-xs text-rose-600 dark:text-rose-400">
                        {topicFormError}
                      </p>
                    )}
                    <div className="sm:col-span-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddTopic(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Save Topic
                      </button>
                    </div>
                  </form>
                )}

                {subjectTopics.length === 0 ? (
                  <div className="py-8 text-center">
                    <BookOpen className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      No topics added under {activeSubject.name} yet.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
                    {subjectTopics.map((topic) => (
                      <div
                        key={topic.id}
                        className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            <span className="capitalize">{topic.difficulty}</span>
                            <span aria-hidden="true">·</span>
                            <span>~{topic.estimatedStudyMinutes}m target</span>
                          </div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {topic.title}
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {topic.summary}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Key concepts: {topic.keyConcepts.join(' · ')}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              navigateToQuizForTopic(
                                activeSubject.id,
                                topic.id,
                                'quiz'
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Start Quiz</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              navigateToQuizForTopic(
                                activeSubject.id,
                                topic.id,
                                'teach_back'
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                          >
                            <MessageSquareText className="w-3.5 h-3.5" />
                            <span>Teach-Back</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Upload & Materials Section */}
              <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                      Upload &amp; Inspect Learning Materials
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Accepted formats: PDF, TXT, DOCX, PPTX, MP3, MP4. Plain-text files are parsed directly in your browser; binary formats prepare backend R2 + Gemini contracts honestly.
                    </p>
                  </div>
                </div>

                {/* Upload Controls */}
                <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Upload resource to {activeSubject.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        PDF · TXT · DOCX · PPTX · MP3 · MP4 (up to 50 MB)
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <select
                        value={uploadTopicId}
                        onChange={(e) => setUploadTopicId(e.target.value)}
                        aria-label="Associate uploaded file with topic"
                        className="px-3 py-2 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                      >
                        <option value="">General Subject Material</option>
                        {subjectTopics.map((t) => (
                          <option key={t.id} value={t.id}>
                            Topic: {t.title}
                          </option>
                        ))}
                      </select>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.txt,.md,.docx,.pptx,.mp3,.mp4"
                        onChange={(e) => handleFileUpload(e.target.files)}
                        className="hidden"
                        id="learning-material-file-input"
                      />
                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploading ? 'Validating...' : 'Choose File'}</span>
                      </button>
                    </div>
                  </div>

                  {uploadError && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}
                  {uploadSuccess && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{uploadSuccess}</span>
                    </div>
                  )}
                </div>

                {/* Search & Format Filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search materials by filename, extracted topic, or text..."
                      className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setFormatFilter('all')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                        formatFilter === 'all'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      All
                    </button>
                    {SUPPORTED_MATERIAL_FORMATS.map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setFormatFilter(fmt)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium uppercase whitespace-nowrap transition-colors ${
                          formatFilter === fmt
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Materials List */}
                {filteredMaterials.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    No learning materials match your current filter.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
                    {filteredMaterials.map((mat) => {
                      const isParsed =
                        mat.processingStatus === 'parsed_client' ||
                        mat.processingStatus === 'ai_processed';
                      return (
                        <div
                          key={mat.id}
                          className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="mt-0.5 shrink-0">
                              {renderFormatIcon(mat.format)}
                            </div>
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                                <span className="uppercase font-mono">
                                  {mat.format}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>{formatFileSize(mat.fileSizeBytes)}</span>
                                {mat.mediaDurationSeconds !== undefined && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>
                                      {Math.floor(mat.mediaDurationSeconds / 60)}m{' '}
                                      {mat.mediaDurationSeconds % 60}s
                                    </span>
                                  </>
                                )}
                                <span aria-hidden="true">·</span>
                                <span
                                  className={`inline-flex items-center gap-1 font-medium ${
                                    isParsed
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-amber-600 dark:text-amber-400'
                                  }`}
                                >
                                  {isParsed ? (
                                    <CheckCircle2 className="w-3 h-3" />
                                  ) : (
                                    <Clock className="w-3 h-3" />
                                  )}
                                  {mat.processingStatus === 'parsed_client'
                                    ? 'Text Ready'
                                    : mat.processingStatus === 'ai_processed'
                                    ? 'Gemini Extracted'
                                    : 'Awaiting Backend AI'}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                {mat.fileName}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {mat.processingNote}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setInspectedMaterial(mat);
                                setExtractionFeedback('');
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                            >
                              Inspect Details
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (inspectedMaterial?.id === mat.id) {
                                  setInspectedMaterial(null);
                                }
                                clearSessionFile(mat.id);
                                removeMaterial(mat.id);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                              aria-label={`Delete ${mat.fileName}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Inspected Material Detail Panel */}
                {inspectedMaterial && (
                  <div className="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          Material Inspector · {FORMAT_LABELS[inspectedMaterial.format]}
                        </p>
                        <h4 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                          {inspectedMaterial.fileName}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                          Status: {inspectedMaterial.processingStatus} ·{' '}
                          {formatFileSize(inspectedMaterial.fileSizeBytes)}
                          {inspectedMaterial.r2ObjectKey
                            ? ` · Future R2 Key: ${inspectedMaterial.r2ObjectKey}`
                            : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInspectedMaterial(null)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        aria-label="Close material inspector"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {inspectedMaterial.extractedTopics.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Extracted / Associated Topics
                        </p>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          {inspectedMaterial.extractedTopics.join(' · ')}
                        </p>
                      </div>
                    )}

                    {inspectedMaterial.extractedText ? (
                      <div>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          Extracted Content Preview
                        </p>
                        <pre className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">
                          {inspectedMaterial.extractedText}
                        </pre>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                        No binary text was fabricated locally. Full document/media extraction requires connecting the backend Cloudflare R2 + Gemini API pipeline.
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        disabled={extractingId === inspectedMaterial.id}
                        onClick={() =>
                          handleTriggerAIExtraction(inspectedMaterial)
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                        <span>
                          {extractingId === inspectedMaterial.id
                            ? 'Extracting...'
                            : inspectedMaterial.format === 'pdf'
                            ? 'Extract PDF via Gemini AI'
                            : 'Request Backend AI Extraction'}
                        </span>
                      </button>

                      {inspectedMaterial.extractedTopics.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            handlePromoteTopicsFromMaterial(inspectedMaterial)
                          }
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Add Extracted Topics to Subject</span>
                        </button>
                      )}

                      {inspectedMaterial.extractedText && (
                        <button
                          type="button"
                          disabled={generatingQuizId === inspectedMaterial.id}
                          onClick={() =>
                            handleGenerateQuizFromMaterial(inspectedMaterial)
                          }
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {generatingQuizId === inspectedMaterial.id
                              ? 'Generating Quiz...'
                              : 'Generate AI Quiz'}
                          </span>
                        </button>
                      )}
                    </div>

                    {extractionFeedback && (
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {extractionFeedback}
                      </p>
                    )}
                  </div>
                )}
              </section>
            </>
          ) : (
            <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-10 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Select or create a subject to manage topics and learning materials.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
