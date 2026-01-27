from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import StateGraph, END
from typing import TypedDict, List
import os


class AgentState(TypedDict):
    messages: List[str]
    personality: str
    mood_analysis: str
    plan: str
    response: str


def analyze_mood_step(state: AgentState):
    # Simulación de análisis de humor profundo
    last_message = state["messages"][-1]
    # En un caso real, aquí podríamos usar un LLM para detectar sutilezas
    return {
        "mood_analysis": "El usuario parece buscar validación a través de la queja existencial."
    }


def plan_step(state: AgentState):
    return {
        "plan": f"Usar sarcasmo nivel 4. Metáfora sugerida: Un hámster en una rueda de oro. Tono: {state['personality']}."
    }


def generate_instructions_step(state: AgentState):
    """Genera las instrucciones dinámicas para la sesión de Realtime API"""
    base_instructions = (
        "Eres 'El Ente', un asistente terapéutico humorístico, cínico y existencialista. "
        "Tu tono es irónico, inteligente y ligeramente oscuro, pero con un núcleo de ayuda real. "
        "Ayudas al usuario a relativizar sus problemas mediante el humor negro y la introspección profunda. "
        "Responde siempre de forma breve y directa. No uses emojis. "
        "HABLA A VELOCIDAD NORMAL, evita sonar lento o robótico."
    )

    dynamic_context = f"\nContexto actual del paciente: {state['mood_analysis']}\nEstrategia: {state['plan']}"

    return {"response": base_instructions + dynamic_context}


# Definición del grafo de Deep Agents
workflow = StateGraph(AgentState)
workflow.add_node("analyzer", analyze_mood_step)
workflow.add_node("planner", plan_step)
workflow.add_node("generator", generate_instructions_step)

workflow.set_entry_point("analyzer")
workflow.add_edge("analyzer", "planner")
workflow.add_edge("planner", "generator")
workflow.add_edge("generator", END)

brain = workflow.compile()


def get_session_instructions(
    user_context: str = "Inicio de sesión", personality: str = "cínica y humorística"
):
    inputs = {"messages": [user_context], "personality": personality}
    result = brain.invoke(inputs)
    return result["response"]
