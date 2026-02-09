import { state } from './cloud.js';
import { updateModelScale, updateModelYaw } from './three_viewer.js';

export function generateModelItemHTML(name, description, id) {
    return `
        <div class="d-flex align-items-start gap-3 text-start">
            <div class="model-thumbnail-container flex-shrink-0 d-flex align-items-center justify-content-center bg-light rounded overflow-hidden">
                <i class="bi bi-box model-icon-placeholder fs-1 text-secondary"></i>
                <img class="model-thumbnail" id="thumbnail-${id}" alt="${name} thumbnail" style="display: none;">
            </div>
            <div class="flex-grow-1">
                <h5 class="mb-2">${name}</h5>
                <p class="mb-0 line-clamp-2">${description}</p>
            </div>
        </div>
    `;
}

export function buildModelDetailsPage(id, name, description, extension) {
    return `
        <div class="container py-4">
            <div class="position-relative">
                <div id="view-options-panel" class="view-options-panel p-2 rounded bg-body-tertiary">
                    <div class="mb-2">
                        <label for="skybox-dropdown" class="form-label mb-1 small fw-semibold">Skybox</label>
                        <select id="skybox-dropdown" class="form-select form-select-sm">
                            <option value="">Loading skyboxes...</option>
                        </select>
                    </div>
                    <div class="mb-2">
                        <label for="exposure-slider" class="form-label mb-1 small fw-semibold">Exposure <span id="exposure-value" class="fw-normal text-muted">1.0</span></label>
                        <input type="range" id="exposure-slider" class="form-range" min="-1" max="1" step="0.01" value="0">
                    </div>
                    <div class="mb-2">
                        <label for="light-slider" class="form-label mb-1 small fw-semibold">Light <span id="light-value" class="fw-normal text-muted">1.0</span></label>
                        <input type="range" id="light-slider" class="form-range" min="-1" max="1" step="0.01" value="0">
                    </div>
                    <div class="mb-2">
                        <label for="scale-slider" class="form-label mb-1 small fw-semibold">Scale <span id="scale-value" class="fw-normal text-muted">1.0x</span></label>
                        <input type="range" id="scale-slider" class="form-range" min="-1" max="1" step="0.01" value="0">
                    </div>
                    <div class="mb-0">
                        <label for="yaw-slider" class="form-label mb-1 small fw-semibold">Yaw <span id="yaw-value" class="fw-normal text-muted">0.0°</span></label>
                        <input type="range" id="yaw-slider" class="form-range" min="${-Math.PI}" max="${Math.PI}" step="0.01" value="0">
                    </div>
                </div>
                <div id="viewer-container" class="mb-4 d-none">
                    <canvas id="model-canvas" class="w-100 rounded" style="height: 500px;"></canvas>
                </div>
                <div id="model-status" class="mb-4 d-flex align-items-center justify-content-center bg-light rounded" style="height: 500px;">
                    <div class="text-center">
                        <div class="spinner-border text-primary mb-3" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="text-muted">Downloading model...</p>
                    </div>
                </div>
            </div>
            <button id="screenshot-btn" class="btn btn-outline-primary mb-4 d-none">
                <i class="bi bi-camera"></i> Generate Screenshot
            </button>
            <p class="lead">${description}</p>
            <p class="text-muted mb-3">Format: ${extension.toUpperCase()}</p>
            <div class="mb-4">
                <h5>Screenshots</h5>
                <div id="screenshot-gallery" class="d-flex flex-wrap gap-2"></div>
            </div>
        </div>
    `;
}

export function wireUpViewOptionsPanel() {
    const viewOptionsBtn = document.getElementById('view-options-btn');
    const viewOptionsPanel = document.getElementById('view-options-panel');
    if (viewOptionsBtn) {
        viewOptionsBtn.classList.remove('d-none');
        viewOptionsBtn.onclick = (e) => {
            e.stopPropagation();
            viewOptionsPanel.classList.toggle('visible');
        };
        viewOptionsPanel.addEventListener('click', (e) => e.stopPropagation());
        document.addEventListener('click', () => {
            viewOptionsPanel.classList.remove('visible');
        });
    }
}

export function wireUpSliders() {
    const viewer = state.viewer;

    // Wire up the exposure slider
    const exposureSlider = document.getElementById('exposure-slider');
    const exposureLabel = document.getElementById('exposure-value');
    if (exposureSlider) {
        exposureSlider.addEventListener('input', () => {
            const exp = Math.pow(10, parseFloat(exposureSlider.value));
            exposureLabel.textContent = exp.toFixed(1);
            viewer.renderer.toneMappingExposure = exp;
        });
    }

    // Wire up the light (environment intensity) slider
    const lightSlider = document.getElementById('light-slider');
    const lightLabel = document.getElementById('light-value');
    if (lightSlider) {
        lightSlider.addEventListener('input', () => {
            const intensity = Math.pow(10, parseFloat(lightSlider.value));
            lightLabel.textContent = intensity.toFixed(1);
            viewer.scene.environmentIntensity = intensity;
        });
    }

    // Wire up the scale slider
    const scaleSlider = document.getElementById('scale-slider');
    const scaleLabel = document.getElementById('scale-value');
    if (scaleSlider) {
        scaleSlider.value = 0;
        scaleSlider.addEventListener('input', () => {
            const scale = Math.pow(10, parseFloat(scaleSlider.value));
            scaleLabel.textContent = scale.toFixed(1) + 'x';
            updateModelScale(scale);
        });
    }

    // Wire up the yaw slider
    const yawSlider = document.getElementById('yaw-slider');
    const yawLabel = document.getElementById('yaw-value');
    if (yawSlider) {
        yawSlider.value = 0;
        yawSlider.addEventListener('input', () => {
            const yaw = parseFloat(yawSlider.value);
            const degrees = (yaw * 180 / Math.PI).toFixed(0);
            yawLabel.textContent = degrees + '\u00B0';
            updateModelYaw(yaw);
        });
    }
}

export function wireUpScreenshotButton() {
    const screenshotBtn = document.getElementById('screenshot-btn');
    if (screenshotBtn) {
        screenshotBtn.classList.remove('d-none');
        screenshotBtn.addEventListener('click', generateScreenshot);
    }
}

export function generateScreenshot() {
    const viewer = state.viewer;
    if (!viewer || !viewer.model) return;

    const canvas = document.getElementById('model-canvas');
    const origWidth = canvas.clientWidth;
    const origHeight = canvas.clientHeight;

    // Render at 512x512
    const size = 512;
    viewer.renderer.setSize(size, size);
    viewer.camera.aspect = 1;
    viewer.camera.updateProjectionMatrix();
    viewer.renderer.render(viewer.scene, viewer.camera);
    const dataUrl = viewer.renderer.domElement.toDataURL('image/jpeg', 0.9);

    // Restore original canvas size
    viewer.renderer.setSize(origWidth, origHeight);
    viewer.camera.aspect = origWidth / origHeight;
    viewer.camera.updateProjectionMatrix();

    const base64 = dataUrl.split(',')[1];

    const payload = {
        model3d_record_name: state.model3dRecordName,
        model3d_name: document.getElementById('navbar-title').textContent.trim(),
        skybox_record_name: state.currentSkybox ? state.currentSkybox.id : '',
        skybox_name: state.currentSkybox ? state.currentSkybox.name : '',
        model_scale: viewer.model.scale.x,
        yaw_angle: viewer.model.rotation.y,
        camera_position_x: viewer.camera.position.x,
        camera_position_y: viewer.camera.position.y,
        camera_position_z: viewer.camera.position.z,
        camera_target_x: viewer.controls.target.x,
        camera_target_y: viewer.controls.target.y,
        camera_target_z: viewer.controls.target.z,
        image_base64: base64,
    };

    // Open image in a new tab immediately (must be synchronous for mobile popup blocker)
    const blob = dataUrlToBlob(dataUrl);
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');

    // Save to backend in the background
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    fetch('/api/screenshots/save/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        body: JSON.stringify(payload),
    })
        .then(r => r.json())
        .then(data => {
            addScreenshotToGallery({ ...payload, id: data.id, image_base64: base64 });
        })
        .catch(error => {
            console.error('Error saving screenshot:', error);
        });
}

function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const bytes = atob(parts[1]);
    const array = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
        array[i] = bytes.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
}

export function loadScreenshots(recordName) {
    fetch(`/api/screenshots/?model3d_record_name=${encodeURIComponent(recordName)}`)
        .then(r => r.json())
        .then(data => {
            const gallery = document.getElementById('screenshot-gallery');
            if (!gallery) return;
            gallery.innerHTML = '';
            if (data.screenshots && data.screenshots.length > 0) {
                data.screenshots.forEach(s => addScreenshotToGallery(s));
            }
        })
        .catch(error => {
            console.error('Error loading screenshots:', error);
        });
}

export function addScreenshotToGallery(data) {
    const gallery = document.getElementById('screenshot-gallery');
    if (!gallery) return;

    const dataUrl = `data:image/jpeg;base64,${data.image_base64}`;

    const wrapper = document.createElement('div');
    wrapper.className = 'screenshot-item position-relative';
    wrapper.style.width = '128px';
    wrapper.style.height = '128px';

    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = `Screenshot ${data.id}`;
    img.className = 'rounded border w-100 h-100';
    img.style.objectFit = 'cover';
    img.style.cursor = 'pointer';
    img.addEventListener('click', () => restoreScreenshot(data));
    wrapper.appendChild(img);

    const actions = document.createElement('div');
    actions.className = 'screenshot-actions position-absolute bottom-0 start-0 w-100 d-flex justify-content-around p-1';

    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn btn-sm btn-light';
    viewBtn.innerHTML = '<i class="bi bi-eye"></i>';
    viewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const blob = dataUrlToBlob(dataUrl);
        window.open(URL.createObjectURL(blob), '_blank');
    });
    actions.appendChild(viewBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-light text-danger';
    deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const preview = document.getElementById('delete-screenshot-preview');
        const confirmBtn = document.getElementById('delete-screenshot-confirm');
        const modalEl = document.getElementById('delete-screenshot-modal');
        preview.src = dataUrl;
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        // Replace confirm button to clear previous listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        newConfirmBtn.addEventListener('click', () => {
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
            fetch(`/api/screenshots/${data.id}/delete/`, {
                method: 'POST',
                headers: { 'X-CSRFToken': csrfToken },
            })
                .then(r => r.json())
                .then(() => { wrapper.remove(); modal.hide(); })
                .catch(err => console.error('Error deleting screenshot:', err));
        });
        modal.show();
    });
    actions.appendChild(deleteBtn);

    wrapper.appendChild(actions);
    gallery.appendChild(wrapper);
}

function restoreScreenshot(data) {
    const viewer = state.viewer;
    if (!viewer || !viewer.model) return;

    // Restore skybox
    const dropdown = document.getElementById('skybox-dropdown');
    if (dropdown) {
        const targetSkybox = data.skybox_record_name || '';
        if (dropdown.value !== targetSkybox) {
            dropdown.value = targetSkybox;
            dropdown.dispatchEvent(new Event('change'));
        }
    }

    // Restore scale
    const scale = data.model_scale;
    updateModelScale(scale);
    const scaleSlider = document.getElementById('scale-slider');
    const scaleLabel = document.getElementById('scale-value');
    if (scaleSlider) {
        scaleSlider.value = Math.log10(scale);
        scaleLabel.textContent = scale.toFixed(1) + 'x';
    }

    // Restore yaw
    const yaw = data.yaw_angle;
    updateModelYaw(yaw);
    const yawSlider = document.getElementById('yaw-slider');
    const yawLabel = document.getElementById('yaw-value');
    if (yawSlider) {
        yawSlider.value = yaw;
        yawLabel.textContent = (yaw * 180 / Math.PI).toFixed(0) + '\u00B0';
    }

    // Restore camera
    viewer.camera.position.set(data.camera_position_x, data.camera_position_y, data.camera_position_z);
    viewer.controls.target.set(data.camera_target_x, data.camera_target_y, data.camera_target_z);
    viewer.controls.update();
}
