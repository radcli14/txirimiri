//
//  ModelSelectionView.swift
//  txirimiri
//
//  Created by Eliott Radcliffe on 9/29/25.
//

import SwiftUI

struct ModelSelectionView: View {
    @Environment(ContentManager.self) var manager
    
    var body: some View {
        VStack {
            Image(.header)
                .foregroundColor(.green)
            List {
                Section("Select a model from the list") {
                    ForEach(manager.models) { model in
                        NavigationLink(value: model) {
                            ModelMenuContent(model: model)
                        }
                    }
                }
            }
            .refreshable {
                await manager.fetchLightweightRecords()
            }
        }
        .task {
            await manager.fetchLightweightRecords()
        }
    }
}

#Preview {
    @Previewable @State var manager = ContentManager(for: "iCloud.com.dcengineer.txirimiri")
    ModelSelectionView()
        .environment(manager)
}
