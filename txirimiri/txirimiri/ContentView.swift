//
//  ContentView.swift
//  txirimiri
//
//  Created by Eliott Radcliffe on 9/28/25.
//

import SwiftUI
import SwiftData

struct ContentView: View {
    @Environment(ContentManager.self) var manager
    
    var body: some View {
        NavigationSplitView {
            List(manager.models) { model in
                VStack {
                    Text(model.name).font(.headline)
                    Text(model.description).font(.caption)
                }
            }
        } detail: {
            Text("Select an item")
        }
        .task {
            print("task")
            await manager.fetchLightweightRecords()
        }
    }
}

#Preview {
    @Previewable @State var manager = ContentManager(for: "iCloud.com.dcengineer.txirimiri")
    ContentView()
}
