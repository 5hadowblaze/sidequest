import XCTest
import SwiftUI
#if canImport(UIKit)
import UIKit
#endif
@testable import Sidequest

final class ThemeTests: XCTestCase {
    private func rgb(_ color: Color) -> (r: CGFloat, g: CGFloat, b: CGFloat, a: CGFloat) {
        #if canImport(UIKit)
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        UIColor(color).getRed(&r, green: &g, blue: &b, alpha: &a)
        return (r, g, b, a)
        #else
        return (0, 0, 0, 0)
        #endif
    }

    func testHexInitializer() {
        let c = rgb(Color(hex: 0x818CF8))
        XCTAssertEqual(c.r, 0x81 / 255.0, accuracy: 0.01)
        XCTAssertEqual(c.g, 0x8C / 255.0, accuracy: 0.01)
        XCTAssertEqual(c.b, 0xF8 / 255.0, accuracy: 0.01)
        XCTAssertEqual(c.a, 1.0, accuracy: 0.01)
    }

    func testHexAlpha() {
        let c = rgb(Color(hex: 0x2DD4BF, alpha: 0.15))
        XCTAssertEqual(c.a, 0.15, accuracy: 0.02)
    }

    func testBrandTokens() {
        // Purple primary.
        let purple = rgb(Theme.purple)
        XCTAssertEqual(purple.r, 0x81 / 255.0, accuracy: 0.01)
        // Teal secondary.
        let teal = rgb(Theme.teal)
        XCTAssertEqual(teal.g, 0xD4 / 255.0, accuracy: 0.01)
        // Dark background.
        let bg = rgb(Theme.background)
        XCTAssertLessThan(bg.r, 0.1)
    }
}
