import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { GroundedSkybox } from 'three/addons/objects/GroundedSkybox.js';

import { state } from './cloud.js';

export { THREE, HDRLoader };

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

        // Store viewer state
        state.viewer = {
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

        const viewer = state.viewer;

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
        if (state.currentSkybox && state.currentSkybox.texture) {
            applySkyboxTexture(state.currentSkybox.texture, state.currentSkybox.height,
                state.currentSkybox.exposure, state.currentSkybox.shadowIntensity, state.currentSkybox.shadowSoftness);
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
            if (state.savedCameraDir && state.currentSkybox) {
                camera.position.copy(finalCenter).addScaledVector(state.savedCameraDir, distance);
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

export function updateModelYaw(yaw) {
    const viewer = state.viewer;
    if (!viewer || !viewer.model) return;
    viewer.model.rotation.y = yaw;
}

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
