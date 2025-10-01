//
//  Model3DView.swift
//  txirimiri
//
//  Created by Eliott Radcliffe on 9/29/25.
//

import SwiftUI
import RealityKit

struct Model3DView: View {
    @Environment(ContentManager.self) var manager
    
    @State var viewModel: ViewModel
    init(for model: Model3D) {
        viewModel = ViewModel(for: model)
    }

    var body: some View {
        RealityView { content in
            let _ = await viewModel.getEntity(from: manager)
        } update: { content in
            content.camera = viewModel.isSpatialTracking ? .spatialTracking : .virtual
            content.entities.removeAll()
            let anchor = viewModel.currentAnchorEntity
            content.add(anchor)
            viewModel.entity?.setParent(anchor)
            viewModel.updateEntityTransformForCurrentCamera()
        } placeholder: {
            entityLoadingView()
        }
        .realityViewCameraControls(.orbit)
        .edgesIgnoringSafeArea(.all)
        .toolbar {
            ToolbarItem {
                Menu {
                    Picker("View Mode", selection: $viewModel.isSpatialTracking) {
                        Label("Normal", systemImage: "camera").tag(false)
                        Label("AR", systemImage: "arkit").tag(true)
                    }
                } label: {
                    Image(systemName: viewModel.isSpatialTracking ? "arkit" : "camera")
                }
            }
        }
    }
    
    /// Displays a circular progress view and a message stating the model is loading as a placeholder
    func entityLoadingView() -> some View {
        VStack {
            ProgressView()
                .scaleEffect(3.14)
                .padding()
                .foregroundColor(.secondary)
            Text("Loading \(viewModel.model.name)")
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    @Previewable @State var manager = ContentManager(for: "iCloud.com.dcengineer.txirimiri")
    let model = Model3D(name: "Basque Pelota", description: "A souvenir from Hendaia", id: "pelota")
    Model3DView(for: model)
        .environment(manager)
}
