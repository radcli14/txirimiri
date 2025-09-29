//
//  ContentView.swift
//  txirimiri
//
//  Created by Eliott Radcliffe on 9/28/25.
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        NavigationSplitView {
            ModelSelectionView()
        } detail: {
            Text("Select an item")
        }
    }
}

#Preview {
    @Previewable @State var manager = ContentManager(for: "iCloud.com.dcengineer.txirimiri")
    ContentView()
        .environment(manager)
}
