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
    channel.onmessage = (event) => {
        if (event.data.ckWebAuthToken) {
            console.log("Origin: received token via BroadcastChannel");
            document.getElementById('ck-web-auth-token').textContent = "ckWebAuthToken: " + event.data.ckWebAuthToken;

            // Verify the token via CloudKit REST API
            cloud.fetchApiToken().then(apiToken => {
                const encodedToken = encodeURIComponent(event.data.ckWebAuthToken);
                return fetch(`https://api.apple-cloudkit.com/database/1/iCloud.com.dcengineer.txirimiri/development/public/users/current?ckAPIToken=${apiToken}&ckWebAuthToken=${encodedToken}`);
            })
            .then(r => r.json())
            .then(data => {
                console.log("CloudKit REST API user lookup:", data);
                if (data.userRecordName) {
                    // Fetch the user's name and thumbnail from the Users record
                    cloud.fetchUserRecord(data.userRecordName)
                        .then(userRecord => {
                            console.log("User record:", userRecord);
                            gotoAuthenticatedState(userRecord);
                        })
                        .catch(err => {
                            console.warn("Could not fetch user record:", err);
                            gotoAuthenticatedState({ name: null, thumbnailUrl: null });
                        });
                }
            })
            .catch(err => console.error("REST API error:", err));
        }
    };

    authPromise.then(function(userIdentity) {

      // Either a sign-in or a sign-out button was added to the DOM.

      // userIdentity is the signed-in user or null.
      if(userIdentity) {
        console.log(" - userIdentity:", userIdentity);
        gotoAuthenticatedState(userIdentity);
      } else {
        console.log(" - unidentified user");
        gotoUnauthenticatedState();
      }
    });
})

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
}

function gotoAuthenticatedState(userInfo) {
    console.log(" - Authenticated state:", userInfo);
    displayUserName(userInfo.name || 'Signed In');
    document.getElementById('apple-sign-in-button').style.display = 'none';
    document.getElementById('apple-sign-out-button').style.display = '';
}
