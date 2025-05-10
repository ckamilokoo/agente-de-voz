// server/api/transcribe.post.ts
import { defineEventHandler, readMultipartFormData, H3Event, createError } from 'h3';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { Buffer } from 'node:buffer';

// ===============================
// INTERFACES Y TIPOS DE DATOS
// ===============================
// Estas interfaces definen la estructura de los datos que se esperan recibir
// y devolver en la API de transcripción.

// Respuesta esperada de la transcripción de OpenAI
interface TranscriptionResponse {
  // El texto transcrito del archivo de audio
  text: string;
}

// Estructura esperada para un error devuelto por la API de OpenAI
interface OpenAIErrorResponse {
  // Información detallada del error
  error?: {
    // Mensaje de error
    message?: string;
    // Tipo de error
    type?: string;
    // Parámetro relacionado con el error
    param?: string;
    // Código de error
    code?: string | null;
  };
}

// Función auxiliar para verificar si un error tiene un mensaje
function isErrorWithMessage(error: unknown): error is { message: string } {
  // Verifica si el error es un objeto con una propiedad 'message'
  return typeof error === 'object' && error !== null && 'message' in error;
}

// ===============================
// MANEJADOR PRINCIPAL DE LA API
// ===============================
// Esta función maneja las solicitudes POST a /api/transcribe
// Recibe un archivo de audio, lo envía a la API de OpenAI para transcribirlo,
// y devuelve el texto transcrito al frontend.

export default defineEventHandler(async (event: H3Event) => {
  try {
    // Lee el formulario multipart que contiene el archivo de audio
    const body = await readMultipartFormData(event);
    // Busca la parte del formulario que corresponde al archivo de audio
    const filePart = body?.find(part => part.name === 'file');

    // Validaciones
    // Verifica si se recibió un archivo de audio
    if (!filePart?.data) {
      // Si no se recibió, devuelve un error 400
      throw createError({
        statusCode: 400,
        statusMessage: 'No se recibió un archivo de audio'
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