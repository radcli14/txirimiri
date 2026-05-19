//
//  ContentView.swift
//  Model3DLoader
//
//  Created by Eliott Radcliffe on 11/1/25.
//

import SwiftUI
import RealityKit
import SceneKit
import ModelIO
import UniformTypeIdentifiers

import DAE_to_RealityKit
import ModelIO_to_RealityKit


struct ContentView: View {
    @State private var modelURL: URL? = Bundle.main.url(forResource: "link_1", withExtension: "dae")
    @State private var realityEntity: ModelEntity?
    @State private var isImporterPresented = false

    var body: some View {
        NavigationStack {
            VStack {
                Text("RealityKit").font(.title)
                RealityView { content in
                    if let entity = realityEntity {
                        frameEntity(entity)
                        content.add(entity)
                        content.cameraTarget = entity
                    }
                } update: { content in
                    content.entities.removeAll()
                    if let entity = realityEntity {
                        frameEntity(entity)
                        content.add(entity)
                        content.cameraTarget = entity
                    }
                }
                .realityViewCameraControls(.orbit)
                
                Divider()
                
                Text("SceneKit").font(.title)
                SceneView(
                    scene: getScene(),
                    options: [.allowsCameraControl, .autoenablesDefaultLighting]
                )
            }
            .navigationTitle("Model3DLoader")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        isImporterPresented = true
                    } label: {
                        Label("Import Model", systemImage: "folder")
                    }
                }
            }
            .fileImporter(
                isPresented: $isImporterPresented,
                allowedContentTypes: [
                    UTType(filenameExtension: "dae")!,
                    UTType(filenameExtension: "obj")!,
                    UTType(filenameExtension: "stl")!,
                    UTType(filenameExtension: "fbx")!,
                    UTType(filenameExtension: "glb")!,
                    .usdz
                ]
            ) { result in
                switch result {
                case .success(let url):
                    let accessed = url.startAccessingSecurityScopedResource()
                    defer { if accessed { url.stopAccessingSecurityScopedResource() } }

                    if let localURL = copyToDocuments(url: url) {
                        modelURL = localURL
                        Task {
                            realityEntity = await ModelEntity.fromDAEAsset(url: localURL)
                            print("realityEntity", realityEntity)
                        }
                    }
                case .failure(let error):
                    print("File import failed: \(error.localizedDescription)")
                }
            }
            .task {
                if let url = modelURL {
                    realityEntity = await ModelEntity.fromDAEAsset(url: url)
                }
            }
        }
    }

    /// Copies the imported file to the app's Documents directory so it remains accessible.
    func copyToDocuments(url: URL) -> URL? {
        let fileManager = FileManager.default
        let documentsDir = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
        let destination = documentsDir.appendingPathComponent(url.lastPathComponent)
        do {
            if fileManager.fileExists(atPath: destination.path) {
                try fileManager.removeItem(at: destination)
            }
            try fileManager.copyItem(at: url, to: destination)
            return destination
        } catch {
            print("Failed to copy file: \(error.localizedDescription)")
            return nil
        }
    }

    /// Normalizes the entity's scale and position so it fits within a unit-sized volume centered at the origin.
    func frameEntity(_ entity: Entity) {
        let bounds = entity.visualBounds(relativeTo: nil)
        let extents = bounds.extents
        let maxExtent = max(extents.x, max(extents.y, extents.z))
        guard maxExtent > 0 else { return }

        let desiredSize: Float = 0.15
        let scaleFactor = desiredSize / maxExtent
        entity.scale = SIMD3<Float>(repeating: scaleFactor)

        let center = bounds.center * scaleFactor
        entity.position = -center
    }

    func getScene() -> SCNScene? {
        guard let url = modelURL else { return nil }
        do {
            let scene = try SCNScene(url: url)
            scene.background.contents = UIColor.systemBackground
            return scene
        } catch {
            print("Failed to load SceneKit scene at \(url): \(error)")
            return nil
        }
    }
}

#Preview {
    ContentView()
}
