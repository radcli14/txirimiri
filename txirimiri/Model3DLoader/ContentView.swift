//
//  ContentView.swift
//  Model3DLoader
//
//  Created by Eliott Radcliffe on 11/1/25.
//

import SwiftUI
import RealityKit
import ModelIO_to_RealityKit

struct ContentView: View {
    var body: some View {
        NavigationStack {
            RealityView { content in
                let model = Model3DLoader(filename: "shiny", fileExtension: "obj")
                let entity = await model.loadEntity()
                if let entity {
                    content.add(entity)
                }
            }
            .realityViewCameraControls(.orbit)
            .navigationTitle("Model3DLoader")
        }
    }
}

#Preview {
    ContentView()
}
