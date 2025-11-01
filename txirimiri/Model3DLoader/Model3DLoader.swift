//
//  Model3DLoader.swift
//  Model3DLoader
//
//  Created by Eliott Radcliffe on 11/1/25.
//

import Foundation
import ModelIO
import RealityKit

class Model3DLoader {
    let url: URL
    
    init(filename: String, fileExtension: String) {
        url = Bundle.main.url(forResource: filename, withExtension: fileExtension)! // TODO: error handling
    }
    
    func loadEntity() async -> Entity? {
        // Load the asset using Model I/O.
        let asset = MDLAsset(url: url)
        
        return nil
    }
}
