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
        // Build a query for records of type Model3D
        let predicate = NSPredicate(value: true)
        let query = CKQuery(
            recordType: "Model3D",
            predicate: predicate
        )

        // Gather all of the CKRecord objects for the Model3D schema, in lightweight form
        let records: [CKRecord]
        do {
            records = try await database.records(
                matching: query,
                desiredKeys: ["name", "description", "extension"]
            )
            .matchResults
            .compactMap { (id, result) in
                switch result {
                case .success(let record): return record
                default: return nil
                }
            }
        } catch {
            print("Could not fetch lightweight records: \(error.localizedDescription)")
            return
        }
        
        // Update the stored models given the array of CKRecord
        records.forEach { record in
            let id = record.recordID.recordName
            let name = record.value(forKey: "name") as? String
            let description = record.value(forKey: "description") as? String
            if let index = models.firstIndex(where: { $0.id == id }) {
                models[index].name = name ?? models[index].name
                models[index].description = description ?? models[index].description
            } else if let name, let description {
                models.append(Model3D(
                    name: name,
                    description: description,
                    id: id
                ))
            }
        }
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
