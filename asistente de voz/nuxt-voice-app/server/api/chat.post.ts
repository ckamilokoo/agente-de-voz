// server/api/chat.post.ts
import { defineEventHandler, readBody, H3Event } from 'h3'
import fetch from 'node-fetch'

// ===============================
// INTERFACES Y TIPOS DE DATOS
// ===============================

// Esta interfaz representa la estructura esperada de la respuesta de la API de OpenAI
// La respuesta contiene un arreglo de "choices", cada uno con un mensaje y su contenido
interface OpenAIChatCompletionResponse {
  choices?: {
    message?: {
      content?: string
    }
  }[]
}

// Esta interfaz define el formato del cuerpo de la solicitud que recibe la API
// El cuerpo debe incluir un arreglo de mensajes, donde cada mensaje tiene un rol y un contenido
interface ChatRequestBody {
  messages: {
    role: 'user' | 'assistant' | 'system'
    content: string
  }[]
}

// ===============================
// MANEJADOR PRINCIPAL DE LA API
// ===============================

// Esta función maneja las solicitudes POST a /api/chat
// Lee los mensajes enviados por el usuario, agrega un mensaje de sistema si es necesario,
// y realiza una solicitud a la API de OpenAI para obtener una respuesta del asistente IA.
export default defineEventHandler(async (event: H3Event) => {
  try {
    // Lee el cuerpo de la solicitud, que debe contener los mensajes del chat
    const { messages } = await readBody<ChatRequestBody>(event)
    // Obtiene la configuración de entorno, incluyendo la clave de API de OpenAI
    const config = useRuntimeConfig()
    const openaiApiKey = config.openaiApiKey

    // Crea el mensaje de sistema que define el comportamiento del asistente
    // Este mensaje se coloca al inicio de la conversación para guiar a la IA
    const systemPrompt = {
      role: 'system' as const,
      content: 'Eres un asistente útil llamado maria , empática que responde con precisión y claridad a los mensajes de los usuarios los cuales quieren hablar contigo. En tus respuestas no te excedas de un maximo de 25 palabras',
    }

    // Combina el mensaje de sistema con los mensajes recibidos del usuario
    // Esto asegura que la IA siempre tenga el contexto adecuado
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
