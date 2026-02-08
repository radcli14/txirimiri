import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { GroundedSkybox } from 'three/addons/objects/GroundedSkybox.js';

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

// Module-level Three.js state (shared between viewer and skybox functions)
let viewer = null;

// Persisted skybox selection (survives model switches)
let currentSkybox = null;

// Saved camera direction for preserving orientation across model switches
let savedCameraDir = null;

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

    // Save camera direction before disposing (for orientation persistence with skybox)
    if (viewer && currentSkybox && viewer.controls) {
        const dir = new THREE.Vector3().subVectors(viewer.camera.position, viewer.controls.target).normalize();
        savedCameraDir = dir;
    } else {
        savedCameraDir = null;
    }

    // Clean up previous viewer
    if (viewer) {
        viewer.dispose();
        viewer = null;
    }

    const mainContent = document.getElementById('main-content');

    // Get thumbnail URL from the list item if already loaded
    const listItemImg = document.getElementById(`thumbnail-${id}`);
    const thumbnailSrc = listItemImg && listItemImg.src ? listItemImg.src : null;

    // Update main content with model details
    mainContent.innerHTML = `
        <div class="container py-4">
            <div class="position-relative">
                <div id="view-options-panel" class="position-absolute top-0 end-0 d-none p-2 rounded shadow-sm bg-body-tertiary" style="z-index: 10; min-width: 220px;">
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

    // Show the view options button in the navbar and wire up toggle
    const viewOptionsBtn = document.getElementById('view-options-btn');
    const viewOptionsPanel = document.getElementById('view-options-panel');
    if (viewOptionsBtn) {
        viewOptionsBtn.classList.remove('d-none');
        viewOptionsBtn.onclick = () => {
            viewOptionsPanel.classList.toggle('d-none');
        };
    }

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
            console.log('Model URL:', modelUrl);
            if (statusElement) {
                statusElement.classList.add('d-none');
            }
            initializeViewer(modelUrl);
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

function initializeViewer(modelUrl) {
    const viewerContainer = document.getElementById('viewer-container');
    const canvas = document.getElementById('model-canvas');

    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    console.log('Initializing Three.js viewer with URL:', modelUrl);

    // Show the viewer container
    viewerContainer.classList.remove('d-none');

    // Wait for next frame to ensure canvas is visible and has dimensions
    requestAnimationFrame(() => {
        const width = canvas.clientWidth || 800;
        const height = canvas.clientHeight || 500;

        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf8f9fa);

        // Create camera
        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        camera.position.set(0, 1, 3);

        // Create renderer
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        // Add directional light with shadows
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        directionalLight.shadow.bias = -0.0001;
        scene.add(directionalLight);

        // Add shadow-receiving ground plane
        const shadowPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(200, 200),
            new THREE.ShadowMaterial({ opacity: 0.3 })
        );
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.y = 0.01;
        shadowPlane.receiveShadow = true;
        scene.add(shadowPlane);

        // Add orbit controls
        const controls = new OrbitControls(camera, canvas);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0, 0.5, 0);
        controls.update();

        // Store viewer state for skybox functions
        viewer = {
            scene,
            camera,
            renderer,
            controls,
            directionalLight,
            shadowPlane,
            groundedSkybox: null,
            skyboxTexture: null,
            animationId: null,
            resizeHandler: null,
            dispose() {
                if (this.animationId) {
                    cancelAnimationFrame(this.animationId);
                }
                if (this.resizeHandler) {
                    window.removeEventListener('resize', this.resizeHandler);
                }
                this.renderer.dispose();
                this.controls.dispose();
            }
        };

        // Animation loop
        function animate() {
            viewer.animationId = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        animate();

        // Handle window resize
        viewer.resizeHandler = () => {
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            if (w && h) {
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);
            }
        };
        window.addEventListener('resize', viewer.resizeHandler);

        // Apply persisted skybox immediately (before model loads)
        if (currentSkybox && currentSkybox.texture) {
            applySkyboxTexture(currentSkybox.texture, currentSkybox.height,
                currentSkybox.exposure, currentSkybox.shadowIntensity, currentSkybox.shadowSoftness);
        }

        // Load GLB model
        const loader = new GLTFLoader();
        loader.load(modelUrl, (gltf) => {
            const model = gltf.scene;

            // Enable shadows on all meshes
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // Center horizontally and place bottom at y=0 (keep original scale)
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.x = -center.x;
            model.position.z = -center.z;
            model.position.y = -box.min.y;

            scene.add(model);

            // Adjust camera to frame the model
            const finalBox = new THREE.Box3().setFromObject(model);
            const finalSize = finalBox.getSize(new THREE.Vector3());
            const finalCenter = finalBox.getCenter(new THREE.Vector3());
            const maxDim = Math.max(finalSize.x, finalSize.y, finalSize.z);
            const distance = maxDim * 2;
            if (savedCameraDir && currentSkybox) {
                camera.position.copy(finalCenter).addScaledVector(savedCameraDir, distance);
            } else {
                camera.position.set(distance * 0.7, distance * 0.5, distance * 0.7);
            }
            camera.far = Math.max(maxDim * 100, 1000);
            camera.updateProjectionMatrix();
            controls.target.copy(finalCenter);
            controls.update();

            // Adapt shadow camera bounds to model size
            const shadowExtent = maxDim * 2;
            directionalLight.shadow.camera.left = -shadowExtent;
            directionalLight.shadow.camera.right = shadowExtent;
            directionalLight.shadow.camera.top = shadowExtent;
            directionalLight.shadow.camera.bottom = -shadowExtent;
            directionalLight.shadow.camera.far = maxDim * 10;
            directionalLight.position.set(maxDim, maxDim * 2, maxDim);
            directionalLight.shadow.camera.updateProjectionMatrix();

            // Store model reference and dimensions for scale slider and skybox
            viewer.model = model;
            viewer.modelOriginalCenter = center.clone();
            viewer.modelOriginalBoxMin = box.min.clone();
            viewer.modelMaxDim = maxDim;

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

            // Re-apply persisted skybox for the new model
            if (currentSkybox) {
                applySkybox(currentSkybox.id, currentSkybox.name, currentSkybox.extension,
                    currentSkybox.height, currentSkybox.exposure,
                    currentSkybox.shadowIntensity, currentSkybox.shadowSoftness);
            }

            console.log('GLB model loaded, max dimension:', maxDim);
        }, undefined, (error) => {
            console.error('Error loading GLB model:', error);
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
    });
}

function updateModelScale(scale) {
    if (!viewer || !viewer.model) return;

    const model = viewer.model;
    const oldScale = model.scale.x; // Assuming uniform scaling
    const ratio = scale / oldScale;
    model.scale.setScalar(scale);

    // Reposition so bottom stays at y=0
    const box = new THREE.Box3().setFromObject(model);
    model.position.y -= box.min.y;

    // Adjust camera distance to maintain framing based on new model size
    const newMaxDim = viewer.modelMaxDim * scale;
    const oldPosition = viewer.camera.position.clone();
    const oldTarget = viewer.controls.target.clone();
    viewer.camera.position.set(oldPosition.x * ratio, oldPosition.y * ratio, oldPosition.z * ratio);
    viewer.controls.target.set(oldTarget.x * ratio, oldTarget.y * ratio, oldTarget.z * ratio);
    viewer.camera.far = Math.max(newMaxDim * 100, 1000);
    viewer.camera.updateProjectionMatrix();
}

function updateModelYaw(yaw) {
    if (!viewer || !viewer.model) return;
    viewer.model.rotation.y = yaw;
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
                currentSkybox = {
                    id: selectedOption.value,
                    name: selectedOption.textContent,
                    extension: selectedOption.dataset.extension,
                    height: selectedOption.dataset.height,
                    exposure: selectedOption.dataset.exposure,
                    shadowIntensity: selectedOption.dataset.shadowIntensity,
                    shadowSoftness: selectedOption.dataset.shadowSoftness
                };
                applySkybox(currentSkybox.id, currentSkybox.name, currentSkybox.extension,
                    currentSkybox.height, currentSkybox.exposure,
                    currentSkybox.shadowIntensity, currentSkybox.shadowSoftness);
            } else {
                currentSkybox = null;
                removeSkybox();
            }
        });

        // Restore previous skybox selection if switching models
        if (currentSkybox) {
            for (const opt of dropdown.options) {
                if (opt.value === currentSkybox.id) {
                    dropdown.value = currentSkybox.id;
                    break;
                }
            }
        }

        console.log(`Loaded ${response.records.length} skyboxes`);
    }).catch(error => {
        console.error('Error fetching skyboxes:', error);
        dropdown.innerHTML = '<option value="">Error loading skyboxes</option>';
    });
}

function applySkybox(id, name, extension, height, exposure, shadowIntensity, shadowSoftness) {
    if (!viewer) {
        console.error('Viewer not initialized');
        return;
    }

    // Reuse cached texture if same skybox is being re-applied (e.g. model switch)
    if (currentSkybox && currentSkybox.texture && currentSkybox.id === id) {
        console.log('Reusing cached texture for skybox:', name);
        applySkyboxTexture(currentSkybox.texture, height, exposure, shadowIntensity, shadowSoftness);
        return;
    }

    console.log('Loading skybox:', name);

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

        if (!imageUrl) {
            console.error('No image URL found for skybox');
            return;
        }

        // Choose loader based on file extension
        const isHDR = extension.toLowerCase() === 'hdr';
        const loader = isHDR ? new HDRLoader() : new THREE.TextureLoader();

        // Append file extension as URL fragment so the loader recognizes the format
        // (CloudKit URLs don't include the original file extension)
        const skyboxUrl = imageUrl + '#.' + extension;

        loader.load(skyboxUrl, (texture) => {
            // Downscale large JPG textures for iOS Safari compatibility
            if (!isHDR && texture.image && texture.image.width > 4096) {
                const maxSize = 4096;
                const aspect = texture.image.width / texture.image.height;
                const canvas = document.createElement('canvas');
                canvas.width = maxSize;
                canvas.height = Math.round(maxSize / aspect);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
                texture.image = canvas;
                texture.needsUpdate = true;
                console.log('Downscaled texture to', canvas.width, 'x', canvas.height);
            }

            texture.mapping = THREE.EquirectangularReflectionMapping;

            // Cache the texture on currentSkybox for reuse on model switch
            if (currentSkybox && currentSkybox.id === id) {
                currentSkybox.texture = texture;
            }

            applySkyboxTexture(texture, height, exposure, shadowIntensity, shadowSoftness);
        }, undefined, (error) => {
            console.error('Error loading skybox texture:', error);
        });
    }).catch((error) => {
        console.error('Error fetching skybox image for', id, error);
    });
}

function applySkyboxTexture(texture, height, exposure, shadowIntensity, shadowSoftness) {
    // Dispose previous skybox geometry (but not the texture if it's being reused)
    if (viewer.skyboxTexture && viewer.skyboxTexture !== texture) {
        viewer.skyboxTexture.dispose();
    }
    if (viewer.groundedSkybox) {
        viewer.groundedSkybox.material.dispose();
        viewer.groundedSkybox.geometry.dispose();
        viewer.scene.remove(viewer.groundedSkybox);
        viewer.groundedSkybox = null;
    }
    viewer.skyboxTexture = texture;

    // Set environment for PBR lighting
    viewer.scene.environment = texture;

    // Apply exposure and sync slider
    const expValue = exposure ? parseFloat(exposure) : 1.0;
    viewer.renderer.toneMappingExposure = expValue;
    const exposureSlider = document.getElementById('exposure-slider');
    const exposureLabel = document.getElementById('exposure-value');
    if (exposureSlider) {
        exposureSlider.value = Math.log10(expValue);
        exposureLabel.textContent = expValue.toFixed(1);
    }

    // Reset environment intensity and sync light slider
    viewer.scene.environmentIntensity = 1.0;
    const lightSlider = document.getElementById('light-slider');
    const lightLabel = document.getElementById('light-value');
    if (lightSlider) {
        lightSlider.value = 0;
        lightLabel.textContent = '1.0';
    }

    // Apply shadow intensity
    if (shadowIntensity) {
        viewer.shadowPlane.material.opacity = parseFloat(shadowIntensity);
    } else {
        viewer.shadowPlane.material.opacity = 0.3;
    }

    if (height) {
        // Ground-projected skybox, radius scales with model size
        const skyboxHeight = parseFloat(height);
        const modelDim = viewer.modelMaxDim || 2;
        const skyboxRadius = Math.max(modelDim * 50, 100);
        const groundedSkybox = new GroundedSkybox(texture, skyboxHeight, skyboxRadius);
        groundedSkybox.position.y = skyboxHeight - 0.01;
        viewer.scene.add(groundedSkybox);
        viewer.groundedSkybox = groundedSkybox;
        viewer.scene.background = null;
    } else {
        // Regular surrounding skybox
        viewer.scene.background = texture;
    }

    console.log('Skybox applied successfully');
}

function removeSkybox() {
    if (!viewer) {
        return;
    }

    console.log('Removing skybox');

    // Dispose texture and grounded skybox mesh to free GPU memory
    if (viewer.skyboxTexture) {
        viewer.skyboxTexture.dispose();
        viewer.skyboxTexture = null;
    }
    if (viewer.groundedSkybox) {
        viewer.groundedSkybox.material.dispose();
        viewer.groundedSkybox.geometry.dispose();
        viewer.scene.remove(viewer.groundedSkybox);
        viewer.groundedSkybox = null;
    }

    // Reset scene background and environment
    viewer.scene.background = new THREE.Color(0xf8f9fa);
    viewer.scene.environment = null;

    // Reset exposure, environment intensity, shadow, and sync sliders
    viewer.renderer.toneMappingExposure = 1.0;
    viewer.scene.environmentIntensity = 1.0;
    viewer.shadowPlane.material.opacity = 0.3;
    const exposureSlider = document.getElementById('exposure-slider');
    const exposureLabel = document.getElementById('exposure-value');
    if (exposureSlider) {
        exposureSlider.value = 0;
        exposureLabel.textContent = '1.0';
    }
    const lightSliderEl = document.getElementById('light-slider');
    const lightLabelEl = document.getElementById('light-value');
    if (lightSliderEl) {
        lightSliderEl.value = 0;
        lightLabelEl.textContent = '1.0';
    }
}
