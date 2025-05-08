# 🤖 Nuxt.js 3 - Asistente de Voz con OpenAI

Este proyecto es una aplicación construida con **Nuxt.js 3** que ofrece funcionalidades de conversación por texto, transcripción de audio a texto y generación de voz, todo utilizando los servicios de **OpenAI**.

---

## 🚀 Funcionalidades

- 🧠 **Chat con IA:** Interacción con un asistente empático llamado *María* usando el modelo `gpt-4`.
- 🎙️ **Transcripción de Audio:** Convierte archivos de audio a texto usando el modelo `whisper-1` de OpenAI.
- 🔊 **Texto a Voz (TTS):** Genera voz a partir de texto con el modelo `tts-1`.

---

## 📁 Estructura de Archivos Relevantes

```bash
server/
└── api/
    ├── chat.post.ts          # Chat con GPT-4
    ├── transcribe.post.ts    # Transcripción de audio
    └── tts.post.ts           # Texto a voz
📦 Endpoints API
POST /api/chat
Envía mensajes para conversar con el asistente.

Body (JSON):

json
Copiar
Editar
{
  "messages": [
    { "role": "user", "content": "Hola, ¿cómo estás?" }
  ]
}
Respuesta:

json
Copiar
Editar
{
  "reply": "¡Hola! Estoy aquí para ayudarte."
}
POST /api/transcribe
Transcribe un archivo de audio (formato .webm, máx. 10MB).

Formulario (multipart/form-data):

file: archivo de audio

Respuesta:

json
Copiar
Editar
{
  "text": "Texto transcrito del audio"
}
POST /api/tts
Convierte texto a voz usando el modelo tts-1.

Body (JSON):

json
Copiar
Editar
{
  "text": "Hola, ¿en qué puedo ayudarte?"
}
Respuesta:

Archivo de audio en formato audio/opus.

🔐 Configuración
Agrega tu clave API de OpenAI en el archivo .env:

env
Copiar
Editar
OPENAI_API_KEY=tu_clave_aqui
En tu archivo nuxt.config.ts:

ts
Copiar
Editar
runtimeConfig: {
  openaiApiKey: process.env.OPENAI_API_KEY
}
⚠️ Notas
Los archivos de audio no deben superar los 10MB.

La API de texto a voz responde con archivos en formato opus.

Se recomienda usar gpt-4, aunque puedes cambiar a gpt-3.5-turbo si es necesario.

🛠️ Requisitos
Node.js 18+

Nuxt.js 3

Clave de OpenAI con acceso a GPT-4, Whisper y TTS

🧑‍💻 Autor
Desarrollado por camilo campos – Basado en tecnologías de OpenAI y Nuxt 3.