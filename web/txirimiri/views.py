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
    print(f"authentication called with request: {request}")
    req = f"request: {request}"
    ckWebAuthToken = ""
    ckSession = ""
    if request.method == "GET":
        req = f"GET: {request.GET}"
        ckWebAuthToken = request.GET.get("ckWebAuthToken", "")
        ckSession = request.GET.get("ckWebAuthToken", "")
    if request.method == "POST":
        print(" - with post request", request.POST)
        req = f"POST: {request.POST}"
        
    return render(request, "txirimiri/authentication.html", {
        "request": req,
        "ckWebAuthToken": ckWebAuthToken,
        "ckSession": ckSession
    })


@require_POST
def cloudkit_api_token(request):
    token = os.getenv('CLOUDKIT_API_TOKEN')
    return JsonResponse({'api_token': token})
