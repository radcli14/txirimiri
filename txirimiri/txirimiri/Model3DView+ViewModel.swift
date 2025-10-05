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
    /// The view model is responsible for the logic of fetching entity data given the CloudKit-hosted `Model3D`
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
    
    /// Asynchrnously onverts the data stored in the model to a RealityKit Entity, or fetches a new model from CloudKit.
    func getEntity(from manager: ContentManager) async -> ModelEntity? {
        // If the entity has already been loaded, return it
        if let entity {
            return entity
        }
        
        // If the entity has not been loaded, get the stored data, or fetch
        var data: Data? = model.model
        if data == nil, let fetchedModel = await manager.fetchModel(for: model.id) {
            data = fetchedModel.model
            model = fetchedModel
        }
        guard let data else { return nil }
                
        // Convert the stored Data to a USDZ file into a temporary directory,
        // and give it a extension so RealityKit recognizes which loader to use
        let tempDir = FileManager.default.temporaryDirectory
        let tempURL = tempDir
            .appendingPathComponent(model.id)
            .appendingPathExtension(model.ext ?? "usdz")
        try? data.write(to: tempURL)

        // Load the entity, clean up the temporary file, and return the entity
        guard model.ext == "usdz" else {
            print("WARNING: \(model.ext ?? "nil") is not a supported file extension for loading an entity, returning nil")
            return nil
        }
        entity = try? await ModelEntity(contentsOf: tempURL)

        // Clean up the temporary file, and return
        try? FileManager.default.removeItem(at: tempURL)
        
        return entity
    }
    
    // Rescale the entity so that its norm bounding box dimension is one meter,
    // and either center it for the standard camera,
    // or place its bottom surface at zero for the spatial tracking camera
    func updateEntityTransformForCurrentCamera() {
        guard let entity, let mesh = entity.model?.mesh else { return }
        var transform = entity.transform
        var translation = -meshCenter
        if isSpatialTracking {
            translation.y = -mesh.bounds.min.y
        }
        transform.translation = translation / meshSize
        transform.scale = .one / meshSize
        entity.transform.scale = .zero
        entity.move(to: transform, relativeTo: nil, duration: 0.69)
    }
    
    /// Provide either a horizontal anchor if spatial tracking, or an anchor at the origin if not.
    /// In the case of the latter, a perspective camera will also be attached.
    var currentAnchorEntity: AnchorEntity {
        let anchor: AnchorEntity
        if isSpatialTracking {
            anchor = AnchorEntity(plane: .horizontal)
        } else {
            anchor = AnchorEntity(world: .zero)
            let camera = PerspectiveCamera()
            camera.look(at: .zero, from: .one, relativeTo: nil)
            camera.setParent(anchor)
        }
        return anchor
    }
    
    /// The normalized difference between the bounding box minimum and maximum for the entity's mesh
    private var meshSize: Float {
        guard let boundingBox = entity?.model?.mesh.bounds else { return 1 }
        let delta = boundingBox.max - boundingBox.min
        return sqrt(delta.x * delta.x + delta.y * delta.y + delta.z * delta.z)
    }
    
    private var meshCenter: SIMD3<Float> {
        guard let boundingBox = entity?.model?.mesh.bounds else { return .zero }
        return 0.5 * (boundingBox.min + boundingBox.max)
    }
}
