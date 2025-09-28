//
//  Item.swift
//  txirimiri
//
//  Created by Eliott Radcliffe on 9/28/25.
//

import Foundation
import SwiftData

@Model
final class Item {
    var timestamp: Date
    
    init(timestamp: Date) {
        self.timestamp = timestamp
    }
}
