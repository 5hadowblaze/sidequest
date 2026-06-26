import XCTest

final class WeekendExplorerUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testLaunch() throws {
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 5))
    }

    func testSignInFlowAccessibilityIdentifiers() throws {
        let app = XCUIApplication()
        app.launch()

        let signInView = app.otherElements["signInView"]
        XCTAssertTrue(signInView.waitForExistence(timeout: 5))

        let signInButton = app.buttons["signInButton"]
        XCTAssertTrue(signInButton.waitForExistence(timeout: 5))
        XCTAssertTrue(signInButton.isHittable)
    }

    func testExplorerViewNotVisibleBeforeSignIn() throws {
        let app = XCUIApplication()
        app.launch()

        let explorerView = app.otherElements["explorerView"]
        XCTAssertFalse(explorerView.waitForExistence(timeout: 2))
    }
}
