let db = null;

// Opens (or creates) the IndexedDB database. Returns a promise that resolves
// when the database is ready for use.
export function init() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('txirimiri', 1);

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            const store = database.createObjectStore('screenshots', {
                keyPath: 'id',
                autoIncrement: true,
            });
            store.createIndex('model3d_record_name', 'model3d_record_name', { unique: false });
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve();
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Saves a screenshot record to the store. Returns a promise that resolves
// with the auto-generated id of the new record.
export function save(data) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('screenshots', 'readwrite');
        const store = tx.objectStore('screenshots');
        const request = store.add(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Returns all screenshot records for a given model, as a promise
// that resolves with an array.
export function getByModel(modelRecordName) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('screenshots', 'readonly');
        const store = tx.objectStore('screenshots');
        const index = store.index('model3d_record_name');
        const request = index.getAll(modelRecordName);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Deletes a screenshot record by id. Returns a promise that resolves
// when the record has been removed.
export function remove(id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('screenshots', 'readwrite');
        const store = tx.objectStore('screenshots');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
