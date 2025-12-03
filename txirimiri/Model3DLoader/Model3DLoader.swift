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

        print("asset:", asset)
        print("asset.boundingBox:", asset.boundingBox, "\n")

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
    /// The array of `MDLObject` found in this `MDLAsset`
    var objects: [MDLObject] {
        var result = [MDLObject]()
        for i in 0 ..< self.count {
            result.append(self.object(at: i))
        }
        return result
    }
    
    /// The `MDLMesh` instances inside of the `objects` array
    var meshes: [MDLMesh] {
        objects.compactMap { $0 as? MDLMesh }
    }
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
