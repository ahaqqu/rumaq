Feature: Authentication
  The auth API provides login, logout, and session management.

  Scenario: Logout clears the session
    Given the database has seed data
    And I am authenticated as a test user
    When I send a POST request to /api/auth/logout
    Then the response status should be 200
    And the response body should contain { ok: true }

  Scenario: Login redirects to Google
    When I send a GET request to /api/auth/login
    Then the response status should be 302
    And the Location header should point to accounts.google.com
