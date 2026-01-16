from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
import requests
import os
import json
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


@csrf_exempt
def session_token(request):
    if request.method == "POST":
        url = "https://api.openai.com/v1/realtime/sessions"
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        data = {
            "model": "gpt-4o-realtime-preview-2024-10-01",
            "voice": "alloy",
            "instructions": "Eres un asistente amable y servicial.",
        }

        try:
            response = requests.post(url, headers=headers, json=data)
            response_data = response.json()
            return JsonResponse(response_data)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    return HttpResponse(status=405)
