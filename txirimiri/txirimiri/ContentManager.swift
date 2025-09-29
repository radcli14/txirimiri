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
    
    // MARK: - Query
    
    /// Store models that have been fetched
    var models = [Model3D]()
    
    /// Perform a query for only the `name`, `description`, and `extension` fields for all models available in the database
    func fetchLightweightRecords() async {
        
    }
    
    /// Perform a query for `thumbnail` data of a specific record
    func fetchThumbnail(for name: String) async -> Model3D? {
        return nil
    }
    
    /// Perform a query for `model` data of a specific record
    func fetchModel(for name: String) async -> Model3D? {
        return nil
    }
}
