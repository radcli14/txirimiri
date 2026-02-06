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
