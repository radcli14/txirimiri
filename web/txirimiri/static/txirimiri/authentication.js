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
            console.log("Origin: received token via BroadcastChannel, replaying to self");
            window.postMessage({ ckWebAuthToken: event.data.ckWebAuthToken }, window.location.origin);
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

    if(error && error.ckErrorCode === 'AUTH_PERSIST_ERROR') {
        console.log(" - AUTH_PERSIST_ERROR");
    }

    displayUserName('Unauthenticated User');
    cloud.container
        .whenUserSignsIn()
        .then(gotoAuthenticatedState)
        .catch(gotoUnauthenticatedState);
}

function gotoAuthenticatedState(userInfo) {
    if(userInfo.isDiscoverable) {
        displayUserName(userInfo.firstName + ' ' + userInfo.lastName);
    } else {
        displayUserName('User record name: ' + userInfo.userRecordName);
    }
    cloud.container
        .whenUserSignsOut()
        .then(gotoUnauthenticatedState);
}
