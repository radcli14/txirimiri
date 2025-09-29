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
    
    @State private var isSpatialTracking = false
    @State private var entity: ModelEntity?

    let model: Model3D
    
    var body: some View {
        RealityView { content in
            content.camera = isSpatialTracking ? .spatialTracking : .virtual
            if let entity = await getEntity() {
                content.add(entity)
            }
        } update: { content in
            print("update, entity: \(entity?.name ?? "nil")")
        } placeholder: {
            ProgressView()
                .scaledToFill()
                .padding()
        }
        .realityViewCameraControls(.orbit)
    }
    
    func getEntity() async -> ModelEntity? {
        // If the entity has already been loaded, return it
        if entity != nil {
            return entity
        }
        
        // If the entity has not been loaded, get the stored data, or fetch
        var data: Data? = model.model
        if data == nil {
            let fetchedModel = await manager.fetchModel(for: model.id)
            data = fetchedModel?.model
        }
        guard let data else { return nil }
                
        // Convert the stored Data to a USDZ file into a temporary directory, and give it a .usdz extension, which ensures that RealityKit recognizes which loader to use
        let tempDir = FileManager.default.temporaryDirectory
        let tempURL = tempDir
            .appendingPathComponent(model.id)
            .appendingPathExtension(model.ext ?? "usdz")
        try? data.write(to: tempURL)

        // Load the entity, clean up the temporary file, and return the entity
        entity = try? await ModelEntity(contentsOf: tempURL)
        entity?.name = model.name

        // Clean up the temporary file, and return
        try? FileManager.default.removeItem(at: tempURL)
        
        return entity
    }
}

#Preview {
    @Previewable @State var manager = ContentManager(for: "iCloud.com.dcengineer.txirimiri")
    let model = Model3D(name: "Basque Pelota", description: "A souvenir from Hendaia", id: "pelota")
    Model3DView(model: model)
}
