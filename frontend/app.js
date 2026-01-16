const startBtn = document.getElementById('start-btn');
const statusDiv = document.getElementById('status');

async function init() {
    statusDiv.innerText = "Obteniendo token de sesión...";
    
    // 1. Obtener token de sesión efímero desde el backend Django
    const tokenResponse = await fetch("http://localhost:8000/api/session/", {
        method: "POST"
    });
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.client_secret.value;

    statusDiv.innerText = "Conectando con OpenAI...";

    // 2. Crear conexión WebRTC
    const pc = new RTCPeerConnection();

    // Reproducir audio remoto
    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    pc.ontrack = e => audioEl.srcObject = e.streams[0];
    document.body.appendChild(audioEl);

    // 3. Capturar micrófono
    const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
    pc.addTrack(ms.getTracks()[0]);

    // 4. Data Channel para eventos
    const dc = pc.createDataChannel("oai-events");
    dc.onmessage = (e) => {
        const serverEvent = JSON.parse(e.data);
        console.log("Evento de OpenAI:", serverEvent);
    };

    // 5. Negociación SDP
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-realtime-preview-2024-10-01";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
            Authorization: `Bearer ${EPHEMERAL_KEY}`,
            "Content-Type": "application/sdp"
        }
    });

    const answer = {
        type: "answer",
        sdp: await sdpResponse.text()
    };
    await pc.setRemoteDescription(answer);

    statusDiv.innerText = "Agente de voz conectado";
    startBtn.disabled = true;
}

startBtn.addEventListener('click', init);
