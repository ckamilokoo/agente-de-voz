// server/api/tts.post.ts
import { defineEventHandler, readBody, H3Event } from 'h3'
import fetch from 'node-fetch'

export default defineEventHandler(async (event: H3Event) => {
  try {
    const { text } = await readBody(event)
    const config = useRuntimeConfig()
    const openaiApiKey = config.openaiApiKey

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set.')
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: 'nova', // Cambiado a 'nova'
        response_format: 'opus',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Error de la API de OpenAI (TTS):', errorData)
      return new Response(JSON.stringify({ error: `Error al generar la voz: ${response.statusText}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const audioBuffer = await response.arrayBuffer()
    return new Response(audioBuffer, {
      headers: { 'Content-Type': 'audio/opus' },
    })
  } catch (error: any) {
    console.error('Error inesperado (TTS):', error)
    return new Response(JSON.stringify({ error: `Ocurrió un error inesperado: ${error.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})