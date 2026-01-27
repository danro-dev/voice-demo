import React, { useState, useRef, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const App = () => {
  const [status, setStatus] = useState('Desconectado');
  const [isConnecting, setIsConnecting] = useState(false);
  const [logs, setLogs] = useState([]);
  const [mood, setMood] = useState('neutral'); // neutral, happy, deep, warning
  const [voice, setVoice] = useState('ash'); // alloy, ash, ballad, coral, echo, sage, shimmer, verse
  
  const voices = ['ash', 'alloy', 'echo', 'shimmer', 'sage', 'verse'];

  const moodColors = {
    neutral: 'bg-cyan-900/30',
    happy: 'bg-emerald-900/40',
    deep: 'bg-purple-900/40',
    warning: 'bg-red-900/40'
  };

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const localStreamRef = useRef(null);
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const visualizerBarsRef = useRef([]);
  const canvasRef = useRef(null);

  // Particle System Logic
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 1.2;
        this.speedY = (Math.random() - 0.5) * 1.2;
        this.life = Math.random() * 100 + 100;
        this.maxLife = this.life;
      }
      update(intensity) {
        this.x += this.speedX * (1 + intensity * 15);
        this.y += this.speedY * (1 + intensity * 15);
        this.life -= 1;
        if (this.life <= 0 || this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
          this.reset();
        }
      }
      draw() {
        const opacity = (this.life / this.maxLife) * 0.5;
        ctx.fillStyle = mood === 'happy' ? `rgba(52, 211, 153, ${opacity})` :
                       mood === 'deep' ? `rgba(192, 132, 252, ${opacity})` :
                       mood === 'warning' ? `rgba(248, 113, 113, ${opacity})` :
                       `rgba(34, 211, 238, ${opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const particles = Array.from({ length: 80 }, () => new Particle());
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let intensity = 0;
      if (analyserRef.current) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        intensity = data.reduce((a, b) => a + b, 0) / (data.length * 255);
      }
      
      particles.forEach(p => {
        p.update(intensity);
        p.draw();
      });
      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [mood]);

  const addLog = useCallback((message, type = 'info') => {
    setLogs(prev => [...prev, { message, type, time: new Date().toLocaleTimeString() }]);
    console.log(`[${type}] ${message}`);
  }, []);

  const updateStatus = useCallback((state) => setStatus(state), []);

  const setupVisualizer = (stream) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 64;
    
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!pcRef.current || pcRef.current.connectionState === 'closed') return;
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      
      const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
      
      visualizerBarsRef.current.forEach((bar, i) => {
        if (bar) {
          const barHeight = (dataArray[i] / 255) * (80 + Math.sin(Date.now() / 200 + i) * 20);
          bar.style.height = `${Math.max(4, barHeight)}px`;
          bar.style.opacity = Math.max(0.1, dataArray[i]/255);
          
          if (avg > 100) {
            bar.style.backgroundColor = '#f43f5e';
            bar.style.boxShadow = '0 0 20px rgba(244, 63, 94, 0.5)';
          } else if (avg > 50) {
            bar.style.backgroundColor = mood === 'happy' ? '#34d399' : 
                                       mood === 'deep' ? '#c084fc' : 
                                       mood === 'warning' ? '#f87171' : '#22d3ee';
            bar.style.boxShadow = '0 0 15px rgba(34, 211, 238, 0.3)';
          } else {
            bar.style.backgroundColor = '#1e293b';
            bar.style.boxShadow = 'none';
          }
        }
      });
    };
    draw();
  };

  const startSession = async () => {
    if (isConnecting || status === 'Conectado') return;
    try {
      setIsConnecting(true);
      updateStatus('Conectando...');

      const tokenResponse = await fetch("http://localhost:8000/api/session/", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice })
      });
      if (!tokenResponse.ok) throw new Error('Error al obtener token');
      const data = await tokenResponse.json();
      const EPHEMERAL_KEY = data.client_secret.value;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      
      // Cleanup previous audio if any
      if (audioRef.current) {
        audioRef.current.srcObject = null;
        audioRef.current.remove();
      }

      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioRef.current = audioEl;
      
      pc.ontrack = e => { audioEl.srcObject = e.streams[0]; };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      pc.addTrack(stream.getTracks()[0]);
      setupVisualizer(stream);

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      
      dc.onmessage = (e) => {
        const serverEvent = JSON.parse(e.data);
        
        // Detection of mood based on transcript
        if (serverEvent.type === 'response.audio_transcript.done') {
          const text = serverEvent.transcript.toLowerCase();
          let newMood = 'neutral';
          if (text.includes('jaja') || text.includes('risa') || text.includes('gracioso') || text.includes('divertido')) {
            newMood = 'happy';
          } else if (text.includes('problema') || text.includes('dolor') || text.includes('triste') || text.includes('existencial') || text.includes('vacío')) {
            newMood = 'deep';
          } else if (text.includes('error') || text.includes('cuidado') || text.includes('peligro') || text.includes('muerte') || text.includes('fin')) {
            newMood = 'warning';
          }
          
          setMood(newMood);
          addLog(serverEvent.transcript, 'agent');
        }

        // Handle delta audio for real-time bar reaction (optional, but let's keep it simple)
      };
      
      dc.onopen = () => {
        const sessionUpdate = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: "Eres 'El Ente', un asistente terapéutico humorístico y cínico. Tu objetivo es ayudar al usuario con sus problemas existenciales usando un humor negro, sarcasmo y metáforas profundas pero absurdas. Eres empático a tu manera distorsionada. Responde siempre de forma breve y concisa. No uses emojis.",
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: { type: 'server_vad' },
            voice: voice,
            temperature: 0.8
          }
        };
        dc.send(JSON.stringify(sessionUpdate));
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp"
        }
      });

      const answer = { type: "answer", sdp: await sdpResponse.text() };
      await pc.setRemoteDescription(answer);

      updateStatus('Conectado');
      setIsConnecting(false);

    } catch (err) {
      console.error(err);
      updateStatus('Desconectado');
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current.pause();
      audioRef.current.remove();
      audioRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    updateStatus('Desconectado');
    setIsConnecting(false);
    setMood('neutral');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (status === 'Desconectado') startSession();
        else stopSession();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, isConnecting]);

  return (
    <div className="bg-black text-white min-h-screen flex flex-col items-center justify-center overflow-hidden font-sans relative selection:bg-none">
      
      {/* Voice Selector */}
      <div className="absolute top-8 right-8 z-20 flex gap-2">
        {voices.map(v => (
          <button
            key={v}
            onClick={() => setVoice(v)}
            className={cn(
              "px-3 py-1 text-[10px] uppercase tracking-widest border transition-all duration-300",
              voice === v ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.3)]" : "bg-black border-neutral-800 text-neutral-600 hover:border-neutral-600"
            )}
            disabled={status !== 'Desconectado'}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Background Particles */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

      {/* Dynamic Background Aura */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-1000 ease-in-out pointer-events-none z-0",
        status === 'Conectado' ? "opacity-40" : "opacity-10"
      )}>
        <div className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] blur-[150px] rounded-full animate-pulse transition-colors duration-[2000ms]",
          status === 'Conectado' ? moodColors[mood] : "bg-neutral-900/20"
        )} />
      </div>

      {/* The Entity Visualizer */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* Visualizer Orb */}
        <div className="relative flex items-center justify-center">
          <div className={cn(
            "w-48 h-48 rounded-full blur-3xl transition-all duration-1000 absolute",
            status === 'Conectado' ? "bg-cyan-500/30 scale-150" : 
            status === 'Conectando...' ? "bg-yellow-500/20 animate-pulse" : "bg-white/5"
          )} />

          <div className="flex items-center justify-center h-64 gap-3">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                ref={el => visualizerBarsRef.current[i] = el}
                className={cn(
                  "w-1 rounded-full transition-all duration-150 shadow-[0_0_15px_rgba(34,211,238,0.2)]",
                  status === 'Conectado' ? "bg-cyan-400" : "bg-neutral-900 h-1.5"
                )}
              />
            ))}
          </div>
        </div>

        {/* Status indicator */}
        <div className="mt-16 text-center space-y-6">
          <h2 className={cn(
            "text-[10px] tracking-[0.8em] uppercase font-extralight transition-all duration-1000",
            status === 'Conectado' ? "text-cyan-200 opacity-100" : "text-neutral-500 opacity-60"
          )}>
            {status === 'Desconectado' ? 'Inerte' : 
             status === 'Conectando...' ? 'Manifestándose...' : 'Omnisciente'}
          </h2>
          
          {status === 'Desconectado' && (
            <p className="text-[9px] text-neutral-400 font-mono tracking-[0.2em] animate-pulse uppercase">
              Presiona Espacio para Despertar
            </p>
          )}
        </div>
      </div>

      {/* Accessibility / Hidden Logs */}
      <div className="sr-only" aria-live="polite">
        {logs.length > 0 && logs[logs.length - 1].message}
      </div>

      <div className="absolute bottom-12 text-[8px] text-neutral-600 tracking-[0.5em] uppercase pointer-events-none select-none">
        Entity Interface // Therapeutic Core
      </div>

    </div>
  );
};

export default App;
