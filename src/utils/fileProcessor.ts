import {
  LearningMaterial,
  MaterialFormat,
  MaterialProcessingStatus,
} from '../types/studysync';

export const SUPPORTED_MATERIAL_FORMATS: MaterialFormat[] = [
  'pdf',
  'txt',
  'docx',
  'pptx',
  'mp3',
  'mp4',
];

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB general cap
export const MAX_GEMINI_PDF_BYTES = 10 * 1024 * 1024; // 10 MB inline PDF cap for server Gemini processing

/**
 * Ephemeral in-memory registry for uploaded binary files in the current browser session
 * so PDFs can be sent to the backend Gemini extraction endpoint without inflating localStorage.
 */
const sessionFileRegistry = new Map<string, File>();

export function getSessionFile(materialId: string): File | undefined {
  return sessionFileRegistry.get(materialId);
}

export function clearSessionFile(materialId: string): void {
  sessionFileRegistry.delete(materialId);
}

export async function readFileAsBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function getExtensionFormat(fileName: string): MaterialFormat | null {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'txt' || ext === 'md') return 'txt';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'docx';
  if (ext === 'pptx') return 'pptx';
  if (ext === 'mp3') return 'mp3';
  if (ext === 'mp4') return 'mp4';
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Verifies magic-byte signatures for binary formats so disguised or corrupted files
 * are rejected cleanly before backend AI processing.
 */
async function verifyFileSignature(
  file: File,
  format: MaterialFormat
): Promise<string | null> {
  if (format === 'txt') return null;

  const headerSlice = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(headerSlice);

  if (format === 'pdf') {
    const sig = String.fromCharCode(...bytes.slice(0, 5));
    if (sig !== '%PDF-') {
      return `"${file.name}" does not have a valid PDF header (%PDF-). Please upload a valid PDF file.`;
    }
  } else if (format === 'docx' || format === 'pptx') {
    if (bytes.length < 2 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
      return `"${file.name}" is not a valid ${format.toUpperCase()} archive.`;
    }
  }
  return null;
}

/**
 * Extracts candidate topic headings/phrases from plain text read locally.
 */
export function extractKeyLinesFromPlainText(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 4 && l.length <= 80);

  const headings = lines.filter(
    (l) =>
      l.startsWith('#') ||
      l.endsWith(':') ||
      /^\d+[\.\)]\s+\S+/.test(l) ||
      /^[A-Z0-9\s\-&]{4,48}$/.test(l)
  );

  const source = headings.length > 0 ? headings : lines.slice(0, 5);
  const cleaned = source
    .map((h) =>
      h
        .replace(/^#+\s*/, '')
        .replace(/^\d+[\.\)]\s*/, '')
        .replace(/:$/, '')
        .trim()
    )
    .filter((h) => h.length >= 3);

  return Array.from(new Set(cleaned)).slice(0, 6);
}

/**
 * Reads audio/video metadata duration safely via browser media element when supported.
 */
async function probeMediaDuration(
  file: File,
  format: MaterialFormat
): Promise<number | undefined> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const isAudio = format === 'mp3' || file.type.startsWith('audio');
    const el = document.createElement(isAudio ? 'audio' : 'video');
    el.preload = 'metadata';
    const cleanup = () => URL.revokeObjectURL(objectUrl);

    el.onloadedmetadata = () => {
      const duration = Number.isFinite(el.duration)
        ? Math.round(el.duration)
        : undefined;
      cleanup();
      resolve(duration);
    };
    el.onerror = () => {
      cleanup();
      resolve(undefined);
    };
    el.src = objectUrl;
  });
}

/**
 * Processes an uploaded learning file honestly:
 * - TXT / MD: Reads real UTF-8 text client-side and extracts candidate headings/topics.
 * - PDF: Validates %PDF- magic bytes and retains the session File reference so server-side
 *   Gemini multimodal extraction can read the PDF directly when connected.
 * - DOCX / PPTX / MP3 / MP4: Validates format, signature/duration, and size locally,
 *   marking status `awaiting_backend_ai` without fabricating parsed contents.
 */
export async function processUploadedLearningFile(params: {
  file: File;
  subjectId: string;
  topicId?: string;
}): Promise<{ material?: LearningMaterial; error?: string }> {
  const { file, subjectId, topicId } = params;
  const format = getExtensionFormat(file.name);

  if (!format) {
    return {
      error: `Unsupported file type for "${file.name}". Supported formats: PDF, TXT, DOCX, PPTX, MP3, MP4.`,
    };
  }

  if (file.size === 0) {
    return {
      error: `"${file.name}" is empty (0 bytes). Please upload a file with content.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      error: `"${file.name}" exceeds the 50 MB prototype validation cap.`,
    };
  }

  const signatureError = await verifyFileSignature(file, format);
  if (signatureError) {
    return { error: signatureError };
  }

  const materialId = `mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  let processingStatus: MaterialProcessingStatus = 'awaiting_backend_ai';
  let processingNote = '';
  let extractedText: string | undefined;
  let extractedTopics: string[] = [];
  let mediaDurationSeconds: number | undefined;

  if (format === 'txt') {
    const rawText = await file.text();
    const trimmed = rawText.trim();
    if (!trimmed) {
      return {
        error: `"${file.name}" contains no readable text.`,
      };
    }
    extractedText = trimmed.slice(0, 12000);
    extractedTopics = extractKeyLinesFromPlainText(trimmed);
    processingStatus = 'parsed_client';
    processingNote =
      'Client-side UTF-8 text extracted directly in the browser. Ready for AI Quiz generation and Teach-Back grounding.';
  } else if (format === 'pdf') {
    sessionFileRegistry.set(materialId, file);
    processingStatus = 'awaiting_backend_ai';
    processingNote =
      file.size <= MAX_GEMINI_PDF_BYTES
        ? `Valid PDF verified (${formatFileSize(
            file.size
          )}). Ready for server-side Gemini PDF extraction.`
        : `Valid PDF verified (${formatFileSize(
            file.size
          )}). Exceeds 10 MB direct inline cap; requires Cloudflare R2 upload pipeline.`;
  } else if (format === 'mp3' || format === 'mp4') {
    mediaDurationSeconds = await probeMediaDuration(file, format);
    processingStatus = 'awaiting_backend_ai';
    processingNote =
      'Media file validated locally. Audio/video transcription and topic extraction require Cloudflare R2 storage + Gemini backend processing.';
  } else {
    processingStatus = 'awaiting_backend_ai';
    processingNote = `${format.toUpperCase()} archive validated locally (${formatFileSize(
      file.size
    )}). Full document parsing requires the backend Gemini extraction endpoint.`;
  }

  const material: LearningMaterial = {
    id: materialId,
    subjectId,
    topicId,
    fileName: file.name,
    format,
    fileSizeBytes: file.size,
    uploadedAt: new Date().toISOString(),
    processingStatus,
    processingNote,
    extractedText,
    extractedTopics,
    mediaDurationSeconds,
    isSampleData: false,
    r2ObjectKey: `uploads/${subjectId}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`,
  };

  return { material };
}
