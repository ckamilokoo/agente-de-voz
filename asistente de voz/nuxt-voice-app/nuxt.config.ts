import { defineNuxtConfig } from 'nuxt/config'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  nitro: {
    experimental: {
      compatibilityDate: '2025-05-09'
    }
  },
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss'
  ],
  runtimeConfig: {
    // solo disponible en servidor
    openaiApiKey: process.env.OPENAI_API_KEY,
    // disponible en cliente y en servidor bajo useRuntimeConfig().public
    public: {
      openaiApiKey: process.env.OPENAI_API_KEY
    }
  },
  app: {
    head: {
      title: 'Asistente de Voz IA',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Asistente de voz con inteligencia artificial y avatar 3D' }
      ]
    }
  }
})