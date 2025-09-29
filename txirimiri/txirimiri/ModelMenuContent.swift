//
//  ModelMenuContent.swift
//  txirimiri
//
//  Created by Eliott Radcliffe on 9/29/25.
//

import SwiftUI

/// Displays the thumbnail, name, and description for a single model
struct ModelMenuContent: View {
    @Environment(ContentManager.self) var manager
    
    let model: Model3D
    
    var body: some View {
        HStack {
            thumbnailOrPlaceholderImage()
            
            VStack(alignment: .leading) {
                Text(model.name).font(.headline)
                Text(model.description).font(.caption)
            }
        }
    }
    
    private func thumbnailOrPlaceholderImage() -> some View {
        Group {
            if let thumbnail = model.thumbnail,
                let uiImage = UIImage(data: thumbnail) {
                Image(uiImage: uiImage)
                    .resizable()
            } else {
                Image(systemName: "cube")
                    .resizable()
                    .padding(8)
                    .task {
                        let _ = await manager.fetchThumbnail(for: model.id)
                    }
            }
        }
        .scaledToFill()
        .frame(width: 64, height: 64)
        .clipped()
    }
}

#Preview {
    @Previewable @State var manager = ContentManager(for: "iCloud.com.dcengineer.txirimiri")
    let model = Model3D(name: "Basque Pelota", description: "A souvenir from Hendaia", id: "pelota")
    ModelMenuContent(model: model)
        .environment(manager)
}
