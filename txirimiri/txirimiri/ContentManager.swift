//
//  ContentManager.swift
//  txirimiri
//
//  Created by Eliott Radcliffe on 9/29/25.
//

import Foundation
import CloudKit

/// The class responsible for querying for content in the form of `Model3D` from a CloudKit database, and providing to the UI.
/// Should be initialized using a string identifier for the CloudKit container, for example `"iCloud.com.dcengineer.txirimiri"`.
/// Stored variables are an array `models` of `Model3D`.
/// Fetch methods include a lightweight query, which only obtains simple text for low bandwidth usage, and separate queries for thumbnail images and 3D model data, which are expected to be larger files.
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
        let query = buildQuery()
        let records = await fetchRecords(for: query, desiredKeys: ["name", "description", "extension"])
        updateModels(with: records)
    }
    
    /// Perform a query for `thumbnail` data of a specific record
    func fetchThumbnail(for name: String) async -> Model3D? {
        let query = buildQuery(for: name)
        let records = await fetchRecords(for: query, desiredKeys: ["thumbnail"])
        updateModels(with: records)
        return models.first(where: { $0.id == name })
    }
    
    /// Perform a query for `model` data of a specific record
    func fetchModel(for name: String) async -> Model3D? {
        let query = buildQuery(for: name)
        let records = await fetchRecords(for: query, desiredKeys: ["model"])
        updateModels(with: records)
        return models.first(where: { $0.id == name })
    }
    
    /// Build a query for records of type `Model3D`.
    /// An optional `name` argument can be provided, if this is not-nil, then
    /// a predicate will be constructed to only search for records with that name.
    private func buildQuery(for name: String? = nil) -> CKQuery {
        let predicate: NSPredicate
        if let name {
            let recordID: CKRecord.ID = CKRecord.ID(recordName: name)
            predicate = NSPredicate(format: "recordID=%@", recordID)
        } else {
            predicate = NSPredicate(value: true)
        }
        
        return CKQuery(
            recordType: "Model3D",
            predicate: predicate
        )
    }
    
    /// Asynchronously fetch records from the CloudKit database for a given `CKQuery` and string array of keys
    private func fetchRecords(for query: CKQuery, desiredKeys: [String]) async -> [CKRecord] {
        do {
            return try await database.records(
                matching: query,
                desiredKeys: desiredKeys
            )
            .matchResults
            .compactMap { (id, result) in
                switch result {
                case .success(let record): return record
                default: return nil
                }
            }
        } catch {
            print("Could not fetch records for \n - query: \(query.recordType)\n - predicate \(query.predicate)\n - desiredKeys: \(desiredKeys)\n - error: \(error.localizedDescription)")
            return []
        }
    }
    
    /// Update the stored models given the array of `CKRecord`
    private func updateModels(with records: [CKRecord]) {
        records.forEach { record in
            let id = record.recordID.recordName
            let name = record.value(forKey: "name") as? String
            let description = record.value(forKey: "description") as? String
            let ext = record.value(forKey: "extension") as? String
            let model = record.data(forKey: "model")
            let thumbnail = record.data(forKey: "thumbnail")
            
            // Create a new model with all available data
            let existingModel = models.first(where: { $0.id == id })
            let newModel = Model3D(
                name: name ?? existingModel?.name ?? id,
                description: description ?? existingModel?.description ?? id,
                ext: ext ?? existingModel?.ext,
                model: model ?? existingModel?.model,
                thumbnail: thumbnail ?? existingModel?.thumbnail,
                id: id
            )
            
            // If it exists, update the existing model with any new data, otherwise add it
            if let index = models.firstIndex(where: { $0.id == id }) {
                models[index] = newModel
            } else if let name, let description {
                models.append(newModel)
            }
        }
    }
}

extension CKRecord {
    func data(forKey key: String) -> Data? {
        guard let asset = value(forKey: key) as? CKAsset else { return nil }
        guard let fileURL = asset.fileURL else { return nil }
        return try? Data(contentsOf: fileURL)
    }
}
