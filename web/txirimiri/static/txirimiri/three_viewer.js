import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { GroundedSkybox } from 'three/addons/objects/GroundedSkybox.js';

// The state is provided by the index.js module on initialization, and holds
// references to the viewer instance, model, skybox, and saved camera state.
let state = null;

// Hold the app state on initialization
export function init(s) {
    state = s;
}

// Sets the saved camera direction in the state object, which is the difference between
// the camera position and the controls target, normalized to a unit vector.
export function saveCameraDirection() {
    if (state.viewer && state.currentSkybox && state.viewer.controls) {
        state.savedCameraDir = new THREE.Vector3()
            .subVectors(state.viewer.camera.position, state.viewer.controls.target).normalize();
    } else {
        state.savedCameraDir = null;
    }
}

// Disposes of the current viewer instance if it exists.
export function disposeViewer() {
    if (state.viewer) {
        state.viewer.dispose();
        state.viewer = null;
    }
}

// Main viewer initialization function, which is called after the user has 
// selected a model and the model URL is available. 
// This sets up the Three.js scene, camera, renderer, lights, controls, and loads the GLB model. 
// It also applies any persisted skybox selection immediately so that the model is rendered with the correct environment on load.
export function initializeViewer(modelUrl, onModelLoaded) {
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
        initializeViewerState(canvas, modelUrl, onModelLoaded)
    });
}

// The primary portion of the viewer initialization, which adds viewer properties
// into the app state dictionary, prepares handlers animation and resize, and
// loads the model, with skybox applied if it already existed.
function initializeViewerState(canvas, modelUrl, onModelLoaded) {
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);

    // Initialize the camera and orbiting controls, lighting, and renderer
    const cameraAndControls = initializeCamera();
    const lighting = initializeLighting(scene);
    const renderer = initializeRenderer();

    // Store viewer state
    state.viewer = {
        scene,
        ...cameraAndControls,
        renderer,
        ...lighting, // This unpacks the dictionary returned by initializeLighting to include ambientLight, directionalLight, and shadowPlane
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

    const viewer = state.viewer;

    // Animation loop
    function animate() {
        viewer.animationId = requestAnimationFrame(animate);
        viewer.controls.update();
        renderer.render(scene, viewer.camera);
    }
    animate();

    // Handle window resize
    viewer.resizeHandler = () => {
        onResize(canvas, viewer);
    };
    window.addEventListener('resize', viewer.resizeHandler);

    // Apply persisted skybox immediately (before model loads)
    if (state.currentSkybox && state.currentSkybox.texture) {
        applySkyboxTexture(
            state.currentSkybox.texture, 
            state.currentSkybox.height,
            state.currentSkybox.exposure, 
            state.currentSkybox.shadowIntensity, 
            state.currentSkybox.shadowSoftness
        );
    }

    // Load GLB model
    const loader = new GLTFLoader();
    loader.load(modelUrl, (gltf) => {
        onGltfLoaded(gltf, viewer, onModelLoaded);  // Success!
    }, undefined, (error) => {
        console.error('Error loading GLB model:', error);
        document.getElementById('model-status').classList.remove('d-none');
        document.getElementById('model-status-loading').classList.add('d-none');
        document.getElementById('model-status-error').classList.remove('d-none');
    });
}

// Initializes and returns a WebGL render for dimension, tone, and shadow set up.
function initializeRenderer() {
    const canvas = document.getElementById('model-canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    return renderer
}

// Initializes and returns the camera and orbiting controls.
function initializeCamera() {
    const canvas = document.getElementById('model-canvas');

    // Create camera
    const fov = 50;  // Field of view in degrees
    const aspect = canvas.clientWidth / canvas.clientHeight
    const near = 0.01;  // Near clipping plane, I make this small because the Pelota model is only a couple cm in radius
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, 1000);
    camera.position.set(0, 1, 3);

    // Add orbit controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.5, 0);
    controls.update();

    return { 
        "camera": camera, 
        "controls": controls 
    };
}

// Create and return the ambient and directional lights, and shadow plane, and add them to the scene.
function initializeLighting(scene) {
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 3.14);
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

    return {
        "ambientLight": ambientLight,
        "directionalLight": directionalLight,
        "shadowPlane": shadowPlane
    };
}

// Handles the window resizing by updating the camera and renderer.
function onResize(canvas, viewer) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w && h) {
        viewer.camera.aspect = w / h;
        viewer.camera.updateProjectionMatrix();
        viewer.renderer.setSize(w, h);
    }
}

/// When the GLTFLoader has successfully loaded the model, this function is called to 
// add it to the scene, set up shadows, center and position it, and adjust the camera to frame it.
function onGltfLoaded(gltf, viewer, onModelLoaded) {
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

    viewer.scene.add(model);

    // Adjust camera to frame the model
    const finalBox = new THREE.Box3().setFromObject(model);
    const finalSize = finalBox.getSize(new THREE.Vector3());
    const finalCenter = finalBox.getCenter(new THREE.Vector3());
    const maxDim = Math.max(finalSize.x, finalSize.y, finalSize.z);
    const distance = maxDim * 2;
    if (state.savedCameraDir && state.currentSkybox) {
        viewer.camera.position.copy(finalCenter).addScaledVector(state.savedCameraDir, distance);
    } else {
        viewer.camera.position.set(distance * 0.7, distance * 0.5, distance * 0.7);
    }
    viewer.camera.far = Math.max(maxDim * 100, 1000);
    viewer.camera.updateProjectionMatrix();
    viewer.controls.target.copy(finalCenter);
    viewer.controls.update();

    // Adapt shadow camera bounds to model size
    const shadowExtent = maxDim * 2;
    viewer.directionalLight.shadow.camera.left = -shadowExtent;
    viewer.directionalLight.shadow.camera.right = shadowExtent;
    viewer.directionalLight.shadow.camera.top = shadowExtent;
    viewer.directionalLight.shadow.camera.bottom = -shadowExtent;
    viewer.directionalLight.shadow.camera.far = maxDim * 10;
    viewer.directionalLight.position.set(maxDim, maxDim * 2, maxDim);
    viewer.directionalLight.shadow.camera.updateProjectionMatrix();

    // Store model reference and dimensions
    viewer.model = model;
    viewer.modelOriginalCenter = center.clone();
    viewer.modelOriginalBoxMin = box.min.clone();
    viewer.modelMaxDim = maxDim;

    // Notify caller that model is loaded
    if (onModelLoaded) {
        onModelLoaded();
    }

    console.log('GLB model loaded, max dimension:', maxDim);
}

// Responds to changes in the scale slider by updating the model's scale and 
// positioning, and adjusting the camera distance to maintain framing.
// This is really here to manage the size relative to the radius of the skybox.
export function updateModelScale(scale) {
    const viewer = state.viewer;
    if (!viewer || !viewer.model) return;

    const model = viewer.model;
    const oldScale = model.scale.x;
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

// Respond to changes in the angle slider by updating the model angle relative to the skybox.
export function updateModelYaw(yaw) {
    const viewer = state.viewer;
    if (!viewer || !viewer.model) return;
    viewer.model.rotation.y = yaw;
}

// When a skybox is selected, this loads it and resolves it in the promise.
export function loadSkyboxTexture(url, extension) {
    return new Promise((resolve, reject) => {
        const isHDR = extension.toLowerCase() === 'hdr';
        const loader = isHDR ? new HDRLoader() : new THREE.TextureLoader();

        // Append file extension as URL fragment so the loader recognizes the format
        // (CloudKit URLs don't include the original file extension)
        const skyboxUrl = url + '#.' + extension;

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
            resolve(texture);
        }, undefined, reject);
    });
}

// When the skybox texture is available, this generates the appropriate skybox based on the 
// metadata (e.g. height for grounded skybox) and applies it to the scene.
export function applySkyboxTexture(texture, height, exposure, shadowIntensity, shadowSoftness) {
    const viewer = state.viewer;

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

// Removes a skybox from the scene and resets related settings to defaults. 
// This is called when the user selects the "None" option in the skybox dropdown, 
// or when switching models without a persisted skybox selection. 
// It disposes of the skybox texture and geometry to free GPU memory, 
// resets the scene background and environment, and resets exposure, 
// environment intensity, shadow opacity, and sync sliders to their default values.
export function removeSkybox() {
    const viewer = state.viewer;
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
