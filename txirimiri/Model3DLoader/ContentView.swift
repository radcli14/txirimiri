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
        print("getEntityFromDAE")
        guard let scene = SCNScene(named: "shiny.dae") else { return nil }
        let node = scene.rootNode
        
        print("- scene:", scene)
        print("- node:", node)
        print("- elementCount:", node.geometry?.elementCount ?? 0)
        print("- node.childNodes:", node.childNodes)

        guard let mesh = node.childNodes.first, let geometry = mesh.geometry else { return nil }
        
        print("- geometry:", geometry)
        geometry.unpack()
        
        guard let resource = await geometry.getMeshResource() else { return nil }

        print("- resource:", resource)
        
        return ModelEntity(
            mesh: resource,
            materials: geometry.rkMaterials
        )
    }
}

#Preview {
    ContentView()
}
