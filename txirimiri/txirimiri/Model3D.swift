//
//  Model3D.swift
//  txirimiri
//
//  Created by Eliott Radcliffe on 9/29/25.
//

import Foundation

struct Model3D: Identifiable {
    var name: String
    var description: String
    var ext: String?
    var model: Data?
    var thumbnail: Data?
    
    var id: String
}
