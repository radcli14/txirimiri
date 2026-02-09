# TXIRIMIRI Web App

#### Video Demo: [YouTube](#)

## Description:

**Txirimiri Web** is a 3D model viewer and screenshot generator that users can run in the browser on desktop or mobile.
This is an adaptation from a previous [iOS app](github.com/radcli14/txirimiri) that I created as part of a [tutorial on hosting 3D model files on iCloud](https://dc-engineer.com/how-to-host-3d-usdz-content-in-icloud-for-an-ar-app-using-cloudkit-realitykit-and-swiftui/), and view them in a native RealityKit view.
The web version reused the same CloudKit container on the front-end via [CloudKitJS](https://developer.apple.com/documentation/cloudkitjs). 

The key utility that I derive from the web app is the screenshot generation feature.
I originally created the tutorial in parallel with a client project in which we were using iCloud to host 3D models of plants and other landscaping features.
To improve user experience, each model would have a corresponding thumbnail. 
I found that it was time-consuming to open each model in Blender, add a background scene, pose the model and camera, and render a screenshot. 
This web app will embed many of the common elements of this thumbnail generation process into a simplified, point-and-click interface.

### Key Features
- Django provides backend, including securely serving the token for iCloud access, the HTML template, and models for the `Model3D`, `Skybox`, and `Screenshot`.
- Model files in `.glb` format and Skybox files in `.hdr` or `.jpg` format are hosted on iCloud, which provides download URLs for the frontend client. The iCloud schema also include metadata such as name, description, and default visualization settings.
- Bootstrap is used to create the UI, including a left sidebar for listing and model selection, a navigation bar, a visual controls panel in the upper right, and icons throughout.
- [Three.js](https://threejs.org/) is used to load visualize the model in 3D, apply a `GroundedSkybox` for image based lighting and background scene, create orbiting camera controls, and generate screenshots.

## Distinctiveness and Complexity
This capstone assignment includes various elements which are unique relative to the lectures and projects including in the main track of the course.
Particularly, the focus on viewing 3D models using Three.js using client-side rendering deviates significantly from the homework exercises.
Additionally, usage of iCloud SDK's to host model content, particularly the schema to host `.glb`-formatted model files and skyboxes, is unique. 
In fact, at the time I wrote the iOS-native tutorial, I had not found references to anyone else on the internet using this particular arrangement.

### To Run the App
To run a local copy, from the `web` folder, execute the following commands in the terminal.
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
``` 

#### [Txirimiri on Vercel](https://txirimiri.vercel.app/)

Alternately, there is a Vercel-hosted build that can run in your browser with no installation, using the link above.

**NOTE**: as of the time of submission (9 Feb. 2026), the Vercel-hosted app will not enable data persistence of user-generated screenshots.
This data persistence *does* however, work if you run the local version via `runserver`, which will use the Django-native persistence with the `sqlite3` database.
As I worked on this capstone project, I started to like the end-product more and more, and am now considering publishing the iOS-native version on the App Store, with the web app as a companion.
In this case, I'd likely use Apple authentication and the iCloud private database for user data persistence, at which time the Django integration would become unnecessary. 
In other words, if you run that version, and see some of the Apple-native integrations, that means I've forked off of the capstone project into one of my own personal interest, using features that may not actually pass the project requirements, but are still pretty cool.
