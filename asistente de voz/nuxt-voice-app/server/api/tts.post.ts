// server/api/tts.post.ts
import { defineEventHandler, readBody, H3Event } from 'h3'
import fetch from 'node-fetch'

// ===============================
// MANEJADOR PRINCIPAL DE LA API
// ===============================
// Esta función maneja las solicitudes POST a /api/tts
// Recibe un texto, lo envía a la API de OpenAI para convertirlo en voz
// y devuelve el audio generado al frontend.
export default defineEventHandler(async (event: H3Event) => {
  try {
    // Lee el texto enviado en el cuerpo de la solicitud
    // Este texto será utilizado para generar el audio
    const { text } = await readBody(event)

    // Obtiene la configuración de entorno y la clave de API de OpenAI
    // La clave de API es necesaria para autenticar la solicitud a la API de OpenAI
    const config = useRuntimeConfig()
    const openaiApiKey = config.openaiApiKey

    // Verifica que la clave de API esté configurada
    // Si no está configurada, lanza un error
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set.')
    }

    // Realiza la solicitud a la API de OpenAI para generar el audio
    // La solicitud se realiza mediante el método POST y se envían los siguientes parámetros:
    // - model: El modelo de texto a voz utilizado (en este caso, 'tts-1')
    // - input: El texto a convertir en audio
    // - voice: La voz seleccionada para el audio (en este caso, 'nova')
    // - response_format: El formato de respuesta de audio (en este caso, 'opus')
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1', // Modelo de texto a voz
        input: text,    // Texto a convertir en audio
        voice: 'nova',  // Voz seleccionada
        response_format: 'opus', // Formato de respuesta de audio
      }),
    })

    // Si la respuesta no es exitosa, maneja el error y lo devuelve al frontend
    // La respuesta no exitosa puede ser debido a un error en la solicitud o en la API de OpenAI
    if (!response.ok) {
      const errorData = await response.json()
      console.error('Error de la API de OpenAI (TTS):', errorData)
      return new Response(JSON.stringify({ error: `Error al generar la voz: ${response.statusText}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Si la respuesta es exitosa, devuelve el audio generado
    // El audio se devuelve en formato 'opus' y se establece el encabezado 'Content-Type' correspondiente
    const audioBuffer = await response.arrayBuffer()
    return new Response(audioBuffer, {
      headers: { 'Content-Type': 'audio/opus' },
    })
  } catch (error: any) {
    // Maneja cualquier error inesperado y lo devuelve al frontend
    // El error inesperado puede ser debido a un problema en la ejecución del código
    console.error('Error inesperado (TTS):', error)
    return new Response(JSON.stringify({ error: `Ocurrió un error inesperado: ${error.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})