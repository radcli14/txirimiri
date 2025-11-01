//
//  ContentView.swift
//  Model3DLoader
//
//  Created by Eliott Radcliffe on 11/1/25.
//

import SwiftUI
import RealityKit

struct ContentView: View {
    var body: some View {
        RealityView { content in
            content.camera = .virtual
            
            let model = Model3DLoader(filename: "susanne", fileExtension: "stl")
            let entity = await model.loadEntity()
            print(model.url)
            print(entity)
        }
        .overlay(alignment: .top) {
            Text("Model3DLoader")
                .font(.largeTitle)
                .fontWeight(.black)
                .glassEffect()
        }
    }
}

#Preview {
    ContentView()
}
