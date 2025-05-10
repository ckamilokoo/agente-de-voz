<template>
  <div class="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white font-sans">
    <div class="flex flex-col items-center min-h-screen">
      <!-- AI Avatar 3D Sphere - Positioned above chat -->
      <div class="relative w-full max-w-2xl h-[35vh] md:h-[40vh] lg:h-[45vh] flex-shrink-0">
        <canvas ref="avatarCanvas" class="w-full h-full"></canvas>
        <!-- Holographic overlay effect -->
        <div class="absolute inset-0 pointer-events-none">
          <div class="absolute inset-0 bg-gradient-radial from-cyan-500/10 to-transparent opacity-30"></div>
          <div class="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent"></div>
        </div>
        <!-- AI Status Indicator -->
        <div class="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full z-10">
          <span class="w-2 h-2 rounded-full" :class="isProcessing ? 'bg-cyan-400 animate-pulse' : 'bg-green-400'"></span>
          <span class="text-xs text-cyan-300">{{ isProcessing ? 'Procesando' : 'Listo' }}</span>
        </div>
      </div>

      <!-- Chat Interface - Below the sphere -->
      <div class="container mx-auto px-4 pb-24 max-w-2xl w-full flex-1 flex flex-col justify-start" style="margin-top: -2.5rem;">
        
        
        <!-- Messages -->
        <div ref="chatContainer" class="rounded-lg bg-gray-800/50 backdrop-blur-sm border border-cyan-900/50 p-4 mb-4 h-[30vh] md:h-[25vh] lg:h-[30vh] xl:h-[35vh] 2xl:h-[40vh] overflow-y-auto flex-shrink-0">
          <div v-if="messages.length === 0" class="flex items-center justify-center h-full text-gray-400">
            <p>Haz una pregunta para comenzar la conversación</p>
          </div>
          <div v-for="(message, index) in messages" :key="index" class="mb-4">
            <div :class="[
              'p-3 rounded-lg max-w-[85%] md:max-w-[70%] lg:max-w-[80%]', 
              message.role === 'user' ? 'bg-gray-700/80 border border-gray-600 ml-auto' : 'bg-cyan-900/50 border border-cyan-800/50'
            ]">
              <p>{{ message.content }}</p>
            </div>
          </div>
        </div>

        <!-- Controls - Spaceship Control Panel Style -->
        <div class="bg-gray-900/90 backdrop-blur-md rounded-lg p-4 lg:p-6 border border-cyan-900/50">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center space-x-2 md:space-x-4">
              <button 
                @click="toggleRecording" 
                class="w-14 h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center transition-all relative group"
                :class="isRecording ? 'bg-red-600 animate-pulse' : 'bg-cyan-800 hover:bg-cyan-700'"
              >
                <div class="absolute inset-0 rounded-full border-2 border-cyan-400/50 group-hover:border-cyan-400 transition-all"></div>
                <div class="absolute inset-1 rounded-full border border-cyan-400/20 group-hover:border-cyan-400/30"></div>
                <mic-icon v-if="!isRecording" class="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10" />
                <square-icon v-else class="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10" />
              </button>
              <div class="text-sm md:text-base lg:text-lg">
                <p v-if="isRecording" class="text-red-400">Grabando...</p>
                <p v-else class="text-cyan-400">Presiona para hablar</p>
              </div>
            </div>
            <div class="flex items-center space-x-2 md:space-x-4">
              <button 
                @click="toggleMute" 
                class="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center bg-gray-800 hover:bg-gray-700 border border-cyan-900/50"
              >
                <volume-x-icon v-if="isMuted" class="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-cyan-400" />
                <volume-2-icon v-else class="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-cyan-400" />
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

    <!-- Status indicator -->
    <div class="fixed bottom-0 left-0 right-0 h-1">
      <div 
        v-if="isProcessing" 
        class="h-full bg-cyan-500 animate-pulse"
      ></div>
    </div>
  </div>
</template>
  
<script setup>
import { ref, onMounted, nextTick, onUnmounted } from 'vue';
import * as THREE from 'three';
import { MicIcon, SquareIcon, Volume2Icon, VolumeXIcon } from 'lucide-vue-next';

// References
const avatarCanvas = ref(null);
const audioPlayer = ref(null);
const chatContainer = ref(null);

// State
const isRecording = ref(false);
const isMuted = ref(false);
const isProcessing = ref(false);
const processingState = ref('');
const messages = ref([]);

// Recording variables
let mediaRecorder = null;
let audioChunks = [];
let scene, camera, renderer, avatar, analyser, dataArray;
let orbitRings = [], particles = [], glowMesh;
let clock, mixer, particleSystem;

// Initialize 3D scene
const initThreeJS = () => {
  // Create scene with fog for depth
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.05);
  
  // Setup clock for animations
  clock = new THREE.Clock();
  
  // Configure camera
  camera = new THREE.PerspectiveCamera(
    75, 
    avatarCanvas.value.clientWidth / avatarCanvas.value.clientHeight, 
    0.1, 
    1000
  );
  camera.position.z = 3.5;
  camera.position.y = 1.2;
  camera.position.x = -0.2;
  
  // Configure renderer with better quality
  renderer = new THREE.WebGLRenderer({ 
    canvas: avatarCanvas.value,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(avatarCanvas.value.clientWidth, avatarCanvas.value.clientHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(window.devicePixelRatio);
  
  // Advanced lighting setup
  const ambientLight = new THREE.AmbientLight(0x111111, 0.8);
  scene.add(ambientLight);
  
  // Main directional light (cyan)
  const directionalLight = new THREE.DirectionalLight(0x00ffff, 1.5);
  directionalLight.position.set(1, 2, 3);
  scene.add(directionalLight);
  
  // Secondary light (purple accent)
  const purpleLight = new THREE.PointLight(0x9900ff, 1, 10);
  purpleLight.position.set(-2, 1, 1);
  scene.add(purpleLight);
  
  // Create core sphere (AI brain)
  createCoreSphere();
  
  // Create orbital rings
  createOrbitalRings();
  
  // Create particle system
  createParticleSystem();
  
  // Create glow effect
  createGlowEffect();
  
  // Configure audio analyzer
  const listener = new THREE.AudioListener();
  camera.add(listener);
  
  const sound = new THREE.Audio(listener);
  const audioContext = listener.context;
  
  analyser = new THREE.AudioAnalyser(sound, 128);
  dataArray = new Uint8Array(analyser.analyser.frequencyBinCount);
  
  // Start animation
  animate();
  
  // Handle resizing
  window.addEventListener('resize', onWindowResize);
};

// Create the core sphere (AI brain)
const createCoreSphere = () => {
  const sphereRadius = window.innerWidth > 768 ? 0.8 : 0.6;
  
  // Create core geometry with more detail
  const geometry = new THREE.IcosahedronGeometry(sphereRadius, 4);
  
  // Create custom shader material for the core
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x00ffff,
    emissive: 0x0088aa,
    metalness: 0.9,
    roughness: 0.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.2,
    wireframe: false,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  });
  
  avatar = new THREE.Mesh(geometry, material);
  avatar.position.y = 0.5;
  avatar.position.z = -0.5;
  avatar.position.x = 0;
  scene.add(avatar);
  
  // Add inner core (energy source)
  const innerCore = new THREE.Mesh(
    new THREE.IcosahedronGeometry(sphereRadius * 0.6, 2),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    })
  );
  innerCore.position.copy(avatar.position);
  scene.add(innerCore);
};

// Create orbital rings around the sphere
const createOrbitalRings = () => {
  const ringColors = [0x00ffff, 0x0088aa, 0x9900ff];
  const ringCount = 3;
  
  for (let i = 0; i < ringCount; i++) {
    const radius = 1.2 + (i * 0.2);
    const tubeRadius = 0.01;
    const radialSegments = 16;
    const tubularSegments = 100;
    
    const ringGeometry = new THREE.TorusGeometry(
      radius, tubeRadius, radialSegments, tubularSegments
    );
    
    const ringMaterial = new THREE.MeshPhongMaterial({
      color: ringColors[i % ringColors.length],
      emissive: ringColors[i % ringColors.length],
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    
    // Set random rotation for each ring
    ring.rotation.x = Math.random() * Math.PI;
    ring.rotation.y = Math.random() * Math.PI;
    
    // Position at avatar center
    ring.position.copy(avatar.position);
    
    scene.add(ring);
    orbitRings.push(ring);
  }
};

// Create particle system for energy effect
const createParticleSystem = () => {
  const particleCount = 1000;
  const particleGeometry = new THREE.BufferGeometry();
  const particleMaterial = new THREE.PointsMaterial({
    color: 0x00ffff,
    size: 0.03,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });
  
  const positions = new Float32Array(particleCount * 3);
  const velocities = [];
  
  for (let i = 0; i < particleCount; i++) {
    // Create particles in a spherical distribution
    const radius = 1.5 + Math.random() * 2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta) + avatar.position.x;
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) + avatar.position.y;
    positions[i * 3 + 2] = radius * Math.cos(phi) + avatar.position.z;
    
    // Store velocity for animation
    velocities.push({
      x: (Math.random() - 0.5) * 0.01,
      y: (Math.random() - 0.5) * 0.01,
      z: (Math.random() - 0.5) * 0.01
    });
  }
  
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleSystem = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particleSystem);
  
  // Store velocities for animation
  particleSystem.userData.velocities = velocities;
};

// Create glow effect around the sphere
const createGlowEffect = () => {
  const glowGeometry = new THREE.SphereGeometry(1.2, 32, 32);
  const glowMaterial = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(0x00ffff) },
      viewVector: { value: camera.position }
    },
    vertexShader: `
      uniform vec3 viewVector;
      varying float intensity;
      void main() {
        vec3 vNormal = normalize(normalMatrix * normal);
        vec3 vNormel = normalize(normalMatrix * viewVector);
        intensity = pow(0.6 - dot(vNormal, vNormel), 2.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      varying float intensity;
      void main() {
        vec3 glow = glowColor * intensity;
        gl_FragColor = vec4(glow, 1.0);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true
  });
  
  glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  glowMesh.position.copy(avatar.position);
  glowMesh.scale.multiplyScalar(1.2);
  scene.add(glowMesh);
};

// Animation function
const animate = () => {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  const time = Date.now() * 0.001;
  
  // Update glow effect
  if (glowMesh && glowMesh.material.uniforms) {
    glowMesh.material.uniforms.viewVector.value = new THREE.Vector3().subVectors(
      camera.position,
      glowMesh.position
    );
  }
  
  // Rotate avatar core
  if (avatar) {
    avatar.rotation.y += 0.005;
    avatar.rotation.z += 0.001;
    
    // Pulse effect based on processing state
    const pulseIntensity = isProcessing.value ? 0.15 : 0.05;
    avatar.scale.x = 1 + Math.sin(time * 2) * pulseIntensity;
    avatar.scale.y = 1 + Math.sin(time * 2) * pulseIntensity;
    avatar.scale.z = 1 + Math.sin(time * 2) * pulseIntensity;
  }
  
  // Rotate orbital rings
  orbitRings.forEach((ring, index) => {
    ring.rotation.x += 0.002 * (index + 1);
    ring.rotation.y += 0.003 * (index + 1);
    ring.rotation.z += 0.001 * (index + 1);
    
    // Pulse effect for rings
    const ringPulse = Math.sin(time * 3 + index) * 0.05;
    ring.scale.set(1 + ringPulse, 1 + ringPulse, 1);
  });
  
  // Animate particles
  if (particleSystem) {
    const positions = particleSystem.geometry.attributes.position.array;
    const velocities = particleSystem.userData.velocities;
    
    for (let i = 0; i < positions.length / 3; i++) {
      // Apply velocity
      positions[i * 3] += velocities[i].x;
      positions[i * 3 + 1] += velocities[i].y;
      positions[i * 3 + 2] += velocities[i].z;
      
      // Calculate distance from center
      const x = positions[i * 3] - avatar.position.x;
      const y = positions[i * 3 + 1] - avatar.position.y;
      const z = positions[i * 3 + 2] - avatar.position.z;
      const distance = Math.sqrt(x * x + y * y + z * z);
      
      // Apply gravitational force toward center
      if (distance > 0.8) {
        velocities[i].x -= x * 0.0001;
        velocities[i].y -= y * 0.0001;
        velocities[i].z -= z * 0.0001;
      }
      
      // Add some randomness
      velocities[i].x += (Math.random() - 0.5) * 0.002;
      velocities[i].y += (Math.random() - 0.5) * 0.002;
      velocities[i].z += (Math.random() - 0.5) * 0.002;
      
      // Dampen velocity
      velocities[i].x *= 0.99;
      velocities[i].y *= 0.99;
      velocities[i].z *= 0.99;
      
      // Increase particle movement when processing
      if (isProcessing.value) {
        velocities[i].x *= 1.05;
        velocities[i].y *= 1.05;
        velocities[i].z *= 1.05;
      }
      
      // Reset particles that go too far
      if (distance > 5) {
        // Reset to random position near the sphere
        const radius = 1.2 + Math.random() * 0.5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta) + avatar.position.x;
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) + avatar.position.y;
        positions[i * 3 + 2] = radius * Math.cos(phi) + avatar.position.z;
        
        // Reset velocity
        velocities[i].x = (Math.random() - 0.5) * 0.01;
        velocities[i].y = (Math.random() - 0.5) * 0.01;
        velocities[i].z = (Math.random() - 0.5) * 0.01;
      }
    }
    
    particleSystem.geometry.attributes.position.needsUpdate = true;
  }
  
  // Wave effect when processing (AI is speaking)
  if (isProcessing.value && avatar) {
    const positions = avatar.geometry.attributes.position;
    const count = positions.count;
    
    for (let i = 0; i < count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      const distance = Math.sqrt(x * x + y * y + z * z);
      const originalDistance = avatar.geometry.parameters.radius || 0.8;
      
      // Create wave pattern based on position and time
      const wave = Math.sin(y * 5 + time * 5) * 0.05;
      const newDistance = originalDistance + wave;
      
      // Apply wave deformation
      positions.setX(i, x * (newDistance / distance));
      positions.setY(i, y * (newDistance / distance));
      positions.setZ(i, z * (newDistance / distance));
    }
    
    positions.needsUpdate = true;
  }
  
  renderer.render(scene, camera);
};

// Handle window resizing
const onWindowResize = () => {
  camera.aspect = avatarCanvas.value.clientWidth / avatarCanvas.value.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(avatarCanvas.value.clientWidth, avatarCanvas.value.clientHeight);
};

// Start/stop recording
const toggleRecording = async () => {
  if (isRecording.value) {
    stopRecording();
  } else {
    await startRecording();
  }
};

// Start recording
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
    console.error('Error starting recording:', error);
  }
};

// Stop recording and process audio
const stopRecording = () => {
  if (!mediaRecorder) return;

  mediaRecorder.stop();
  isRecording.value = false;
  isProcessing.value = true;

  mediaRecorder.onstop = async () => {
    try {
      processingState.value = 'Enviando audio...';
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });

      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.wav');

      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeRes.ok) {
        const errorData = await transcribeRes.json();
        console.error('Transcription error:', errorData);
        processingState.value = 'Error en la transcripción.';
        isProcessing.value = false;
        return;
      }

      const { text } = await transcribeRes.json();

      // Add user message
      messages.value.push({ role: 'user', content: text });
      scrollToBottom();

      // Generate response
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
        console.error('Chat API error:', errorData);
        processingState.value = 'Error al generar la respuesta.';
        isProcessing.value = false;
        return;
      }

      const { reply } = await chatRes.json();

      // Add assistant response
      messages.value.push({ role: 'assistant', content: reply });
      scrollToBottom();

      // Convert text to speech
      processingState.value = 'Generando audio...';
      const ttsRes = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: reply })
      });

      if (!ttsRes.ok) {
        const errorData = await ttsRes.blob();
        console.error('TTS error:', errorData);
        processingState.value = 'Error al generar el audio.';
        isProcessing.value = false;
        return;
      }

      const audioData = await ttsRes.blob();
      const audioUrl = URL.createObjectURL(audioData);

      // Play audio
      audioPlayer.value.src = audioUrl;
      if (!isMuted.value) {
        audioPlayer.value.play();
      }

      isProcessing.value = false;
      processingState.value = '';
    } catch (error) {
      console.error('Error processing audio:', error);
      isProcessing.value = false;
      processingState.value = '';
    }
  };
};

// Toggle mute
const toggleMute = () => {
  isMuted.value = !isMuted.value;
  audioPlayer.value.muted = isMuted.value;
};

// Scroll to bottom of chat
const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

// Initialize
onMounted(() => {
  initThreeJS();
  
  // Welcome message
  setTimeout(() => {
    messages.value.push({ 
      role: 'assistant', 
      content: '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?' 
    });
    
    // Play welcome message
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

// Clean up on unmount
onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize);
  
  // Clean up Three.js resources
  if (renderer) {
    renderer.dispose();
  }
  
  if (avatar) {
    avatar.geometry.dispose();
    avatar.material.dispose();
  }
  
  if (orbitRings.length) {
    orbitRings.forEach(ring => {
      ring.geometry.dispose();
      ring.material.dispose();
    });
  }
  
  if (particleSystem) {
    particleSystem.geometry.dispose();
    particleSystem.material.dispose();
  }
  
  if (glowMesh) {
    glowMesh.geometry.dispose();
    glowMesh.material.dispose();
  }
});
</script>
  
<style>
/* Base Tailwind imports */
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

:root {
  --color-primary: rgb(0, 255, 255);
  --color-secondary: rgb(0, 136, 170);
  --color-accent: rgb(153, 0, 255);
}

body {
  margin: 0;
  padding: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  overflow-x: hidden;
}

/* Custom gradient for holographic effect */
.bg-gradient-radial {
  background-image: radial-gradient(var(--tw-gradient-stops));
}

/* Animations */
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

/* Custom scrollbar */
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