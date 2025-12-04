//
//  Model3DLoader.swift
//  Model3DLoader
//
//  Created by Eliott Radcliffe on 11/1/25.
//

import Foundation
import ModelIO
import RealityKit

// TODO:
// - [x] Get vertex positions from the asset
// - [ ] Get polygon indices from the asset
// - [x] Generate an array of MeshResource
// - [ ] Get materials from the asset
// - [ ] Generate a ModelEntity using the array of MeshResource

/// Handles processing an asset created using `ModelIO` to create a `RealityKit.Entity`
class Model3DLoader {
    let url: URL
    let asset: MDLAsset
    
    init(filename: String, fileExtension: String) {
        url = Bundle.main.url(forResource: filename, withExtension: fileExtension)! // TODO: error handling
        
        // Load the asset using Model I/O.
        asset = MDLAsset(url: url)
    }
    
    func loadEntity() async -> ModelEntity? {
        await asset.getModelEntity()
    }
}


extension MDLAsset {
    private var meshDescriptors: [MeshDescriptor] {
        meshes.map { $0.descriptor }
    }
    
    private func getMeshResource() async -> MeshResource? {
        do {
            return try await MeshResource(from: meshDescriptors)
        } catch {
            print("MDLAsset.getMeshResource() failed because \(error.localizedDescription)")
            return nil
        }
    }

    func getModelEntity() async -> ModelEntity? {
        guard let meshResource = await getMeshResource() else { return nil }
        return ModelEntity(mesh: meshResource)
    }
}


extension MDLMesh {
    private var vertexDescriptorAttributes: [MDLVertexAttribute] {
        vertexDescriptor.attributes.compactMap {
            $0 as? MDLVertexAttribute
        }
    }
    
    private var positionAttribute: MDLVertexAttribute? {
        return vertexDescriptorAttributes.first {
            $0.name == MDLVertexAttributePosition
        }
    }
    
    private var positionBuffer: MDLMeshBuffer? {
        guard let index = positionAttribute?.bufferIndex else { return nil }
        return vertexBuffers[index]
    }
    
    private var vertexBufferLayout: MDLVertexBufferLayout? {
        guard let index = positionAttribute?.bufferIndex else { return nil }
        return vertexDescriptor.layouts[index] as? MDLVertexBufferLayout
    }
    
    var positions: [SIMD3<Float>] {
        guard let positionBuffer, let vertexBufferLayout, let positionAttribute else {
            return []
        }
        // Get the data that informs how to unpack the buffer
        let stride = vertexBufferLayout.stride
        let rawPointer = positionBuffer.map().bytes
        let vertexCount = positionBuffer.length / stride
        let offset = positionAttribute.offset

        var result = [SIMD3<Float>]()
        for i in 0 ..< vertexCount  {
            // Get the pointer associated with this vertex
            let vertexStart = rawPointer.advanced(by: i * stride)
            let positionStart = vertexStart.advanced(by: offset)
            let floatPointer = positionStart.assumingMemoryBound(to: Float.self)
            
            // Unpack this vertex position into the SIMD3<Float>
            result.append(.init(
                x: floatPointer[0],
                y: floatPointer[1],
                z: floatPointer[2]
            ))
        }
        
        return result
    }
    
    // TODO: add primitives
    var descriptor: MeshDescriptor {
        var descriptor = MeshDescriptor(name: "me")
        descriptor.positions = .init(positions)
        descriptor.primitives = .triangles([0, 1, 2])
        return descriptor
    }
    
    var submeshArray: [MDLSubmesh] {
        guard let submeshes else { return [] }
        var result = [MDLSubmesh]()
        for i in 0 ..< submeshes.count {
            if let submesh = submeshes[i] as? MDLSubmesh {
                result.append(submesh)
            }
        }
        return result
    }
}
