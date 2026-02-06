from django.shortcuts import render
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
CLOUDKIT_API_TOKEN = os.getenv('CLOUDKIT_API_TOKEN')


# Create your views here.

def index(request):
    return render(request, "txirimiri/index.html", {
        "cloudkit_api_token": CLOUDKIT_API_TOKEN
    })
