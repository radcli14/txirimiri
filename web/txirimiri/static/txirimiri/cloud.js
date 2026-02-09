import {
    generateModelItemHTML,
    buildModelDetailsPage,
    wireUpViewOptionsPanel,
    wireUpSliders,
    wireUpScreenshotButton,
    loadScreenshots,
} from './bootstrap_ui.js';

import {
    THREE,
    HDRLoader,
    initializeViewer,
    applySkyboxTexture,
    removeSkybox,
} from './three_viewer.js';

// Shared state accessible by all modules
export const state = {
    viewer: null,
    currentSkybox: null,
    savedCameraDir: null,
    model3dRecordName: null,
};

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
            item.innerHTML = generateModelItemHTML(name, description, id);
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
    state.model3dRecordName = id;

    // Update navbar title
    const navbarTitle = document.getElementById('navbar-title');
    if (navbarTitle) {
        navbarTitle.textContent = name;
    }

    // Save camera direction before disposing (for orientation persistence with skybox)
    if (state.viewer && state.currentSkybox && state.viewer.controls) {
        const dir = new THREE.Vector3().subVectors(state.viewer.camera.position, state.viewer.controls.target).normalize();
        state.savedCameraDir = dir;
    } else {
        state.savedCameraDir = null;
    }

    // Clean up previous viewer
    if (state.viewer) {
        state.viewer.dispose();
        state.viewer = null;
    }

    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = buildModelDetailsPage(id, name, description, extension);
    wireUpViewOptionsPanel();

    // Asynchronously fetch the model file and skyboxes
    fetchModel(id, extension, useAltModel);
    fetchSkyboxes();
    loadScreenshots(id);
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
            initializeViewer(modelUrl, () => {
                wireUpSliders();
                wireUpScreenshotButton();
                if (state.currentSkybox) {
                    applySkybox(state.currentSkybox.id, state.currentSkybox.name, state.currentSkybox.extension,
                        state.currentSkybox.height, state.currentSkybox.exposure,
                        state.currentSkybox.shadowIntensity, state.currentSkybox.shadowSoftness);
                }
            });
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
                state.currentSkybox = {
                    id: selectedOption.value,
                    name: selectedOption.textContent,
                    extension: selectedOption.dataset.extension,
                    height: selectedOption.dataset.height,
                    exposure: selectedOption.dataset.exposure,
                    shadowIntensity: selectedOption.dataset.shadowIntensity,
                    shadowSoftness: selectedOption.dataset.shadowSoftness
                };
                applySkybox(state.currentSkybox.id, state.currentSkybox.name, state.currentSkybox.extension,
                    state.currentSkybox.height, state.currentSkybox.exposure,
                    state.currentSkybox.shadowIntensity, state.currentSkybox.shadowSoftness);
            } else {
                state.currentSkybox = null;
                removeSkybox();
            }
        });

        // Restore previous skybox selection if switching models
        if (state.currentSkybox) {
            for (const opt of dropdown.options) {
                if (opt.value === state.currentSkybox.id) {
                    dropdown.value = state.currentSkybox.id;
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
    if (!state.viewer) {
        console.error('Viewer not initialized');
        return;
    }

    // Reuse cached texture if same skybox is being re-applied (e.g. model switch)
    if (state.currentSkybox && state.currentSkybox.texture && state.currentSkybox.id === id) {
        console.log('Reusing cached texture for skybox:', name);
        applySkyboxTexture(state.currentSkybox.texture, height, exposure, shadowIntensity, shadowSoftness);
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
            if (state.currentSkybox && state.currentSkybox.id === id) {
                state.currentSkybox.texture = texture;
            }

            applySkyboxTexture(texture, height, exposure, shadowIntensity, shadowSoftness);
        }, undefined, (error) => {
            console.error('Error loading skybox texture:', error);
        });
    }).catch((error) => {
        console.error('Error fetching skybox image for', id, error);
    });
}
