"use strict";

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

const txirimiriContainer = CloudKit.getDefaultContainer();
const database = txirimiriContainer.publicCloudDatabase;

console.log('CloudKit configured and database initialized.');
console.log('Container:', txirimiriContainer);
console.log('Database:', database);

function fetchAllNamesAndDescriptions() {
    const query = { recordType: 'Model3D' };
    const options = {
        desiredKeys: ['name', 'description']
    };
    database.performQuery(query, options).then((response) => {
        if (response.hasErrors) {
            console.error(response.errors[0]);
            return;
        }
        const items = response.records.map(record => ({
            name: record.fields.name.value,
            description: record.fields.description.value
        }));
        console.log(items);
    });
}

fetchAllNamesAndDescriptions();

document.addEventListener('DOMContentLoaded', () => {
    const modelList = document.getElementById('model-list');
    const query = { recordType: 'Model3D' };
    const options = {
        desiredKeys: ['name', 'description']
    };
    database.performQuery(query, options).then((response) => {
        if (response.hasErrors) {
            console.error(response.errors[0]);
            return;
        }
        response.records.forEach(record => {
            const id = record.recordName;
            const name = record.fields.name.value;
            const description = record.fields.description.value;
            const item = document.createElement('a');
            item.className = 'list-group-item list-group-item-action';
            item.innerHTML = generateHTML(name, description, id);
            modelList.appendChild(item);

            // Asynchronously fetch and load the thumbnail
            fetchThumbnail(id, item);

            // Add click handler to display model details
            item.addEventListener('click', () => {
                displayModelDetails(id, name, description);
            });
        });
    });
});

function generateHTML(name, description, id) {
    return `
        <div class="model-item-content">
            <div class="model-thumbnail-container">
                <i class="bi bi-box model-icon-placeholder"></i>
                <img class="model-thumbnail" id="thumbnail-${id}" alt="${name} thumbnail" style="display: none;">
            </div>
            <div class="model-details">
                <h5 class="card-title">${name}</h5>
                <p class="card-text">${description}</p>
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
            // Keep the placeholder icon on error
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

function displayModelDetails(id, name, description) {
    const mainContent = document.querySelector('.main-content');

    // Get thumbnail URL from the list item if already loaded
    const listItemImg = document.getElementById(`thumbnail-${id}`);
    const thumbnailSrc = listItemImg && listItemImg.src ? listItemImg.src : null;

    // Update main content with model details
    mainContent.innerHTML = `
        <div class="container py-5">
            <div class="row">
                <div class="col-md-6">
                    <div class="model-detail-thumbnail">
                        ${thumbnailSrc
                            ? `<img src="${thumbnailSrc}" alt="${name}" class="img-fluid rounded">`
                            : '<i class="bi bi-box" style="font-size: 6rem; color: #6c757d;"></i>'}
                    </div>
                </div>
                <div class="col-md-6">
                    <h2>${name}</h2>
                    <p class="lead">${description}</p>
                    <div id="model-status" class="mt-4">
                        <div class="d-flex align-items-center">
                            <div class="spinner-border text-primary me-3" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <span class="text-muted">Downloading model...</span>
                        </div>
                    </div>
                    <div id="model-viewer" style="display: none;">
                        <!-- Model viewer will be inserted here -->
                    </div>
                </div>
            </div>
        </div>
    `;

    // Asynchronously fetch the model file
    fetchModel(id);
}

function fetchModel(id) {
    const options = {
        desiredKeys: ['model']
    };

    database.fetchRecords([id], options).then((response) => {
        if (response.hasErrors) {
            console.error('Error fetching model for', id, response.errors[0]);
            const statusElement = document.getElementById('model-status');
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
        const modelUrl = record.fields.model?.value?.downloadURL;

        if (modelUrl) {
            console.log('Model downloaded:', modelUrl);
            const statusElement = document.getElementById('model-status');
            if (statusElement) {
                statusElement.innerHTML = `
                    <div class="alert alert-success">
                        <i class="bi bi-check-circle"></i> Model loaded successfully
                    </div>
                `;
            }
            // TODO: Initialize 3D model viewer with modelUrl
        } else {
            const statusElement = document.getElementById('model-status');
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