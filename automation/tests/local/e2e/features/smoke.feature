Feature: App Shell Smoke
  The frontend application loads and renders the dashboard.

  Scenario: Main page loads and renders shell
    Given I visit the app
    Then the page should have a title
    And the root element should be mounted
    And the topbar should be visible
    And a heading should be visible
