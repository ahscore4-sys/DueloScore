import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { callerIsAdmin } from './adminGuards';

const ARABIC_STOP_WORDS = new Set([
  'من', 'إلى', 'عن', 'على', 'في', 'إنه', 'كانت', 'كان', 'أن', 'هذا', 'هذه', 'ذلك', 'تلك', 'أو', 'بل', 'ثم', 'لا', 'لم', 'لن', 'ما', 'كيف', 'أين', 'متى', 'إن', 'لكن', 'إلا', 'غير', 'كـ', 'فـ', 'ولـ', 'جداً'
]);

function extractiveSummary(text: string): string {
  if (!text) return '';

  const normalized = text
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/[يى]/g, 'ي')
    .replace(/[ةه]/g, 'ه');

  const sentenceRegex = /[.!?؛:\n\r]+/;
  const sentences = normalized
    .split(sentenceRegex)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (sentences.length === 0) return text.slice(0, 280);

  const wordFreq: Map<string, number> = new Map();
  for (const sent of sentences) {
    const words = sent.split(/\s+/);
    for (const w of words) {
      const word = w.toLowerCase();
      if (word.length > 1 && !ARABIC_STOP_WORDS.has(word)) {
        wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
      }
    }
  }

  const scored: Array<{ index: number; sentence: string; score: number }> = [];
  sentences.forEach((sent, idx) => {
    const words = sent.split(/\s+/);
    let sumFreq = 0;
    for (const w of words) {
      const word = w.toLowerCase();
      if (word.length > 1 && !ARABIC_STOP_WORDS.has(word)) {
        sumFreq += (wordFreq.get(word) ?? 0);
      }
    }
    const positionWeight = 1.0 + (sentences.length - idx) * 0.5;
    const score = sumFreq * positionWeight;
    scored.push({ index: idx, sentence: sent, score });
  });

  scored.sort((a, b) => b.score - a.score);

  const topCount = Math.min(3, scored.length);
  const selected = scored.slice(0, topCount);

  selected.sort((a, b) => a.index - b.index);

  let summary = selected.map(s => s.sentence).join(' ');

  if (summary.length > 280) {
    summary = summary.slice(0, 280);
    const lastSpace = summary.lastIndexOf(' ');
    if (lastSpace > 200) summary = summary.slice(0, lastSpace);
  }

  return summary.trim() || text.slice(0, 280).trim();
}

export const generateNewsSummary = onCall(async (request: CallableRequest) => {
  const isAdmin = await callerIsAdmin(request);
  if (!isAdmin) {
    throw new HttpsError('permission-denied', 'Admin privileges required.');
  }

  const { title, content } = (request.data ?? {}) as { title?: string; content?: string };
  if (!content || typeof content !== 'string' || !content.trim()) {
    throw new HttpsError('invalid-argument', 'content is required and must be a non-empty string');
  }

  const safeTitle = typeof title === 'string' ? title.trim() : '';
  const safeContent = content.trim().slice(0, 12_000);

  try {
    const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite';
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in the environment');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const promptText = safeTitle
      ? `العنوان: ${safeTitle}\n\nملخص المقال التالي بالعربية في 2-3 جمل وبدون مقدمات:\n\n${safeContent}`
      : `ملخص المقال التالي بالعربية في 2-3 جمل وبدون مقدمات:\n\n${safeContent}`;

    const requestBody = {
      contents: [{
        parts: [{
          text: promptText
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 400,
        thinkingConfig: { thinkingBudget: 0 }
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Gemini API responded with status: ${response.status}`);
    }

    const data = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };

    const candidate = data.candidates?.[0];
    const textParts = candidate?.content?.parts;
    const generatedText = textParts?.[0]?.text ?? '';

    let summary = generatedText
      .replace(/^[\s\*\-\•\:\“”\"\'\n]+|[\s\*\-\•\:\“”\"\'\n]+$/g, '')
      .trim();

    if (!summary) {
      throw new Error('Model returned empty summary');
    }

    return { summary, source: 'ai' as const };
  } catch (error) {
    console.warn('Failed to generate summary via Gemini API, falling back to extractive summary:', error);
    const fallbackSummary = extractiveSummary(safeContent);
    return { summary: fallbackSummary, source: 'fallback' as const };
  }
});