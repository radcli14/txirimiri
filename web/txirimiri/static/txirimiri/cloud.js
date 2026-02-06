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