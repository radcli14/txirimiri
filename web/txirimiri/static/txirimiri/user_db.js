let db = null;

// Opens (or creates) the IndexedDB database for user authentication.
// Returns a promise that resolves when the database is ready.
export function init() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('txirimiri-auth', 1);

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            // Create a simple key-value store for user data
            database.createObjectStore('user', { keyPath: 'id' });
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

// Saves user authentication data to IndexedDB.
// Returns a promise that resolves when the save is complete.
export function saveUser(userInfo) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('user', 'readwrite');
        const store = tx.objectStore('user');
        const request = store.put({
            id: 'current-user',
            userRecordName: userInfo.userRecordName,
            name: userInfo.name,
            thumbnailUrl: userInfo.thumbnailUrl,
        });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Retrieves the stored user authentication data.
// Returns a promise that resolves with the user data or null if not found.
export function getUser() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('user', 'readonly');
        const store = tx.objectStore('user');
        const request = store.get('current-user');

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

// Clears the stored user authentication data.
// Returns a promise that resolves when the data is cleared.
export function clearUser() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('user', 'readwrite');
        const store = tx.objectStore('user');
        const request = store.delete('current-user');

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
