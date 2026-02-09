import os

from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_POST
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


def index(request):
    return render(request, "txirimiri/index.html")


@require_POST
def cloudkit_api_token(request):
    token = os.getenv('CLOUDKIT_API_TOKEN')
    return JsonResponse({'api_token': token})
