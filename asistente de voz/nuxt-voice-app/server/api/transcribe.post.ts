// server/api/transcribe.post.ts
import { defineEventHandler, readMultipartFormData, H3Event, createError } from 'h3';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { Buffer } from 'node:buffer';

interface TranscriptionResponse {
  text: string;
}

interface OpenAIErrorResponse {
  error?: {
    message?: string;
    type?: string;
    param?: string;
    code?: string | null;
  };
}

function isErrorWithMessage(error: unknown): error is { message: string } {
  return typeof error === 'object' && error !== null && 'message' in error;
}

export default defineEventHandler(async (event: H3Event) => {
  try {
    const body = await readMultipartFormData(event);
    const filePart = body?.find(part => part.name === 'file');

    // Validaciones
    if (!filePart?.data) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No audio file received'
      });
    }

    if (filePart.data.byteLength > 10 * 1024 * 1024) {
      throw createError({
        statusCode: 413,
        statusMessage: 'File too large (max 10MB)'
      });
    }

    const config = useRuntimeConfig();
    const openaiApiKey = config.openaiApiKey;

    if (!openaiApiKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'OpenAI API key not configured'
      });
    }

    const form = new FormData();
    form.append('file', filePart.data, {
      filename: filePart.filename || 'audio.webm',
      contentType: filePart.type || 'audio/webm'
    });
    form.append('model', 'whisper-1');
    form.append('response_format', 'json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        ...form.getHeaders()
      },
      body: form.getBuffer()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as OpenAIErrorResponse; // Castear aquí
      throw createError({
        statusCode: response.status,
        statusMessage: errorData.error?.message || 'Transcription failed',
        data: errorData
      });
    }

    const data = await response.json() as TranscriptionResponse;
    return { text: data.text };

  } catch (error: unknown) {
    if (isErrorWithMessage(error)) {
      console.error('Transcription error:', error.message);
      throw createError({
        statusCode: (error as any).statusCode || 500,
        statusMessage: error.message,
        data: (error as any).data
      });
    }

    console.error('Unknown transcription error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Unknown audio processing error'
    });
  }
});