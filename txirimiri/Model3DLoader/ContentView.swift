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
import ModelIO_to_RealityKit

struct ContentView: View {
    var body: some View {
        NavigationStack {
            VStack {
                Text("RealityKit")
                RealityView { content in
                    /*if let url = Bundle.main.url(forResource: "xyzBlock", withExtension: "obj"),
                       let entity = await ModelEntity.fromMDLAsset(url: url) {
                        content.add(entity)
                    }*/
                    if let entity = await getEntityFromDAE() {
                        content.add(entity)
                    }
                }
                .realityViewCameraControls(.orbit)
                
                Text("SceneKit")
                SceneView(
                    scene: SCNScene(named: "shiny.dae"),
                    options: [.allowsCameraControl, .autoenablesDefaultLighting]
                )
            }
            .navigationTitle("Model3DLoader")
        }
    }
    
    func getEntityFromDAE() async -> ModelEntity? {
        guard let scene = SCNScene(named: "shiny.dae") else { 
            return nil
        }
        
        // Use the new convenience method
        return await ModelEntity.fromSCNScene(scene)
    }
}

#Preview {
    ContentView()
}
