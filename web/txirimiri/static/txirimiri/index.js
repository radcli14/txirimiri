import * as cloud from './cloud.js';
import * as viewer from './three_viewer.js';
import * as ui from './bootstrap_ui.js';
import * as screenshotDb from './screenshot_db.js';

// Shared state — passed by reference to viewer and ui modules
const state = {
    viewer: null,
    currentSkybox: null,
    savedCameraDir: null,
    model3dRecordName: null,
};

// Initialize modules with shared state
viewer.init(state);
ui.init(state, {
    updateModelScale: viewer.updateModelScale,
    updateModelYaw: viewer.updateModelYaw,
    saveScreenshot: screenshotDb.save,
    getScreenshots: screenshotDb.getByModel,
    deleteScreenshot: screenshotDb.remove,
});

// --- Entry point ---

document.addEventListener('DOMContentLoaded', () => {
    const modelList = document.getElementById('model-list');

    Promise.all([cloud.init(), screenshotDb.init()]).then(() => cloud.queryModelRecords()).then(records => {
        records.forEach(record => {
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

            // Prefer GLB in alt_extension, fallback to extension
            const useAltModel = altExtension.toLowerCase() === 'glb';
            const displayExtension = useAltModel ? altExtension : extension;

            const item = document.createElement('a');
            item.className = 'list-group-item list-group-item-action text-bg-secondary';
            item.innerHTML = ui.generateModelItemHTML(name, description, id);
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

                // Close sidebar on mobile devices
                if (window.innerWidth < 768) {
                    const sidebarElement = document.getElementById('sidebar');
                    const sidebar = bootstrap.Offcanvas.getInstance(sidebarElement);
                    if (sidebar) sidebar.hide();
                }
            });
        });
    }).catch(error => {
        console.error('Error fetching models:', error);
    });
});

// --- Orchestration functions ---

function fetchThumbnail(id, itemElement) {
    cloud.fetchThumbnailUrl(id).then(thumbnailUrl => {
        if (thumbnailUrl) {
            const imgElement = itemElement.querySelector(`#thumbnail-${id}`);
            const iconPlaceholder = itemElement.querySelector('.model-icon-placeholder');
            if (imgElement) {
                imgElement.onload = () => {
                    imgElement.style.display = 'block';
                    if (iconPlaceholder) iconPlaceholder.style.display = 'none';
                };
                imgElement.src = thumbnailUrl;
            }
        }
    }).catch(error => {
        console.error('Error fetching thumbnail for', id, error);
    });
}

function displayModelDetails(id, name, description, extension, useAltModel) {
    state.model3dRecordName = id;

    // Update navbar title
    const navbarTitle = document.getElementById('navbar-title');
    if (navbarTitle) navbarTitle.textContent = name;

    // Save camera direction and dispose previous viewer
    viewer.saveCameraDirection();
    viewer.disposeViewer();

    // Show the detail page and wire up the view options panel
    ui.showModelDetailsPage(description, extension);
    ui.wireUpViewOptionsPanel();

    // Asynchronously fetch the model file, skyboxes, and screenshots
    fetchModel(id, useAltModel);
    fetchSkyboxes();
    ui.loadScreenshots(id);
}

function fetchModel(id, useAltModel) {
    cloud.fetchModelUrl(id, useAltModel).then(modelUrl => {
        if (modelUrl) {
            console.log('Model URL:', modelUrl);
            document.getElementById('model-status').classList.add('d-none');

            viewer.initializeViewer(modelUrl, () => {
                ui.wireUpSliders();
                ui.wireUpScreenshotButton();
            });
        } else {
            document.getElementById('model-status-loading').classList.add('d-none');
            document.getElementById('model-status-warning').classList.remove('d-none');
        }
    }).catch(error => {
        console.error('Error fetching model for', id, error);
        document.getElementById('model-status-loading').classList.add('d-none');
        document.getElementById('model-status-error').classList.remove('d-none');
    });
}

function fetchSkyboxes() {
    const dropdown = document.getElementById('skybox-dropdown');
    if (!dropdown) {
        console.error('Skybox dropdown not found');
        return;
    }

    cloud.querySkyboxRecords().then(records => {
        // Clear the dropdown and add default option
        dropdown.innerHTML = '<option value="">Select a skybox</option>';

        // Add each skybox as an option
        records.forEach(record => {
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
                    shadowSoftness: selectedOption.dataset.shadowSoftness,
                };
                applySkybox(state.currentSkybox);
            } else {
                state.currentSkybox = null;
                viewer.removeSkybox();
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

        console.log(`Loaded ${records.length} skyboxes`);
    }).catch(error => {
        console.error('Error fetching skyboxes:', error);
        dropdown.innerHTML = '<option value="">Error loading skyboxes</option>';
    });
}

function applySkybox(skybox) {
    if (!state.viewer) {
        console.error('Viewer not initialized');
        return;
    }

    // Reuse cached texture if same skybox is being re-applied (e.g. model switch)
    if (skybox.texture) {
        console.log('Reusing cached texture for skybox:', skybox.name);
        viewer.applySkyboxTexture(skybox.texture, skybox.height, skybox.exposure,
            skybox.shadowIntensity, skybox.shadowSoftness);
        return;
    }

    console.log('Loading skybox:', skybox.name);

    cloud.fetchSkyboxImageUrl(skybox.id).then(imageUrl => {
        if (!imageUrl) {
            console.error('No image URL found for skybox');
            return;
        }

        viewer.loadSkyboxTexture(imageUrl, skybox.extension).then(texture => {
            // Cache the texture on currentSkybox for reuse on model switch
            if (state.currentSkybox && state.currentSkybox.id === skybox.id) {
                state.currentSkybox.texture = texture;
            }
            viewer.applySkyboxTexture(texture, skybox.height, skybox.exposure,
                skybox.shadowIntensity, skybox.shadowSoftness);
        }).catch(error => {
            console.error('Error loading skybox texture:', error);
        });
    }).catch(error => {
        console.error('Error fetching skybox image for', skybox.id, error);
    });
}
