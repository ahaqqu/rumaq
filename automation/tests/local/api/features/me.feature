Feature: User Profile
  The me API returns the authenticated user's profile.

  Scenario: Unauthenticated access returns 401
    Given the database has seed data
    When I send a GET request to /api/me
    Then the response status should be 401

  Scenario: Authenticated access returns user profile
    Given the database has seed data
    And I am authenticated as a test user
    When I send a GET request to /api/me
    Then the response status should be 200
    And the response should contain a user object
    And the user should have id, email, and name matching the test user

  Scenario: Authenticated response has per-user cache headers
    Given the database has seed data
    And I am authenticated as a test user
    When I send a GET request to /api/me
    Then the response status should be 200
    And the response should have authenticated cache headers
