import {
  AIProcessingResult,
  LearningMaterial,
  QuizGenerationResult,
  QuizQuestion,
  Subject,
  Topic,
} from '../types/studysync';
import { postApiJson } from './apiClient';
import {
  getSessionFile,
  MAX_GEMINI_PDF_BYTES,
  readFileAsBase64,
} from '../utils/fileProcessor';

/**
 * Gemini AI Service Layer.
 * Isolated from UI components and local business logic.
 * - When the server-side Gemini endpoint is connected (`GEMINI_API_KEY` configured),
 *   requests run through `/api/ai/teach-back`, `/api/ai/extract-topics`, and `/api/ai/generate-quiz`.
 * - When the API is not connected, Teach-Back returns an explicitly labeled `demonstration`
 *   rubric, and quiz generation honestly reports `unavailable` without fabricating fake AI questions.
 */

interface TeachBackApiResponse {
  aiConnected: boolean;
  result?: AIProcessingResult;
  error?: string;
}

interface ExtractTopicsApiResponse {
  aiConnected: boolean;
  extractedTopics?: string[];
  extractedText?: string;
  summaryNote?: string;
  error?: string;
}

interface GenerateQuizApiResponse {
  aiConnected: boolean;
  modelLabel?: string;
  questions?: QuizQuestion[];
  error?: string;
}

function buildDemonstrationTeachBack(params: {
  topic: Topic;
  studentExplanation: string;
  groundedMaterial?: LearningMaterial;
  reasonNote: string;
}): AIProcessingResult {
  const { topic, studentExplanation, groundedMaterial, reasonNote } = params;
  const normalized = studentExplanation.toLowerCase();

  const matchedConcepts: string[] = [];
  const missingConcepts: string[] = [];

  for (const concept of topic.keyConcepts) {
    const tokens = concept
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const matched =
      normalized.includes(concept.toLowerCase()) ||
      tokens.some((token) => normalized.includes(token));
    if (matched) {
      matchedConcepts.push(concept);
    } else {
      missingConcepts.push(concept);
    }
  }

  const wordCount = studentExplanation.trim().split(/\s+/).filter(Boolean).length;
  const strengths: string[] = [];
  if (matchedConcepts.length > 0) {
    strengths.push(`Referenced key concepts: ${matchedConcepts.join(', ')}.`);
  } else {
    strengths.push(
      'You attempted to articulate the topic in your own words, which surfaces recall gaps clearly.'
    );
  }

  if (wordCount >= 25) {
    strengths.push(
      `Provided a structured explanation (${wordCount} words) rather than a single-term guess.`
    );
  }

  const suggestedImprovements: string[] = [];
  if (missingConcepts.length > 0) {
    suggestedImprovements.push(
      `Incorporate how ${missingConcepts.slice(0, 2).join(' and ')} connect to ${topic.title}.`
    );
  }
  if (wordCount < 20) {
    suggestedImprovements.push(
      'Expand with a concrete example or cause-and-effect explanation to verify deeper understanding.'
    );
  }
  if (groundedMaterial?.extractedText) {
    suggestedImprovements.push(
      `Cross-check your answer against "${groundedMaterial.fileName}" before retaking a quiz.`
    );
  }

  return {
    mode: 'demonstration',
    modelLabel:
      'Demonstration Preview (Local Concept Rubric — Gemini API Not Connected)',
    statusMessage: reasonNote,
    strengths,
    missingConcepts:
      missingConcepts.length > 0
        ? missingConcepts
        : ['No major core concepts omitted from the topic checklist.'],
    suggestedImprovements:
      suggestedImprovements.length > 0
        ? suggestedImprovements
        : ['Try explaining an edge case or trade-off to deepen mastery.'],
    groundedMaterialTitle: groundedMaterial?.fileName,
    clarityScoreNote: `Demonstration concept coverage: ${matchedConcepts.length}/${topic.keyConcepts.length} topic checklist terms detected locally.`,
  };
}

export async function evaluateTeachBackExplanation(params: {
  topic: Topic;
  promptQuestion: string;
  studentExplanation: string;
  groundedMaterial?: LearningMaterial;
}): Promise<{ result: AIProcessingResult; apiError?: string }> {
  const { topic, promptQuestion, studentExplanation, groundedMaterial } = params;

  const response = await postApiJson<
    {
      topicTitle: string;
      keyConcepts: string[];
      promptQuestion: string;
      studentExplanation: string;
      materialExcerpt?: string;
      materialTitle?: string;
    },
    TeachBackApiResponse
  >('/api/ai/teach-back', {
    topicTitle: topic.title,
    keyConcepts: topic.keyConcepts,
    promptQuestion,
    studentExplanation,
    materialExcerpt: groundedMaterial?.extractedText?.slice(0, 6000),
    materialTitle: groundedMaterial?.fileName,
  });

  if (!response.ok) {
    return {
      apiError: response.error ?? 'Gemini endpoint returned an error.',
      result: buildDemonstrationTeachBack({
        topic,
        studentExplanation,
        groundedMaterial,
        reasonNote: `Live Gemini service returned an error (${response.error ?? 'unavailable'}). Showing clearly labeled Demonstration Concept Check below.`,
      }),
    };
  }

  if (response.data?.aiConnected && response.data.result) {
    return { result: response.data.result };
  }

  return {
    result: buildDemonstrationTeachBack({
      topic,
      studentExplanation,
      groundedMaterial,
      reasonNote:
        'Demonstration State: GEMINI_API_KEY is not configured on the backend proxy. Showing deterministic concept-checklist matching against your study material.',
    }),
  };
}

export async function requestBackendMaterialExtraction(params: {
  material: LearningMaterial;
  subjectName: string;
}): Promise<{
  connected: boolean;
  extractedTopics?: string[];
  extractedText?: string;
  summaryNote?: string;
  error?: string;
}> {
  const { material, subjectName } = params;
  let pdfBase64: string | undefined;

  if (material.format === 'pdf' && !material.extractedText) {
    const file = getSessionFile(material.id);
    if (file) {
      if (file.size > MAX_GEMINI_PDF_BYTES) {
        return {
          connected: false,
          error:
            'This PDF exceeds the 10 MB direct extraction limit. Connect Cloudflare R2 storage for larger files.',
        };
      }
      pdfBase64 = await readFileAsBase64(file);
    }
  }

  const response = await postApiJson<
    {
      fileName: string;
      format: string;
      subjectName: string;
      extractedText?: string;
      pdfBase64?: string;
    },
    ExtractTopicsApiResponse
  >('/api/ai/extract-topics', {
    fileName: material.fileName,
    format: material.format,
    subjectName,
    extractedText: material.extractedText,
    pdfBase64,
  });

  if (!response.ok) {
    return {
      connected: false,
      error: response.error ?? 'Backend extraction failed.',
    };
  }

  if (!response.data?.aiConnected) {
    return {
      connected: false,
      summaryNote:
        'Gemini backend not connected (GEMINI_API_KEY unset). Set GEMINI_API_KEY on the server or deploy Cloudflare Workers + Hono + R2 for PDF/media parsing.',
    };
  }

  return {
    connected: true,
    extractedTopics: response.data.extractedTopics,
    extractedText: response.data.extractedText,
    summaryNote: response.data.summaryNote,
  };
}

export async function generateQuizFromMaterial(params: {
  subject: Subject;
  topic: Topic;
  material?: LearningMaterial;
  questionCount: number;
}): Promise<{ result: QuizGenerationResult; apiError?: string }> {
  const { subject, topic, material, questionCount } = params;

  const response = await postApiJson<
    {
      subjectId: string;
      subjectName: string;
      topicId: string;
      topicTitle: string;
      topicSummary: string;
      keyConcepts: string[];
      materialId?: string;
      materialTitle?: string;
      materialExcerpt?: string;
      questionCount: number;
    },
    GenerateQuizApiResponse
  >('/api/ai/generate-quiz', {
    subjectId: subject.id,
    subjectName: subject.name,
    topicId: topic.id,
    topicTitle: topic.title,
    topicSummary: topic.summary,
    keyConcepts: topic.keyConcepts,
    materialId: material?.id,
    materialTitle: material?.fileName,
    materialExcerpt: material?.extractedText?.slice(0, 12000),
    questionCount,
  });

  if (!response.ok) {
    return {
      apiError: response.error ?? 'Quiz generation endpoint returned an error.',
      result: {
        mode: 'unavailable',
        modelLabel: 'Gemini Quiz Generator Unavailable',
        statusMessage: `Unable to reach live Gemini quiz generation (${response.error ?? 'server unavailable'}). Existing sample questions remain available for preloaded topics.`,
        questions: [],
      },
    };
  }

  if (!response.data?.aiConnected || !Array.isArray(response.data.questions)) {
    return {
      result: {
        mode: 'unavailable',
        modelLabel: 'Demonstration Mode (Gemini API Not Connected)',
        statusMessage:
          'GEMINI_API_KEY is not configured on the backend proxy. Dynamic quiz generation from uploaded materials requires a connected Gemini backend—StudySync AI does not fabricate fake AI questions.',
        questions: [],
      },
    };
  }

  return {
    result: {
      mode: 'live_gemini',
      modelLabel: response.data.modelLabel ?? 'Gemini 4 Hydrogen (Server-Side API)',
      statusMessage: material
        ? `Generated ${response.data.questions.length} questions grounded in "${material.fileName}".`
        : `Generated ${response.data.questions.length} questions for "${topic.title}".`,
      questions: response.data.questions,
    },
  };
}
