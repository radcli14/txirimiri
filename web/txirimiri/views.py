import base64
import json
import os

from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_POST
from dotenv import load_dotenv

from .models import Model3D, Screenshot, Skybox

# Load environment variables from .env file
load_dotenv()


def index(request):
    # Get API token from environment for CloudKit JS
    cloudkit_api_token = os.getenv('CLOUDKIT_API_TOKEN')
    return render(request, "txirimiri/index.html", {
        "cloudkit_api_token": cloudkit_api_token
    })


@require_POST
def save_screenshot(request):
    data = json.loads(request.body)
    model3d, _ = Model3D.objects.get_or_create(
        record_name=data['model3d_record_name'],
        defaults={'name': data.get('model3d_name', '')},
    )
    skybox = None
    if data.get('skybox_record_name'):
        skybox, _ = Skybox.objects.get_or_create(
            record_name=data['skybox_record_name'],
            defaults={'name': data.get('skybox_name', '')},
        )
    image_data = base64.b64decode(data['image_base64'])
    screenshot = Screenshot.objects.create(
        model3d=model3d,
        skybox=skybox,
        model_scale=data['model_scale'],
        yaw_angle=data['yaw_angle'],
        camera_position_x=data['camera_position_x'],
        camera_position_y=data['camera_position_y'],
        camera_position_z=data['camera_position_z'],
        camera_target_x=data['camera_target_x'],
        camera_target_y=data['camera_target_y'],
        camera_target_z=data['camera_target_z'],
        image=image_data,
    )
    return JsonResponse({'id': screenshot.id})


def get_screenshots(request):
    record_name = request.GET.get('model3d_record_name', '')
    try:
        model3d = Model3D.objects.get(record_name=record_name)
    except Model3D.DoesNotExist:
        return JsonResponse({'screenshots': []})
    screenshots = Screenshot.objects.filter(model3d=model3d)
    result = []
    for s in screenshots:
        result.append({
            'id': s.id,
            'skybox_record_name': s.skybox.record_name if s.skybox else '',
            'model_scale': s.model_scale,
            'yaw_angle': s.yaw_angle,
            'camera_position_x': s.camera_position_x,
            'camera_position_y': s.camera_position_y,
            'camera_position_z': s.camera_position_z,
            'camera_target_x': s.camera_target_x,
            'camera_target_y': s.camera_target_y,
            'camera_target_z': s.camera_target_z,
            'image_base64': base64.b64encode(bytes(s.image)).decode('utf-8'),
        })
    return JsonResponse({'screenshots': result})


@require_POST
def delete_screenshot(request, screenshot_id):
    try:
        screenshot = Screenshot.objects.get(id=screenshot_id)
    except Screenshot.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    screenshot.delete()
    return JsonResponse({'ok': True})
