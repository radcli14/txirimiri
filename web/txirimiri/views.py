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

    response = render(request, "txirimiri/authentication.html", {
        "request": req,
        "ckWebAuthToken": ckWebAuthToken,
        "ckSession": ckSession
    })
    # Allow this page to be embedded in an iframe from the same origin
    response['X-Frame-Options'] = 'SAMEORIGIN'
    return response


@require_POST
def cloudkit_api_token(request):
    token = os.getenv('CLOUDKIT_API_TOKEN')
    return JsonResponse({'api_token': token})


@require_POST
def save_user_session(request):
    """Save authenticated user info to Django session"""
    import json
    try:
        data = json.loads(request.body)
        user_record_name = data.get('userRecordName')
        name = data.get('name')
        thumbnail_url = data.get('thumbnailUrl')

        # Store persistent user data (not the transient auth token)
        request.session['cloudkit_user'] = {
            'userRecordName': user_record_name,
            'name': name,
            'thumbnailUrl': thumbnail_url,
        }
        request.session.modified = True

        return JsonResponse({'status': 'success'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@require_POST
def clear_user_session(request):
    """Clear authenticated user info from Django session on sign out"""
    if 'cloudkit_user' in request.session:
        del request.session['cloudkit_user']
    return JsonResponse({'status': 'success'})


def get_user_session(request):
    """Get stored user info from Django session"""
    user = request.session.get('cloudkit_user')
    if user:
        return JsonResponse(user)
    return JsonResponse({'userRecordName': None}, status=200)
