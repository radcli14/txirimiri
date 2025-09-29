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
            Text("Txirimiri")
        } detail: {
            Text("Select an item")
        }
    }
}

#Preview {
    @Previewable @State var manager = ContentManager(for: "icloud.com.dcengineer.txirimiri")
    ContentView()
}
