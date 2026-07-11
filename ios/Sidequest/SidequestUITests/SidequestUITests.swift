import XCTest

final class SidequestUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    private func launchApp() -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments += ["-uiTesting"]
        app.launch()
        return app
    }

    func testLaunch() {
        let app = launchApp()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 10))
    }

    func testSignInScreenIsShownFirst() {
        let app = launchApp()
        let signIn = app.otherElements["signInView"]
        XCTAssertTrue(signIn.waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["signInButton"].waitForExistence(timeout: 5))
    }

    func testExplorerNotVisibleBeforeSignIn() {
        let app = launchApp()
        _ = app.otherElements["signInView"].waitForExistence(timeout: 10)
        XCTAssertFalse(app.otherElements["explorerView"].exists)
    }

    func testDemoSignInReachesExplorer() {
        let app = launchApp()
        let button = app.buttons["signInButton"]
        XCTAssertTrue(button.waitForExistence(timeout: 10))
        button.tap()
        // In demo mode, tapping sign in should reach the explorer (onboarding sheet appears over it).
        XCTAssertTrue(app.otherElements["explorerView"].waitForExistence(timeout: 10))
    }
}
