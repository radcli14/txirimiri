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
            const name = record.fields.name.value;
            const description = record.fields.description.value;
            const item = document.createElement('a');
            item.className = 'list-group-item list-group-item-action';
            item.innerHTML = generateHTML(name, description);
            modelList.appendChild(item);
        });
    });
});

function generateHTML(name, description) {
    return `
        <h5 class="card-title">${name}</h5>
        <p class="card-text">${description}</p>
    `;
}   