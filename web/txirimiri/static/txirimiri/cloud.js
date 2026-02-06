import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Configure CloudKit
CloudKit.configure({
    containers: [{
        containerIdentifier: 'iCloud.com.dcengineer.txirimiri',
        apiTokenAuth: {
            apiToken: apiToken,
            persist: true
        },
        environment: 'development'
    }]
});

const container = CloudKit.getDefaultContainer();
const database = container.publicCloudDatabase;

console.log('CloudKit configured and initialized');

document.addEventListener('DOMContentLoaded', () => {
    const modelList = document.getElementById('model-list');

    // Query CloudKit for Model3D records
    const query = { recordType: 'Model3D' };
    const options = {
        desiredKeys: ['name', 'description', 'extension', 'alt_extension']
    };

    database.performQuery(query, options).then((response) => {
        if (response.hasErrors) {
            console.error('Error fetching models:', response.errors[0]);
            return;
        }

        response.records.forEach(record => {
            const id = record.recordName;
            const name = record.fields.name.value;
            const description = record.fields.description.value;
            const extension = record.fields.extension?.value || '';
            const altExtension = record.fields.alt_extension?.value || '';

            // Only show models that have GLB in either extension or alt_extension
            const hasGLB = extension.toLowerCase() === 'glb' || altExtension.toLowerCase() === 'glb';

            if (!hasGLB) {
                console.log(`Skipping model ${name} - no GLB format available`);
                return;
            }

            // Determine which format to use (prefer GLB in alt_extension, fallback to extension)
            const useAltModel = altExtension.toLowerCase() === 'glb';
            const displayExtension = useAltModel ? altExtension : extension;

            const item = document.createElement('a');
            item.className = 'list-group-item list-group-item-action';
            item.innerHTML = generateHTML(name, description, id);
            item.dataset.extension = displayExtension;
            item.dataset.useAltModel = useAltModel;
            modelList.appendChild(item);

            // Asynchronously fetch and load the thumbnail
            fetchThumbnail(id, item);

            // Add click handler to display model details
            item.addEventListener('click', () => {
                displayModelDetails(id, name, description, displayExtension, useAltModel);
            });
        });
    }).catch(error => {
        console.error('Error fetching models:', error);
    });
});

function generateHTML(name, description, id) {
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

function fetchThumbnail(id, itemElement) {
    const options = {
        desiredKeys: ['thumbnail']
    };

    database.fetchRecords([id], options).then((response) => {
        if (response.hasErrors) {
            console.error('Error fetching thumbnail for', id, response.errors[0]);
            return;
        }

        const record = response.records[0];
        const thumbnailUrl = record.fields.thumbnail?.value?.downloadURL;

        if (thumbnailUrl) {
            const imgElement = itemElement.querySelector(`#thumbnail-${id}`);
            const iconPlaceholder = itemElement.querySelector('.model-icon-placeholder');

            if (imgElement) {
                imgElement.onload = () => {
                    imgElement.style.display = 'block';
                    if (iconPlaceholder) {
                        iconPlaceholder.style.display = 'none';
                    }
                };
                imgElement.src = thumbnailUrl;
            }
        }
    }).catch((error) => {
        console.error('Error fetching thumbnail for', id, error);
    });
}

function displayModelDetails(id, name, description, extension, useAltModel) {
    const mainContent = document.getElementById('main-content');

    // Get thumbnail URL from the list item if already loaded
    const listItemImg = document.getElementById(`thumbnail-${id}`);
    const thumbnailSrc = listItemImg && listItemImg.src ? listItemImg.src : null;

    // Update main content with model details
    mainContent.innerHTML = `
        <div class="container py-4">
            <div id="model-viewer" class="mb-4 d-none">
                <div id="threejs-container" class="d-none">
                    <canvas id="model-canvas" class="w-100 rounded" style="height: 500px;"></canvas>
                </div>
                <model-viewer id="usd-viewer" class="w-100 rounded d-none" style="height: 500px;"
                    camera-controls
                    touch-action="pan-y"
                    auto-rotate
                    shadow-intensity="1"
                    exposure="1">
                </model-viewer>
            </div>
            <div id="model-status" class="mb-4">
                <div class="d-flex align-items-center justify-content-center">
                    <div class="spinner-border text-primary me-3" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <span class="text-muted">Downloading model...</span>
                </div>
            </div>
            <h2>${name}</h2>
            <p class="lead">${description}</p>
            <p class="text-muted mb-3">Format: ${extension.toUpperCase()}</p>
            <div class="mb-4">
                <h5>Current Thumbnail</h5>
                <div class="d-flex align-items-center justify-content-center bg-light rounded p-3" style="max-width: 300px;">
                    ${thumbnailSrc
                        ? `<img src="${thumbnailSrc}" alt="${name} thumbnail" class="img-fluid rounded">`
                        : '<i class="bi bi-box display-1 text-secondary"></i>'}
                </div>
            </div>
        </div>
    `;

    // Asynchronously fetch the model file
    fetchModel(id, extension, useAltModel);
}

function fetchModel(id, extension, useAltModel) {
    // Fetch the appropriate model field based on which has GLB format
    const modelField = useAltModel ? 'alt_model' : 'model';
    const options = {
        desiredKeys: [modelField]
    };

    console.log(`Fetching ${modelField} for record ${id}`);

    database.fetchRecords([id], options).then((response) => {
        const statusElement = document.getElementById('model-status');

        if (response.hasErrors) {
            console.error('Error fetching model for', id, response.errors[0]);
            if (statusElement) {
                statusElement.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle"></i> Failed to load model
                    </div>
                `;
            }
            return;
        }

        const record = response.records[0];
        const modelUrl = record.fields[modelField]?.value?.downloadURL;

        if (modelUrl) {
            console.log('Model downloaded:', modelUrl);
            if (statusElement) {
                statusElement.classList.add('d-none');
            }
            // Initialize appropriate viewer based on file extension
            const isGLB = extension && extension.toLowerCase() === 'glb';
            if (isGLB) {
                initializeGLBViewer(modelUrl);
            } else {
                initializeThreeJS(modelUrl, extension);
            }
        } else {
            if (statusElement) {
                statusElement.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="bi bi-info-circle"></i> No model file available
                    </div>
                `;
            }
        }
    }).catch((error) => {
        console.error('Error fetching model for', id, error);
        const statusElement = document.getElementById('model-status');
        if (statusElement) {
            statusElement.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i> Error loading model
                </div>
            `;
        }
    });
}

function initializeGLBViewer(modelUrl) {
    const viewerContainer = document.getElementById('model-viewer');
    const glbViewer = document.getElementById('usd-viewer'); // Reuse the model-viewer element

    if (!glbViewer) {
        console.error('GLB viewer element not found');
        return;
    }

    console.log('Initializing GLB model viewer with URL:', modelUrl);

    // Show the viewer containers
    viewerContainer.classList.remove('d-none');
    glbViewer.classList.remove('d-none');

    // Set the model source (model-viewer supports GLB natively)
    glbViewer.setAttribute('src', modelUrl);

    // Handle load event
    glbViewer.addEventListener('load', () => {
        console.log('GLB model loaded successfully');
    });

    // Handle error event
    glbViewer.addEventListener('error', (event) => {
        console.error('Error loading GLB model:', event);
        const statusElement = document.getElementById('model-status');
        if (statusElement) {
            statusElement.classList.remove('d-none');
            statusElement.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i> Error loading 3D model
                </div>
            `;
        }
    });
}

function initializeThreeJS(modelUrl, extension) {
    const viewerContainer = document.getElementById('model-viewer');
    const threejsContainer = document.getElementById('threejs-container');
    const canvas = document.getElementById('model-canvas');

    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    console.log('Initializing Three.js with model URL:', modelUrl);

    // Show the viewer containers
    viewerContainer.classList.remove('d-none');
    threejsContainer.classList.remove('d-none');

    // Wait for next frame to ensure canvas is visible and has dimensions
    requestAnimationFrame(() => {
        const width = canvas.clientWidth || 800;
        const height = canvas.clientHeight || 500;

        console.log('Canvas dimensions:', width, 'x', height);

        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf8f9fa);

        // Create camera
        const camera = new THREE.PerspectiveCamera(
            50,
            width / height,
            0.1,
            1000
        );
        camera.position.set(0, 1, 3);

        // Create renderer
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        // Add orbit controls
        const controls = new OrbitControls(camera, canvas);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        // Animation loop
        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        animate();

        // Load model with appropriate loader
        // TODO: Add GLTFLoader, OBJLoader, etc. based on file extension
        console.log(`Three.js scene ready. Add loader for ${extension} format:`, modelUrl);

        // Handle window resize
        window.addEventListener('resize', () => {
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        });
    });
}   