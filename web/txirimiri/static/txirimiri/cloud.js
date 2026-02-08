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
            item.className = 'list-group-item list-group-item-action text-bg-secondary';
            item.innerHTML = generateHTML(name, description, id);
            item.dataset.extension = displayExtension;
            item.dataset.useAltModel = useAltModel;
            modelList.appendChild(item);

            // Asynchronously fetch and load the thumbnail
            fetchThumbnail(id, item);

            // Add click handler to display model details
            item.addEventListener('click', () => {
                // Reset all items to unselected state
                document.querySelectorAll('#model-list .list-group-item').forEach(i => {
                    i.classList.remove('text-bg-light', 'active');
                    i.classList.add('text-bg-secondary');
                });

                // Set clicked item to selected state
                item.classList.remove('text-bg-secondary');
                item.classList.add('text-bg-light');

                displayModelDetails(id, name, description, displayExtension, useAltModel);

                // Close sidebar on mobile devices (phones and tablets)
                if (window.innerWidth < 768) {
                    const sidebarElement = document.getElementById('sidebar');
                    const sidebar = bootstrap.Offcanvas.getInstance(sidebarElement);
                    if (sidebar) {
                        sidebar.hide();
                    }
                }
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
    // Update navbar title
    const navbarTitle = document.getElementById('navbar-title');
    if (navbarTitle) {
        navbarTitle.textContent = name;
    }

    const mainContent = document.getElementById('main-content');

    // Get thumbnail URL from the list item if already loaded
    const listItemImg = document.getElementById(`thumbnail-${id}`);
    const thumbnailSrc = listItemImg && listItemImg.src ? listItemImg.src : null;

    // Update main content with model details
    mainContent.innerHTML = `
        <div class="container py-4">
            <div class="position-relative">
                <div id="skybox-selector" class="position-absolute top-0 end-0" style="z-index: 10;">
                    <select id="skybox-dropdown" class="form-select form-select-sm" style="width: auto;">
                        <option value="">Loading skyboxes...</option>
                    </select>
                </div>
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
                <div id="model-status" class="mb-4 d-flex align-items-center justify-content-center bg-light rounded" style="height: 500px;">
                    <div class="text-center">
                        <div class="spinner-border text-primary mb-3" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="text-muted">Downloading model...</p>
                    </div>
                </div>
            </div>
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

    // Asynchronously fetch the model file and skyboxes
    fetchModel(id, extension, useAltModel);
    fetchSkyboxes();
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

function fetchSkyboxes() {
    const dropdown = document.getElementById('skybox-dropdown');

    if (!dropdown) {
        console.error('Skybox dropdown not found');
        return;
    }

    // Query CloudKit for Skybox records
    const query = { recordType: 'Skybox' };
    const options = {
        desiredKeys: ['name', 'extension', 'height', 'exposure', 'shadow_intensity', 'shadow_softness']
    };

    database.performQuery(query, options).then((response) => {
        if (response.hasErrors) {
            console.error('Error fetching skyboxes:', response.errors[0]);
            dropdown.innerHTML = '<option value="">No skyboxes available</option>';
            return;
        }

        // Clear the dropdown and add default option
        dropdown.innerHTML = '<option value="">Select a skybox</option>';

        // Add each skybox as an option
        response.records.forEach(record => {
            const id = record.recordName;
            const name = record.fields.name?.value || 'Unnamed Skybox';
            const extension = record.fields.extension?.value || 'hdr';
            const height = record.fields.height?.value;
            const exposure = record.fields.exposure?.value;
            const shadowIntensity = record.fields.shadow_intensity?.value;
            const shadowSoftness = record.fields.shadow_softness?.value;

            const option = document.createElement('option');
            option.value = id;
            option.textContent = name;
            option.dataset.extension = extension;
            option.dataset.height = height || '';
            option.dataset.exposure = exposure || '';
            option.dataset.shadowIntensity = shadowIntensity || '';
            option.dataset.shadowSoftness = shadowSoftness || '';

            dropdown.appendChild(option);
        });

        // Add change event listener
        dropdown.addEventListener('change', (event) => {
            const selectedOption = event.target.options[event.target.selectedIndex];
            if (selectedOption.value) {
                applySkybox(
                    selectedOption.value,
                    selectedOption.textContent,
                    selectedOption.dataset.extension,
                    selectedOption.dataset.height,
                    selectedOption.dataset.exposure,
                    selectedOption.dataset.shadowIntensity,
                    selectedOption.dataset.shadowSoftness
                );
            } else {
                // Remove skybox if "Select a skybox" is chosen
                removeSkybox();
            }
        });

        console.log(`Loaded ${response.records.length} skyboxes`);
    }).catch(error => {
        console.error('Error fetching skyboxes:', error);
        dropdown.innerHTML = '<option value="">Error loading skyboxes</option>';
    });
}

function applySkybox(id, name, extension, height, exposure, shadowIntensity, shadowSoftness) {
    const modelViewer = document.getElementById('usd-viewer');

    if (!modelViewer) {
        console.error('Model viewer not found');
        return;
    }

    console.log('Applying skybox:', name);

    // Fetch the skybox image from CloudKit
    const options = {
        desiredKeys: ['image']
    };

    database.fetchRecords([id], options).then((response) => {
        if (response.hasErrors) {
            console.error('Error fetching skybox image for', id, response.errors[0]);
            return;
        }

        const record = response.records[0];
        const imageUrl = record.fields.image?.value?.downloadURL;

        if (imageUrl) {
            console.log('Skybox image URL:', imageUrl);
            console.log('Skybox extension:', extension);
            console.log('Skybox height:', height || 'none');

            // Append file extension as URL fragment so model-viewer uses the correct loader
            // (CloudKit URLs don't include the original file extension)
            const skyboxUrl = imageUrl + '#.'+  extension;

            // Set skybox image
            modelViewer.setAttribute('skybox-image', skyboxUrl);
            modelViewer.setAttribute('alt', name);

            // Set exposure if specified
            if (exposure) {
                modelViewer.setAttribute('exposure', exposure);
                console.log('Set exposure:', exposure);
            }

            // Set shadow intensity if specified
            if (shadowIntensity) {
                modelViewer.setAttribute('shadow-intensity', shadowIntensity);
                console.log('Set shadow intensity:', shadowIntensity);
            }

            // Set shadow softness if specified
            if (shadowSoftness) {
                modelViewer.setAttribute('shadow-softness', shadowSoftness);
                console.log('Set shadow softness:', shadowSoftness);
            }

            // Set skybox height for ground projection if specified
            if (height) {
                modelViewer.setAttribute('skybox-height', `${height}m`);
                console.log('Using ground-projected skybox with height:', height);
            } else {
                modelViewer.removeAttribute('skybox-height');
            }

            console.log('Skybox attributes set. Current attributes:', {
                'skybox-image': modelViewer.getAttribute('skybox-image'),
                'skybox-height': modelViewer.getAttribute('skybox-height'),
                'exposure': modelViewer.getAttribute('exposure'),
                'shadow-intensity': modelViewer.getAttribute('shadow-intensity')
            });
        } else {
            console.error('No image URL found for skybox');
        }
    }).catch((error) => {
        console.error('Error fetching skybox image for', id, error);
    });
}

function removeSkybox() {
    const modelViewer = document.getElementById('usd-viewer');

    if (!modelViewer) {
        return;
    }

    console.log('Removing skybox');

    // Remove skybox attributes
    modelViewer.removeAttribute('skybox-image');
    modelViewer.removeAttribute('skybox-height');

    // Reset to default values
    modelViewer.setAttribute('exposure', '1');
    modelViewer.setAttribute('shadow-intensity', '1');
}   