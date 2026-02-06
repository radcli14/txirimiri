from django.shortcuts import render
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


def index(request):
    # Get API token from environment for CloudKit JS
    cloudkit_api_token = os.getenv('CLOUDKIT_API_TOKEN')
    return render(request, "txirimiri/index.html", {
        "cloudkit_api_token": cloudkit_api_token
    })
