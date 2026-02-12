import * as cloud from './cloud.js';

// Parse the ckWebAuthToken from the URL if this page was loaded as an auth redirect
// callback (popup). If present, broadcast to the origin page via BroadcastChannel.
const params = new URLSearchParams(window.location.search);
const ckWebAuthToken = params.get('ckWebAuthToken');
if (ckWebAuthToken) {
    // This is the popup — send the token to the origin page and close.
    const channel = new BroadcastChannel('cloudkit-auth');
    console.log("Popup: broadcasting ckWebAuthToken to origin");
    channel.postMessage({ ckWebAuthToken });
    channel.close();
    window.close();
}

// This code only runs on the origin page (no ckWebAuthToken in URL).
// First, try to restore user from Django session
fetch('/api/get-user-session/')
    .then(r => r.json())
    .then(sessionData => {
        if (sessionData.userRecordName) {
            console.log("Restoring user from Django session:", sessionData);
            gotoAuthenticatedState(sessionData);
        }
    })
    .catch(err => console.log("No session to restore:", err));

cloud.init().then(() => {
    console.log("In authentication.js now");
    console.log(" - container:", cloud.container);
    console.log(" - database:", cloud.database);

    // setUpAuth() registers an internal postMessage listener for the auth popup.
    // Since Apple's COOP headers break window.opener, the popup can't post back.
    // Instead, we listen on BroadcastChannel and replay the token as a
    // self-postMessage so CloudKit JS receives it as if the popup had sent it.
    const authPromise = cloud.container.setUpAuth();

    const channel = new BroadcastChannel('cloudkit-auth');
    channel.onmessage = onReceiveAuthToken;

    authPromise.then(onReceiveUserIdentity).catch(err => {
        console.error("setUpAuth error:", err);
        // Don't go to unauthenticated state if we have a Django session
        fetch('/api/get-user-session/')
            .then(r => r.json())
            .then(sessionData => {
                if (!sessionData.userRecordName) {
                    gotoUnauthenticatedState(err);
                }
            });
    });

    // Also check if user is already authenticated
    cloud.container.whenUserSignsIn().then(userIdentity => {
        console.log("User was already signed in:", userIdentity);
        if (userIdentity) {
            gotoAuthenticatedState(userIdentity);
        }
    }).catch(err => console.log("No existing session:", err));
}).catch(err => {
    console.error("CloudKit init error:", err);
})

function onReceiveUserData(data) {
    console.log("CloudKit REST API user lookup:", data);
    if (data.userRecordName) {
        // Fetch the user's name and thumbnail from the Users record
        cloud.fetchUserRecord(data.userRecordName)
            .then(userRecord => {
                console.log("User record:", userRecord);
                // Add userRecordName from REST API to the user record
                userRecord.userRecordName = data.userRecordName;
                gotoAuthenticatedState(userRecord);
            })
            .catch(err => {
                console.warn("Could not fetch user record:", err);
                gotoAuthenticatedState({
                    userRecordName: data.userRecordName,
                    name: null,
                    thumbnailUrl: null
                });
            });
    }
}

function onReceiveAuthToken(event) {
    if (event.data.ckWebAuthToken) {
        console.log("Origin: received token via BroadcastChannel");

        // Replay the token to CloudKit JS via postMessage so it can establish a session
        // This mimics what the popup would have done if window.opener worked
        window.postMessage({
            ckWebAuthToken: event.data.ckWebAuthToken
        }, window.location.origin);

        // Also verify the token via CloudKit REST API to get user details immediately
        cloud.fetchApiToken().then(apiToken => {
            const encodedToken = encodeURIComponent(event.data.ckWebAuthToken);
            return fetch(`https://api.apple-cloudkit.com/database/1/iCloud.com.dcengineer.txirimiri/development/public/users/current?ckAPIToken=${apiToken}&ckWebAuthToken=${encodedToken}`);
        })
        .then(r => r.json())
        .then(onReceiveUserData)
        .catch(err => console.error("REST API error:", err));
    }
}

function onReceiveUserIdentity(userIdentity) {
    // Either a sign-in or a sign-out button was added to the DOM.

    // userIdentity is the signed-in user or null.
    if(userIdentity) {
        console.log(" - userIdentity:", userIdentity);
        gotoAuthenticatedState(userIdentity);
    } else {
        console.log(" - unidentified user");
        gotoUnauthenticatedState();
    }
}

function displayUserName(name) {
    var displayedUserName = document.getElementById('displayed-username');
    if(displayedUserName) {
      displayedUserName.textContent = name;
    }
}

function gotoUnauthenticatedState(error) {
    console.log(" - Unauthenticated state, error:", error);
    displayUserName('Unauthenticated User');
    document.getElementById('apple-sign-in-button').style.display = '';
    document.getElementById('apple-sign-out-button').style.display = 'none';

    // Show unauthenticated icon, hide authenticated thumbnail/placeholder
    document.getElementById('user-thumbnail').style.display = 'none';
    document.getElementById('user-thumbnail-placeholder').style.display = 'none';
    document.getElementById('user-thumbnail-unauthenticated').style.display = '';

    // Clear user session on sign out
    clearUserSession();
}

function clearUserSession() {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    fetch('/api/clear-user-session/', {
        method: 'POST',
        headers: { 'X-CSRFToken': csrfToken }
    })
    .then(response => response.json())
    .then(data => console.log('User session cleared:', data))
    .catch(err => console.error('Error clearing user session:', err));
}

function gotoAuthenticatedState(userInfo) {
    console.log(" - Authenticated state:", userInfo);
    displayUserName(userInfo.name || 'Signed In');
    document.getElementById('apple-sign-in-button').style.display = 'none';
    document.getElementById('apple-sign-out-button').style.display = '';

    const img = document.getElementById('user-thumbnail');
    const placeholder = document.getElementById('user-thumbnail-placeholder');
    const unauthenticated = document.getElementById('user-thumbnail-unauthenticated');

    // Hide unauthenticated icon, prepare for authenticated state
    unauthenticated.style.display = 'none';
    img.style.display = 'none';
    placeholder.style.display = 'none';

    if (userInfo.thumbnailUrl) {
        // Show placeholder first while loading
        placeholder.style.display = '';

        img.onload = () => {
            img.style.display = '';
            placeholder.style.display = 'none';
        };
        img.onerror = () => {
            // Keep placeholder visible if image fails to load
            img.style.display = 'none';
            placeholder.style.display = '';
        };
        img.src = userInfo.thumbnailUrl;
    } else {
        // No thumbnail URL, just show placeholder
        placeholder.style.display = '';
    }

    // Save user info to Django session (if we have userRecordName from REST API)
    if (userInfo.userRecordName || userInfo.name) {
        saveUserToSession(userInfo);
    }
}

function saveUserToSession(userInfo) {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    fetch('/api/save-user-session/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({
            userRecordName: userInfo.userRecordName,
            name: userInfo.name,
            thumbnailUrl: userInfo.thumbnailUrl
        })
    })
    .then(response => response.json())
    .then(data => console.log('User session saved:', data))
    .catch(err => console.error('Error saving user session:', err));
}
