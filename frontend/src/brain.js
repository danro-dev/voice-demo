// Prototipo ligero de cerebro para un asistente terapéutico humorístico
// Simula un "Deep Agent" simple: planifica una respuesta empática y humorística
export function generateResponse(input, tone, history = []) {
  const text = input?.toLowerCase() ?? '';
  const baseEmpathy = [
    "Gracias por compartirlo conmigo.",
    "Lamento que estés pasando por esto.",
    "Entiendo que esto puede ser complicado.",
  ];
  const tips = [
    "respira profundamente y toma un momento para notar tu cuerpo.",
    "si te sientes abrumado, intenta dividir el problema en pasos pequeños.",
    "un pequeño descanso puede hacer maravillas.",
  ];
  const humorTips = [
    "y si la vida te da limones, al menos haz una limonada épica.",
    "recuerda: si el cerebro fuera una app, el modo avión tiene que estar desactivado para el progreso.",
    "mi terapeuta dice: 'ríe 2 minutos y ya estás 40% más ligero'.",
  ];
  // Detectar intención simple para empatía
  const triggersEmpathy = ["me siento", "me", "estoy", "algo"];
  let response = "";
  if (triggersEmpathy.some(t => text.includes(t)) || history.length === 0) {
    const pick = baseEmpathy[Math.floor(Math.random() * baseEmpathy.length)];
    response += pick + " ";
  } else {
    response += "Gracias por compartir. ";
  }
  // Añadir tip práctico
  const tip = tips[Math.floor(Math.random() * tips.length)];
  response += tip + " ";
  // Añadir un toque de humor según tono
  if (tone === "Humor ligero") {
    const j = humorTips[Math.floor(Math.random() * humorTips.length)];
    response += j;
  } else if (tone === "Empático") {
    response += "Si quieres, podemos probar una pequeña técnica de relajación juntos.";
  } else {
    response += "¿Quieres que exploremos juntos algunas ideas para avanzar?";
  }
  // Limpiar longitud
  response = response.trim();
  return {
    text: response,
    // contexto simple para historial si se quiere mostrar en UI
    reasoning: [
      "Empatía inicial",
      "Consejo práctico",
      "Tono=" + tone
    ],
  };
}
