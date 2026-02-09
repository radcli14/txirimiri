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

export function queryModelRecords() {
    const query = { recordType: 'Model3D' };
    const options = { desiredKeys: ['name', 'description', 'extension', 'alt_extension'] };
    return database.performQuery(query, options).then(response => {
        if (response.hasErrors) throw response.errors[0];
        return response.records;
    });
}

export function fetchThumbnailUrl(id) {
    return database.fetchRecords([id], { desiredKeys: ['thumbnail'] }).then(response => {
        if (response.hasErrors) throw response.errors[0];
        return response.records[0].fields.thumbnail?.value?.downloadURL || null;
    });
}

export function fetchModelUrl(id, useAltModel) {
    const field = useAltModel ? 'alt_model' : 'model';
    console.log(`Fetching ${field} for record ${id}`);
    return database.fetchRecords([id], { desiredKeys: [field] }).then(response => {
        if (response.hasErrors) throw response.errors[0];
        return response.records[0].fields[field]?.value?.downloadURL || null;
    });
}

export function querySkyboxRecords() {
    const query = { recordType: 'Skybox' };
    const options = { desiredKeys: ['name', 'extension', 'height', 'exposure', 'shadow_intensity', 'shadow_softness'] };
    return database.performQuery(query, options).then(response => {
        if (response.hasErrors) throw response.errors[0];
        return response.records;
    });
}

export function fetchSkyboxImageUrl(id) {
    return database.fetchRecords([id], { desiredKeys: ['image'] }).then(response => {
        if (response.hasErrors) throw response.errors[0];
        return response.records[0].fields.image?.value?.downloadURL || null;
    });
}
