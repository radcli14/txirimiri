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
// - Get vertex positions from the asset
// - Get polygon indices from the asset
// - Generate an array of MeshResource
// - Get materials from the asset
// - Generate a ModelEntity using the array of MeshResrouce

/// Handles processing an asset created using `ModelIO` to create a `RealityKit.Entity`
class Model3DLoader {
    let url: URL
    let asset: MDLAsset
    
    init(filename: String, fileExtension: String) {
        url = Bundle.main.url(forResource: filename, withExtension: fileExtension)! // TODO: error handling
        
        // Load the asset using Model I/O.
        asset = MDLAsset(url: url)
    }
    
    func loadEntity() async -> Entity? {

        asset.objects.enumerated().forEach { i, object in
            let children = object.children
            let components = object.components
            
            print("i: \(i)\n - object: \(object)\n - children: \(children)")
            for j in 0..<children.count {
                print("  j: \(j)")
            }
            /*for j in object.components.indices {
                let component = object.components[j]
                print("  j: \(j), componet: \(component)")
            }*/
            if let mesh = object as? MDLMesh {
                print("Success! The object is an MDLMesh.")
                // Use the mesh here
                //mesh.
                for j in 0..<mesh.vertexBuffers.count {
                    let buffer = mesh.vertexBuffers[j]
                    print("  j: \(j)\n   - vertexBuffers: \(buffer)\n   - submeshes: \(mesh.submeshes?.count)")
                    guard let submeshes = mesh.submeshes else { continue }
                    for k in 0..<submeshes.count {
                        guard let submesh = submeshes[k] as? MDLSubmesh else { continue }
                        print("    k: \(k)", submesh.indexBuffer)
                    }
                }
            } else {
                print("The object is a container or another type of MDLObject.")
            }
        }
        return nil
    }

}


extension MDLMesh {
    var vertexDescriptorAttributes: [MDLVertexAttribute] {
        vertexDescriptor.attributes.compactMap {
            $0 as? MDLVertexAttribute
        }
    }
    
    var positionAttribute: MDLVertexAttribute? {
        return vertexDescriptorAttributes.first {
            $0.name == MDLVertexAttributePosition
        }
    }
    
    var positionBuffer: MDLMeshBuffer? {
        guard let index = positionAttribute?.bufferIndex else { return nil }
        return vertexBuffers[index]
    }
    
    var vertexBufferLayout: MDLVertexBufferLayout? {
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
    
    var descriptor: MeshDescriptor {
        var descriptor = MeshDescriptor(name: "me")
        descriptor.positions = .init(positions)
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
    
    func printSummary() {
        guard let submesh = submeshArray.first else { return }
        print("MDLMesh submesh", submesh, submesh.indexCount, submesh.indexBuffer.length)
        //submesh.
        //guard let buffer = vertexBuffers.first else { return }
        //buffer.
    }
}
