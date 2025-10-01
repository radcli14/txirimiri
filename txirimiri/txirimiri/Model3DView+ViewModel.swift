//
//  Model3DView+ViewModel.swift
//  txirimiri
//
//  Created by Eliott Radcliffe on 10/1/25.
//

import Foundation
import RealityKit
import SwiftUI

extension Model3DView {
    @Observable
    class ViewModel {
        var model: Model3D

        var isSpatialTracking = false
        var entity: ModelEntity?
        
        init(for model: Model3D) {
            self.model = model
        }
    }
}

extension Model3DView.ViewModel {
    
    @MainActor
    func getEntity(from manager: ContentManager) async -> ModelEntity? {
        // If the entity has already been loaded, return it
        if entity != nil {
            return entity
        }
        
        // If the entity has not been loaded, get the stored data, or fetch
        var data: Data? = model.model
        if data == nil, let fetchedModel = await manager.fetchModel(for: model.id) {
            data = fetchedModel.model
            model = fetchedModel
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
