//
//  ContentManager.swift
//  txirimiri
//
//  Created by Eliott Radcliffe on 9/29/25.
//

import Foundation
import CloudKit

@Observable
class ContentManager {
    let database: CKDatabase
    init(for identifier: String) {
        let container = CKContainer(identifier: identifier)
        database = container.publicCloudDatabase
    }
}
