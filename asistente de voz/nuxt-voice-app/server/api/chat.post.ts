// server/api/chat.post.ts
import { defineEventHandler, readBody, H3Event } from 'h3'
import fetch from 'node-fetch'

// Define el tipo esperado para la respuesta de OpenAI
interface OpenAIChatCompletionResponse {
  choices?: {
    message?: {
      content?: string
    }
  }[]
}

// Define el tipo esperado del cuerpo de la solicitud
interface ChatRequestBody {
  messages: {
    role: 'user' | 'assistant' | 'system'
    content: string
  }[]
}

export default defineEventHandler(async (event: H3Event) => {
  try {
    const { messages } = await readBody<ChatRequestBody>(event)
    const config = useRuntimeConfig()
    const openaiApiKey = config.openaiApiKey

    // Agrega un system prompt al inicio del chat si no existe
    const systemPrompt = {
      role: 'system' as const,
      content: 'Eres un asistente útil llamado maria , empático que responde con precisión y claridad a los mensajes de los usuarios los cuales quieren hablar contigo. En tus respuestas no te excedas de un maximo de 25 palabras',
    }

    const finalMessages = [systemPrompt, ...messages]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4', // Cambiar por 'gpt-3.5-turbo' si es necesario
        messages: finalMessages,
        max_tokens: 512,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Error de la API de OpenAI:', errorData)
      return { reply: `Error al comunicarse con la API de OpenAI: ${response.statusText}` }
    }

    const data = (await response.json()) as OpenAIChatCompletionResponse

    return {
      reply: data.choices?.[0]?.message?.content ?? 'No se recibió respuesta.',
    }
  } catch (error: any) {
    console.error('Error inesperado:', error)
    return { reply: `Ocurrió un error inesperado: ${error.message}` }
  }
})
