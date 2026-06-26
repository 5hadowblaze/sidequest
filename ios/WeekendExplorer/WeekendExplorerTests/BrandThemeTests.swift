import XCTest
import SwiftUI
@testable import WeekendExplorer

final class BrandThemeTests: XCTestCase {
    func testAccentHexMatchesWebBrand() {
        XCTAssertEqual(BrandTheme.accentHex, "#1a73e8")
        XCTAssertEqual(BrandTheme.accent.hexString, "#1a73e8")
    }

    func testPrimaryPaletteHexValues() {
        XCTAssertEqual(BrandTheme.accentDarkHex, "#1765cc")
        XCTAssertEqual(BrandTheme.errorHex, "#c5221f")
        XCTAssertEqual(BrandTheme.textPrimaryHex, "#202124")
        XCTAssertEqual(BrandTheme.textSecondaryHex, "#3c4043")
        XCTAssertEqual(BrandTheme.mutedHex, "#80868b")
    }

    func testSurfaceAndBorderHexValues() {
        XCTAssertEqual(BrandTheme.borderHex, "#dadce0")
        XCTAssertEqual(BrandTheme.borderLightHex, "#e8eaed")
        XCTAssertEqual(BrandTheme.surfaceHex, "#f1f3f4")
        XCTAssertEqual(BrandTheme.surfaceLightHex, "#f8f9fa")
        XCTAssertEqual(BrandTheme.badgeBackgroundHex, "#e8f0fe")
    }

    func testMapAndWarningHexValues() {
        XCTAssertEqual(BrandTheme.warningHex, "#f9ab00")
        XCTAssertEqual(BrandTheme.mapPinHex, "#ea4335")
        XCTAssertEqual(BrandTheme.mapPin.hexString, "#ea4335")
    }

    func testColorHexInitializerRoundTrip() {
        let color = Color(hex: "#1a73e8")
        XCTAssertEqual(color.hexString, "#1a73e8")
    }
}
