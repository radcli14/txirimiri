//
//  ContentView.swift
//  Model3DLoader
//
//  Created by Eliott Radcliffe on 11/1/25.
//

import SwiftUI
import RealityKit
import ModelIO

struct ContentView: View {
    @State var model: Model3DLoader?
    @State var entity: Entity?
    
    var body: some View {
        NavigationStack {
            VStack {
                RealityView { content in
                    content.camera = .virtual
                    
                    model = Model3DLoader(filename: "susanne", fileExtension: "stl")
                    entity = await model?.loadEntity()
                    
                    print("printSummaryz")
                    model?.asset.meshes.first?.printSummary()
                }
                List {
                    if let model {
                        Section("Model") {
                            contentStack("url.absoluteString", content: model.url.absoluteString)
                            contentStack("asset", content: "\(model.asset)")
                            contentStack("asset.count", content: String(model.asset.count))
                            contentStack("asset.boundingBox", content: "\(model.asset.boundingBox)")
                            contentStack("asset.meshes", content: "\(model.asset.meshes)")
                            contentStack("asset.meshes.first.positionAttribute", content: "\(model.asset.meshes.first?.positionAttribute)")
                            contentStack("asset.meshes.first.positionBuffer", content: "\(model.asset.meshes.first?.positionBuffer)")
                            contentStack("asset.meshes.first.vertexBufferLayout", content: "\(model.asset.meshes.first?.vertexBufferLayout)")
                            contentStack("asset.meshes.first.positions.count", content: "\(model.asset.meshes.first?.positions.count)")
                        }
                    }
                    if let entity {
                        Text(entity.debugDescription)
                    }
                }
            }
            .navigationTitle("Model3DLoader")
        }
    }
    
    private func contentStack(_ label: String, content: String) -> some View {
        VStack(alignment: .leading) {
            Text(label).foregroundColor(.secondary)
            Text(content).font(.caption)
        }
    }
}

#Preview {
    ContentView()
}
