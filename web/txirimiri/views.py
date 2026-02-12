import os

from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_POST
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


def index(request):
    print("index called")
    if request.method == "POST":
        print(" - with post request", request.POST)
        
    return render(request, "txirimiri/index.html")


def authentication(request):
    print("authentication called")
    post = ""
    if request.method == "POST":
        print(" - with post request", request.POST)
        post = f"{request.POST}"
        
    return render(request, "txirimiri/authentication.html", {
        "post": post
    })


@require_POST
def cloudkit_api_token(request):
    token = os.getenv('CLOUDKIT_API_TOKEN')
    return JsonResponse({'api_token': token})
