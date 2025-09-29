//
//  txirimiriApp.swift
//  txirimiri
//
//  Created by Eliott Radcliffe on 9/28/25.
//

import SwiftUI

@main
struct txirimiriApp: App {
    let manager = ContentManager(for: "iCloud.com.dcengineer.txirimiri")
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .environment(manager)
    }
}
