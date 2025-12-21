//
//  ContentView.swift
//  Model3DLoader
//
//  Created by Eliott Radcliffe on 11/1/25.
//

import SwiftUI
import RealityKit
import SceneKit
import ModelIO

import DAE_to_RealityKit
import ModelIO_to_RealityKit


struct ContentView: View {
    var body: some View {
        NavigationStack {
            VStack {
                Text("RealityKit").font(.title)
                RealityView { content in
                    if let url = Bundle.main.url(forResource: "shiny", withExtension: "dae"),
                       let entity = await ModelEntity.fromDAEAsset(url: url) {
                        content.add(entity)
                    }
                }
                .realityViewCameraControls(.orbit)
                
                Divider()
                
                Text("SceneKit").font(.title)
                SceneView(
                    scene: getScene(),
                    options: [.allowsCameraControl, .autoenablesDefaultLighting]
                )
            }
            .navigationTitle("Model3DLoader")
        }
    }
    
    func getScene() -> SCNScene? {
        guard let scene = SCNScene(named: "shiny.dae") else { return nil }
        scene.background.contents = UIColor.systemBackground
        return scene
    }
}

#Preview {
    ContentView()
}
