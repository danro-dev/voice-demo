from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
import requests
import os
import json
from dotenv import load_dotenv
from .brain import get_session_instructions

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


@csrf_exempt
def session_token(request):
    if request.method == "POST":
        # Obtener voz preferida del request
        try:
            body = json.loads(request.body)
            voice = body.get("voice", "ash")
        except:
            voice = "ash"

        # Usamos el "Cerebro" (LangGraph) para generar las instrucciones de la sesión
        instructions = get_session_instructions()

        url = "https://api.openai.com/v1/realtime/sessions"
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        data = {
            "model": "gpt-4o-realtime-preview-2024-12-17",
            "voice": voice,
            "instructions": instructions,
        }

        try:
            response = requests.post(url, headers=headers, json=data)
            response_data = response.json()
            return JsonResponse(response_data)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    return HttpResponse(status=405)
