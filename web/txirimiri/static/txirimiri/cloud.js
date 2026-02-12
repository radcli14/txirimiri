export let container = null;
export let database = null;

// After the init function is called, the CloudKit JS library will be configured 
// and the public database will be available for queries (`database` variable above). 
// This function returns a promise that resolves when initialization is complete.
export function init() {
    // The API token is needed to configure CloudKit. 
    // We fetch it from our backend via an API endpoint, which requires the CSRF token for security. 
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    return fetch('/api/cloudkit-token/', {
        method: 'POST',
        headers: { 'X-CSRFToken': csrfToken },
    })
    .then(response => response.json())
    .then(data => {
        // Configures CloudKit, see: https://developer.apple.com/documentation/cloudkitjs
        CloudKit.configure({
            containers: [{
                containerIdentifier: 'iCloud.com.dcengineer.txirimiri',
                apiTokenAuth: {
                    apiToken: data.api_token,
                    persist: true,
                    signInButton: {
                        id: 'apple-sign-in-button',
                        theme: 'black' // Other options: 'white', 'white-with-outline'.
                    },
                    signOutButton: {
                        id: 'apple-sign-out-button',
                        theme: 'black'
                    }
                },
                environment: 'development'
            }]
        });

        // The container and database variables are non-null once this completes
        container = CloudKit.getDefaultContainer();
        database = container.publicCloudDatabase;
        console.log('CloudKit configured and initialized');
        console.log("APIToken", data.api_token);
    });
}

// This will perform a "lightweight" query, obtaining all name and descriptions 
// of the 3D models, but not the larger model or image files.
export function queryModelRecords() {
    const query = { recordType: 'Model3D' };
    return database.performQuery(query, { 
        desiredKeys: ['name', 'description', 'extension', 'alt_extension'] 
    })
    .then(response => {
        if (response.hasErrors) throw response.errors[0];
        return response.records;
    });
}

// Fetch the URL for the thumbnail image file. These aren't huge files, but a bit
// larger than the name/description, so we want to do this fetch afterward in an
// asynchronouse image viewer for each individual list item.
export function fetchThumbnailUrl(id) {
    return database.fetchRecords([id], { 
        desiredKeys: ['thumbnail'] 
    })
    .then(response => {
        if (response.hasErrors) throw response.errors[0];
        return response.records[0].fields.thumbnail?.value?.downloadURL || null;
    });
}

// Fetch the URL for the full 3D model file. These are the largest files, so we 
// want to do this fetch only when the user selects a model to load.
export function fetchModelUrl(id, useAltModel) {
    const field = useAltModel ? 'alt_model' : 'model';
    console.log(`Fetching ${field} for record ${id}`);
    return database.fetchRecords([id], { 
        desiredKeys: [field] 
    })
    .then(response => {
        if (response.hasErrors) throw response.errors[0];
        return response.records[0].fields[field]?.value?.downloadURL || null;
    });
}

// Fetch the list of all skybox records by name. As with the queryModelRecords function, 
// this is a lightweight query that doesn't fetch the larger image files, 
// just the metadata we need to populate the dropdown list. 
// The image URLs will be fetched separately when the user selects a skybox.
export function querySkyboxRecords() {
    const query = { recordType: 'Skybox' };
    return database.performQuery(query, { 
        desiredKeys: ['name', 'extension', 'height', 'exposure', 'shadow_intensity', 'shadow_softness'] 
    })
    .then(response => {
        if (response.hasErrors) throw response.errors[0];
        return response.records;
    });
}

// Fetch the URL for the skybox image file. These are large files, so we want to
// do this fetch only when the user selects a skybox to load. The function takes
// the record ID of the selected skybox and returns the download URL for the image file.
export function fetchSkyboxImageUrl(id) {
    return database.fetchRecords([id], {
        desiredKeys: ['image']
    })
    .then(response => {
        if (response.hasErrors) throw response.errors[0];
        return response.records[0].fields.image?.value?.downloadURL || null;
    });
}


