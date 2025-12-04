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
// - [x] Generate a ModelEntity using the array of MeshResource

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
        return ModelEntity(mesh: meshResource)//, materials: [SimpleMaterial()])
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
        let indices = submeshArray.compactMap { $0.indices }.flatMap { $0 }
        
        descriptor.primitives = .triangles(indices)
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

extension MDLSubmesh {
    var indexData: Data {
        return Data(bytes: indexBuffer.map().bytes, count: indexBuffer.length)
    }
    
    /// The array of indices defining face connectivity
    var indices: [UInt32] {
        var result: [UInt32] = []

        // Access the raw memory pointer of the index data
        indexData.withUnsafeBytes { (bufferPointer) in
            guard let baseAddress = bufferPointer.baseAddress else { return }

            switch self.indexType {
            case .uint16:
                // Data is 16-bit (UInt16), so we read and convert to UInt32
                let pointer = baseAddress.assumingMemoryBound(to: UInt16.self)
                for i in 0..<indexCount {
                    // Read the 16-bit index and cast it up to 32-bit
                    result.append(UInt32(pointer[i]))
                }
            
            case .uint32:
                // Data is already 32-bit (UInt32)
                let pointer = baseAddress.assumingMemoryBound(to: UInt32.self)
                for i in 0..<indexCount {
                    result.append(pointer[i])
                }
            
            default:
                // Handle unsupported types (e.g., .invalid)
                print("MDLSubmesh indexType \(self.indexType.rawValue) not supported for unpacking indices.")
                return
            }
        }
        
        return result
    }
    
    var primitives: MeshDescriptor.Primitives? {
        switch geometryType {
        case .triangles: return .triangles(indices)
        case .quads: return .trianglesAndQuads(triangles: [], quads: indices)
        case .variableTopology: return nil
        case .triangleStrips: return nil
        case .lines: return nil
        case .points: return nil
        @unknown default:
            print("MDLSubmesh geometryType: \(geometryType) is unknown")
            return nil
        }
    }
    
    func printSummary() {
        print("MDLSubmesh.printSummary()")
        print(" - indexType: \(indexType)")
        print(" - indexData: \(indexData)")
        print(" - geometryType: triangles? \(geometryType == MDLGeometryType.triangles)")
        print(" - primitives: \(primitives)")
        print(" - indexCount: \(indexCount)")
        
        let indices = self.indices
        print(" - total indices: \(indices.count)")
        
        if geometryType == .triangles {
            let triangleCount = indices.count / 3
            print(" - triangle count: \(triangleCount)")
            
            // Print first few triangles to see the structure
            let samplesToShow = min(5, triangleCount)
            print(" - first \(samplesToShow) triangles:")
            for i in 0..<samplesToShow {
                let idx = i * 3
                let v0 = indices[idx]
                let v1 = indices[idx + 1]
                let v2 = indices[idx + 2]
                print("   Triangle \(i): [\(v0), \(v1), \(v2)]")
            }
        }
    }
}
