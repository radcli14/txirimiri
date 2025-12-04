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
    @State var entity: ModelEntity?
    
    var body: some View {
        NavigationStack {
            VStack {
                RealityView { content in
                    content.camera = .virtual
                    
                    model = Model3DLoader(filename: "susanne", fileExtension: "stl")
                    entity = await model?.loadEntity()
                    
                    guard let entity else { return }
                    content.add(entity)

                }
                List {
                    if let model {
                        Section("Model") {
                            contentStack("url.absoluteString", content: model.url.absoluteString)
                            contentStack("asset", content: "\(model.asset)")
                            contentStack("asset.count", content: String(model.asset.count))
                            contentStack("asset.boundingBox", content: "\(model.asset.boundingBox)")
                            contentStack("asset.meshes", content: "\(model.asset.meshes)")
                            if let mesh = model.asset.meshes.first {
                                contentStack("mesh.positions.count", content: "\(mesh.positions.count)")
                            }
                        }
                    }
                    if let entity {
                        Section("Entity") {
                            contentStack("entity.debugDescription", content: entity.debugDescription)
                            contentStack("entity.model.mesh.bounds", content: "\(entity.model?.mesh.bounds)")
                        }
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
