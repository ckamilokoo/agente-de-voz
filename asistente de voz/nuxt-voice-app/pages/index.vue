<template>
    <div class="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white font-sans">
      <div class="lg:flex lg:flex-row lg:h-screen">
        <!-- Avatar 3D - Ajustado para diferentes tamaños -->
        <div class="relative w-full h-[40vh] md:h-[50vh] lg:h-screen lg:w-1/2 lg:fixed lg:left-0">
          <canvas ref="avatarCanvas" class="w-full h-full"></canvas>
          <div class="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black to-transparent lg:hidden"></div>
        </div>
  
        <!-- Interfaz de Chat - Ajustada para diferentes tamaños -->
        <div class="container mx-auto px-4 pb-24 lg:w-1/2 lg:ml-auto lg:pl-8 lg:pr-8 lg:py-8 lg:h-screen lg:overflow-y-auto lg:flex lg:flex-col">
          <!-- Título visible solo en pantallas grandes -->
          <h1 class="hidden lg:block text-3xl font-bold mb-6 text-cyan-400">Asistente Virtual</h1>
          
          <!-- Mensajes -->
          <div ref="chatContainer" class="rounded-lg bg-gray-800/50 backdrop-blur-sm p-4 mb-4 h-[30vh] md:h-[25vh] lg:h-auto lg:flex-grow lg:mb-6 overflow-y-auto">
            <div v-if="messages.length === 0" class="flex items-center justify-center h-full text-gray-400">
              <p>Haz una pregunta para comenzar la conversación</p>
            </div>
            <div v-for="(message, index) in messages" :key="index" class="mb-4">
              <div :class="[
                'p-3 rounded-lg max-w-[85%] md:max-w-[70%] lg:max-w-[80%]', 
                message.role === 'user' ? 'bg-blue-600 ml-auto' : 'bg-gray-700'
              ]">
                <p>{{ message.content }}</p>
              </div>
            </div>
          </div>
  
          <!-- Controles -->
          <div class="bg-gray-800/70 backdrop-blur-sm rounded-lg p-4 lg:p-6">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center space-x-2 md:space-x-4">
                <button 
                  @click="toggleRecording" 
                  class="w-14 h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center transition-all"
                  :class="isRecording ? 'bg-red-600 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'"
                >
                  <mic-icon v-if="!isRecording" class="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10" />
                  <square-icon v-else class="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10" />
                </button>
                <div class="text-sm md:text-base lg:text-lg">
                  <p v-if="isRecording" class="text-red-400">Grabando...</p>
                  <p v-else class="text-gray-400">Presiona para hablar</p>
                </div>
              </div>
              <div class="flex items-center space-x-2 md:space-x-4">
                <button 
                  @click="toggleMute" 
                  class="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center bg-gray-700 hover:bg-gray-600"
                >
                  <volume-x-icon v-if="isMuted" class="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />
                  <volume-2-icon v-else class="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />
                </button>
              </div>
            </div>
  
            <div v-if="processingState !== ''" class="text-center text-sm md:text-base lg:text-lg text-cyan-400 animate-pulse">
              {{ processingState }}
            </div>
  
            <audio ref="audioPlayer" class="hidden"></audio>
          </div>
        </div>
      </div>
  
      <!-- Indicador de estado -->
      <div class="fixed bottom-0 left-0 right-0 h-1">
        <div 
          v-if="isProcessing" 
          class="h-full bg-cyan-500 animate-pulse"
        ></div>
      </div>
    </div>
</template>
  
<script setup>
  import { ref, onMounted, nextTick, watch, onUnmounted } from 'vue';
  import * as THREE from 'three';
  import { MicIcon, SquareIcon, Volume2Icon, VolumeXIcon } from 'lucide-vue-next';
  
  // Referencias
  const avatarCanvas = ref(null);
  const audioPlayer = ref(null);
  const chatContainer = ref(null);
  
  // Estado
  const isRecording = ref(false);
  const isMuted = ref(false);
  const isProcessing = ref(false);
  const processingState = ref('');
  const messages = ref([]);
  
  // Variables para grabación
  let mediaRecorder = null;
  let audioChunks = [];
  let scene, camera, renderer, avatar, analyser, dataArray;
  
  // Inicializar escena 3D
  const initThreeJS = () => {
    // Crear escena
    scene = new THREE.Scene();
    
    // Configurar cámara
    camera = new THREE.PerspectiveCamera(
      75, 
      avatarCanvas.value.clientWidth / avatarCanvas.value.clientHeight, 
      0.1, 
      1000
    );
    camera.position.z = 5;
    
    // Configurar renderer
    renderer = new THREE.WebGLRenderer({ 
      canvas: avatarCanvas.value,
      antialias: true,
      alpha: true
    });
    renderer.setSize(avatarCanvas.value.clientWidth, avatarCanvas.value.clientHeight);
    renderer.setClearColor(0x000000, 0);
    
    // Iluminación
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0x00ffff, 1);
    directionalLight.position.set(0, 1, 2);
    scene.add(directionalLight);
    
    // Crear avatar (esfera con efecto de onda)
    const geometry = new THREE.SphereGeometry(2, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x0088aa,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    
    avatar = new THREE.Mesh(geometry, material);
    scene.add(avatar);
    
    // Configurar analizador de audio
    const listener = new THREE.AudioListener();
    camera.add(listener);
    
    const sound = new THREE.Audio(listener);
    const audioContext = listener.context;
    
    analyser = new THREE.AudioAnalyser(sound, 128);
    dataArray = new Uint8Array(analyser.analyser.frequencyBinCount);
    
    // Iniciar animación
    animate();
    
    // Manejar redimensionamiento
    window.addEventListener('resize', onWindowResize);
  };
  
  // Función de animación
  const animate = () => {
    requestAnimationFrame(animate);
    
    // Rotar avatar
    avatar.rotation.y += 0.005;
    
    // Efecto de pulso
    const time = Date.now() * 0.001;
    avatar.scale.x = 1 + Math.sin(time) * 0.1;
    avatar.scale.y = 1 + Math.sin(time) * 0.1;
    avatar.scale.z = 1 + Math.sin(time) * 0.1;
    
    // Efecto de onda cuando habla
    if (isProcessing.value) {
      // Simular análisis de audio
      const pulseIntensity = 0.2 + Math.sin(Date.now() * 0.01) * 0.1;
      
      // Deformar geometría
      const positions = avatar.geometry.attributes.position;
      const count = positions.count;
      
      for (let i = 0; i < count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        
        const distance = Math.sqrt(x * x + y * y + z * z);
        const originalDistance = 2; // Radio original
        
        const ratio = originalDistance / distance;
        const newDistance = originalDistance + Math.sin(time * 5 + y * 2) * pulseIntensity;
        
        positions.setX(i, x * (newDistance / distance));
        positions.setY(i, y * (newDistance / distance));
        positions.setZ(i, z * (newDistance / distance));
      }
      
      positions.needsUpdate = true;
    }
    
    renderer.render(scene, camera);
  };
  
  // Manejar redimensionamiento
  const onWindowResize = () => {
    camera.aspect = avatarCanvas.value.clientWidth / avatarCanvas.value.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(avatarCanvas.value.clientWidth, avatarCanvas.value.clientHeight);
  };
  
  // Iniciar/detener grabación
  const toggleRecording = async () => {
    if (isRecording.value) {
      stopRecording();
    } else {
      await startRecording();
    }
  };
  
  // Iniciar grabación
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      
      mediaRecorder.ondataavailable = (e) => {
        audioChunks.push(e.data);
      };
      
      mediaRecorder.start();
      isRecording.value = true;
    } catch (error) {
      console.error('Error al iniciar la grabación:', error);
    }
  };
  
  // Detener grabación y procesar audio
  const stopRecording = () => {
    if (!mediaRecorder) return;

    mediaRecorder.stop();
    isRecording.value = false;
    isProcessing.value = true;

    mediaRecorder.onstop = async () => {
      try {
        processingState.value = 'Enviando audio...';
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' }); // O el tipo que elijas

        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.wav'); // 'audio' es el nombre del campo que tu backend esperará

        const transcribeRes = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData, // ¡Enviar formData en el body!
        });

        if (!transcribeRes.ok) {
          const errorData = await transcribeRes.json();
          console.error('Error en la transcripción:', errorData);
          processingState.value = 'Error en la transcripción.';
          isProcessing.value = false;
          return;
        }

        const { text } = await transcribeRes.json();

        // Agregar mensaje del usuario
        messages.value.push({ role: 'user', content: text });
        scrollToBottom();

        // Generar respuesta (esta parte debería funcionar si la transcripción es exitosa)
        processingState.value = 'Generando respuesta...';
        const chatRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messages.value.map(m => ({ role: m.role, content: m.content }))
          })
        });

        if (!chatRes.ok) {
          const errorData = await chatRes.json();
          console.error('Error en la API de chat:', errorData);
          processingState.value = 'Error al generar la respuesta.';
          isProcessing.value = false;
          return;
        }

        const { reply } = await chatRes.json();

        // Agregar respuesta del asistente
        messages.value.push({ role: 'assistant', content: reply });
        scrollToBottom();

        // Convertir texto a voz (esta parte debería funcionar si la respuesta se genera)
        processingState.value = 'Generando audio...';
        const ttsRes = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: reply })
        });

        if (!ttsRes.ok) {
          const errorData = await ttsRes.blob();
          console.error('Error en la síntesis de voz:', errorData);
          processingState.value = 'Error al generar el audio.';
          isProcessing.value = false;
          return;
        }

        const audioData = await ttsRes.blob();
        const audioUrl = URL.createObjectURL(audioData);

        // Reproducir audio
        audioPlayer.value.src = audioUrl;
        if (!isMuted.value) {
          audioPlayer.value.play();
        }

        isProcessing.value = false;
        processingState.value = '';
      } catch (error) {
        console.error('Error al procesar audio:', error);
        isProcessing.value = false;
        processingState.value = '';
      }
    };
  };
  
  // Alternar silencio
  const toggleMute = () => {
    isMuted.value = !isMuted.value;
    audioPlayer.value.muted = isMuted.value;
  };
  
  // Desplazar al final del chat
  const scrollToBottom = async () => {
    await nextTick();
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  };
  
  // Inicializar
  onMounted(() => {
    initThreeJS();
    
    // Mensaje de bienvenida
    setTimeout(() => {
      messages.value.push({ 
        role: 'assistant', 
        content: '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?' 
      });
      
      // Reproducir mensaje de bienvenida
      fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?' 
        })
      })
      .then(res => res.blob())
      .then(audioData => {
        const audioUrl = URL.createObjectURL(audioData);
        audioPlayer.value.src = audioUrl;
        if (!isMuted.value) {
          audioPlayer.value.play();
        }
      });
    }, 1000);
  });
  
  // Limpiar al desmontar
  onUnmounted(() => {
    window.removeEventListener('resize', onWindowResize);
    
    // Limpiar recursos de Three.js
    if (renderer) {
      renderer.dispose();
    }
    
    if (avatar) {
      avatar.geometry.dispose();
      avatar.material.dispose();
    }
  });
</script>
  
<style>
  @import 'tailwindcss/base';
  @import 'tailwindcss/components';
  @import 'tailwindcss/utilities';
  
  :root {
    --color-primary: rgb(0, 255, 255);
    --color-secondary: rgb(0, 136, 170);
  }
  
  body {
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    overflow-x: hidden;
  }
  
  /* Animaciones */
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
  
  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  /* Scrollbar personalizado */
  ::-webkit-scrollbar {
    width: 6px;
  }
  
  ::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: var(--color-secondary);
    border-radius: 10px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: var(--color-primary);
  }
</style>