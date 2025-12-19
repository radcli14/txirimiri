//
//  ModelEntity+DAE.swift
//  Model3DLoader
//
//  Created by Eliott Radcliffe on 12/18/25.
//

import Foundation
import RealityKit
import SceneKit

extension SCNNode {
    func unpack() {
        
    }
}

extension SCNGeometry {
    func unpack() {
        elements.enumerated().forEach { i, element in
            print("  * geometry.elements[\(i)]:", element)
            //print("  * element.primitives:", element.primitives)
            print("    > element.primitiveCount:", element.primitiveCount)
            print("    > element.primitiveType:", element.primitiveType)
            print("    > element.bytesPerIndex:", element.bytesPerIndex)
            print("    > element.indicesChannelCount:", element.indicesChannelCount)
            
        }
        /*sources.enumerated().forEach { i, source in
            print("  sources[\(i)]:", source)
            
        }*/
        print("  * sources.vertices?.count:", sources.vertices?.count ?? 0)
        print("  * sources.normals?.count:", sources.normals?.count ?? 0)
        print("  * sources.textureCoordinates?.count:", sources.textureCoordinates?.count ?? 0)
    }
    
    /// An array of `MeshDescriptor` derived from the `positions` array and primitive indices contained in the `submeshes`
    @MainActor var descriptors: [MeshDescriptor] {
        
        // Get the computed properties first, so they aren't computed multiple times inside the map
        guard let positions = sources.vertices,
              let textureCoordinates = sources.textureCoordinates,
              let normals = sources.normals
        else { return [] }

        // Map the mesh descriptors from the submeshes
        return elements.map { element in
            // Initialize the descriptor with positions
            var descriptor = MeshDescriptor(name: name ?? "dae")
            descriptor.positions = .init(positions)
            
            // Make sure the coordinates and normals are dimensionally consistent with the positions
            if textureCoordinates.count == positions.count {
                descriptor.textureCoordinates = .init(textureCoordinates)
            }
            if normals.count == positions.count {
                descriptor.normals = .init(normals)
            }
            
            // Add primitives from the submesh
            descriptor.primitives = element.primitives
            return descriptor
        }
    }
    
    /// Asynchrnously onbtain a RealityKit `MeshResource` derived from the meshes in this model
    @MainActor func getMeshResource() async -> MeshResource? {
        do {
            //let sendableDescriptors = UnsafeSendableDescriptors(descriptors: meshDescriptors)
            return try await MeshResource(from: descriptors)
        } catch {
            print("SCNGeometry.getMeshResource() failed because \(error.localizedDescription)")
            return nil
        }
    }
    
    @MainActor var rkMaterials: [PhysicallyBasedMaterial] {
        materials.compactMap { $0.rkMaterial }
    }
}

extension SCNMaterial {
    @MainActor var rkMaterial: PhysicallyBasedMaterial? {
        var material = PhysicallyBasedMaterial()
        
        if let color = diffuse.uiColor {
            material.baseColor = .init(tint: color)
        } /*else if let image = diffuse.uiImage {
            material.baseColor = .init(texture: .init(<#T##resource: TextureResource##TextureResource#>)
        }*/
        
        return material
    }
}


extension SCNMaterialProperty {
    var uiColor: UIColor? {
        contents as? UIColor
    }
    
    var uiImage: UIImage? {
        contents as? UIImage
    }
}


extension SCNGeometrySource {
    var hasFloat3Array: Bool {
        semantic == .vertex || semantic == .normal
    }
    
    var hasFloat2Array: Bool {
        semantic == .texcoord
    }
    
    /// Unpacks the array of `SIMD3<Float>` from this source's `Data` //given a bufffer, layout, and attribute
    func getFloat3Array() -> [SIMD3<Float>] {
        guard hasFloat3Array else { return [] }
        var result = [SIMD3<Float>]()
        data.withUnsafeBytes { bufferPointer in
            guard let baseAddress = bufferPointer.baseAddress else { return }
            
            // Get the pointer corresponding to the start of the vector data
            let vertexPointer = baseAddress
                .assumingMemoryBound(to: Float.self)
                .advanced(by: dataOffset)
            
            // Loop through each of the vectors
            for i in 0 ..< vectorCount  {
                // Get the pointer associated with this vertex
                let floatPointer = vertexPointer.advanced(by: i * dataStride)

                // Unpack this vector data into the SIMD3<Float>
                result.append(.init(
                    x: floatPointer[0],
                    y: floatPointer[1],
                    z: floatPointer[2]
                ))
            }
        }
        return result
    }
    
    /// Unpacks the array of `SIMD3<Float>` from this source's `Data` //given a bufffer, layout, and attribute
    func getFloat2Array() -> [SIMD2<Float>] {
        guard hasFloat2Array else { return [] }
        var result = [SIMD2<Float>]()
        data.withUnsafeBytes { bufferPointer in
            guard let baseAddress = bufferPointer.baseAddress else { return }
            
            // Get the pointer corresponding to the start of the vector data
            let vertexPointer = baseAddress
                .assumingMemoryBound(to: Float.self)
                .advanced(by: dataOffset)
            
            // Loop through each of the vectors
            for i in 0 ..< vectorCount  {
                // Get the pointer associated with this vertex
                let floatPointer = vertexPointer.advanced(by: i * dataStride)

                // Unpack this vector data into the SIMD3<Float>
                result.append(.init(
                    x: floatPointer[0],
                    y: floatPointer[1],
                ))
            }
        }
        return result
    }
}

extension [SCNGeometrySource] {
    var vertices: [SIMD3<Float>]? {
        filter { $0.semantic == .vertex }.first?.getFloat3Array()
    }
    
    var normals: [SIMD3<Float>]? {
        filter { $0.semantic == .normal }.first?.getFloat3Array()
    }
    
    var textureCoordinates: [SIMD2<Float>]? {
        filter { $0.semantic == .texcoord }.first?.getFloat2Array()
    }
}

extension SCNGeometryElement {
    var indices: [UInt32] {
        var result = [UInt32]()
        
        data.withUnsafeBytes { bufferPointer in
            guard let baseAddress = bufferPointer.baseAddress else { return }

            switch bytesPerIndex {
            case 2:
                // Data is 16-bit (UInt16), so we read and convert to UInt32
                let pointer = baseAddress.assumingMemoryBound(to: UInt16.self)
                for i in 0..<indexCount {
                    // Read the 16-bit index and cast it up to 32-bit
                    result.append(UInt32(pointer[i]))
                }
            
            case 4:
                // Data is already 32-bit (UInt32)
                let pointer = baseAddress.assumingMemoryBound(to: UInt32.self)
                for i in 0..<indexCount {
                    result.append(pointer[i])
                }
            
            default:
                // Handle unsupported types (e.g., .invalid)
                print("SCNGeometryElement bytesPerIndex \(bytesPerIndex) not supported for unpacking indices.")
                return
            }
        }
        
        print("    > result.count:", result.count)
        return result
    }
    
    var indexCount: Int {
        switch primitiveType {
        case .triangles: primitiveCount * 3
        case .polygon: primitiveCount
        default: 0
        }
    }
    
    @MainActor var primitives: MeshDescriptor.Primitives? {
        var geometryString = ""
        switch primitiveType {
        case .triangles: return .triangles(indices)
        case .polygon: geometryString = "polygon"
        case .triangleStrip: geometryString = "triangleStrip"
        case .line: geometryString = "line"
        case .point: geometryString = "point"
        @unknown default:
            geometryString = "???"
        }
        print("SCNGeometryElement primitiveType: \(geometryString) is unknown or not handled, returning nil")
        return nil
    }
}
