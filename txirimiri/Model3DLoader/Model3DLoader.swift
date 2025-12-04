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


extension MDLAsset {
    /*
    var lowLevelMeshDescriptor: LowLevelMesh.Descriptor? {
        self.vertexDescriptor?.attributes
        /*
         init(
             vertexCapacity: Int = 0,
             vertexAttributes: [LowLevelMesh.Attribute] = [Attribute](),
             vertexLayouts: [LowLevelMesh.Layout] = [Layout](),
             indexCapacity: Int = 0,
             indexType: MTLIndexType = MTLIndexType.uint32
         )
         */
        return nil
    }
    
    var lowLevelMesh: LowLevelMesh? {
        guard let lowLevelMeshDescriptor else { return nil }
        return try? .init(descriptor: lowLevelMeshDescriptor)
    }
    
    var meshResource: MeshResource? {
        guard let lowLevelMesh else { return nil }
        return try? .init(from: lowLevelMesh)
    }
    
    var rkMaterial: Material? {
        return nil
    }
     */
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
    
    var vertexData: MeshBuffer<Data>? {
        guard let positionBufferData = positionBuffer as? MDLMeshBufferData,
                let vertexBufferLayout, let positionAttribute
        else { return nil }
        
        let rawData = positionBufferData.data as Data
        
        /*return MeshBuffer<Data>(
            data: rawData,
            stride: vertexBufferLayout.stride,
            offset: positionAttribute.offset
        )*/
        
        return nil // TODO
    }
    
    var descriptors: [MeshDescriptor] {
        let resource = MeshDescriptor()
        //resource.buffers //= [self.vertexBuffers]
        return []
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
    
    /// Safely prints the numeric values of all vertex positions (x, y, z).
    func printVertexPositions() {
        guard let buffer = self.positionBuffer,
              let layout = self.vertexBufferLayout,
              let attribute = self.positionAttribute
        else {
            print("Error: Missing required position components (buffer, layout, or attribute).")
            return
        }

        let stride = layout.stride
        let offset = attribute.offset
        
        // 1. Map the buffer memory to a raw pointer.
        // This is necessary to access the data directly in memory.
        let rawPointer = buffer.map().bytes
        
        // 2. Calculate the total number of vertices.
        let vertexCount = buffer.length / stride
        
        print("--- Vertex Positions (Total: \(vertexCount)) ---")
        
        for i in 0..<vertexCount {
            // Calculate the start of the current vertex's data block.
            let vertexStart = rawPointer.advanced(by: i * stride)
            
            // Calculate the start of the position data within the vertex block (applying offset).
            let positionStart = vertexStart.advanced(by: offset)
            
            // Treat the pointer at positionStart as a pointer to the first float (X-component).
            // Positions are typically stored as 3 consecutive 32-bit floats (x, y, z).
            let floatPointer = positionStart.assumingMemoryBound(to: Float.self)
            
            let x = floatPointer[0]
            let y = floatPointer[1]
            let z = floatPointer[2]
            
            print("Vertex \(i): X=\(x), Y=\(y), Z=\(z)")
        }
        
        print("---------------------------------")
    }
}
