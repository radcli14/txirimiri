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
        List(manager.models) { model in
            ModelMenuContent(model: model)
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
