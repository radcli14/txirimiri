//
//  ContentView.swift
//  txirimiri
//
//  Created by Eliott Radcliffe on 9/28/25.
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        NavigationSplitView {
            ModelSelectionView()
                .navigationDestination(for: Model3D.self) { model in
                    Model3DView(model: model)
                        .navigationTitle(model.name)
                }
        } detail: {
            Text("Select a model")
        }
    }
}

#Preview {
    @Previewable @State var manager = ContentManager(for: "iCloud.com.dcengineer.txirimiri")
    ContentView()
        .environment(manager)
}
