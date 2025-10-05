# <img src="Assets/icon_outlined.png" width="256" />

_Host 3D models in USDZ format on CloudKit for an iOS app._

This repository is a companion to a (upcoming) tutorial on the DC-Engineer.com blog.
In that tutorial, I explain the methods and code used to generate a CloudKit container for 3D models and associated data, and then fetch that data at run time for viewing in augmented reality (AR).
RealityKit and SwiftUI frameworks are used for 3D rendering and creation of native controls.

## Key Steps and Lessons-Learned

If you follow along with the tutorial, you will be introduced to the following:
1. Setting up the initial app template to use CloudKit, adding the [entitlements file](https://github.com/radcli14/txirimiri/blob/main/txirimiri/txirimiri/txirimiri.entitlements), and enabling permissions.
2. Building your model schema through your browser in the CloudKit console, and adding a 3D model.
3. Creating a [content manager](https://github.com/radcli14/txirimiri/blob/main/txirimiri/txirimiri/ContentManager.swift) to fetch data and [convert to an entity](https://github.com/radcli14/txirimiri/blob/main/txirimiri/txirimiri/Model3DView%2BViewModel.swift) for use in your app at runtime.
4. Adding the content to a [3D scene in RealityKit](https://github.com/radcli14/txirimiri/blob/main/txirimiri/txirimiri/Model3DView.swift). 
