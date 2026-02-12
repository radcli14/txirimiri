import * as cloud from './cloud.js';

// If this page was loaded as an auth redirect callback (has ckWebAuthToken in URL),
// send the token back to the opener window via postMessage and close the popup.
const params = new URLSearchParams(window.location.search);
const ckWebAuthToken = params.get('ckWebAuthToken');
if (ckWebAuthToken && window.opener) {
    window.opener.postMessage({ ckWebAuthToken }, window.opener.location.origin);
    window.close();
}

cloud.init().then(() => {
    console.log("In authentication.js now");
    console.log(" - container:", cloud.container);
    console.log(" - database:", cloud.database);
    console.log(" - ckWebAuthToken:", ckWebAuthToken);

      // Check a user is signed in and render the appropriate button.
    cloud.container.setUpAuth()
    .then(function(userIdentity) {

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
