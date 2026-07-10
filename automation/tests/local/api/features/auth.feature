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

  Scenario: Email login sets session cookie
    Given the database has seed data
    When I login via email as "test@rumaq.dev" with password "password123"
    Then the response status should be 200
    And the response body should contain { ok: true }
    And a session cookie should be set

  Scenario: Email logout clears session
    Given the database has seed data
    When I login via email as "test@rumaq.dev" with password "password123"
    Then the response status should be 200
    When I send a POST request to /api/auth/logout
    Then the response status should be 200
    And the response body should contain { ok: true }
