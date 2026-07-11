Feature: AI Usage
  The AI usage API tracks daily usage limits for AI queries.

  Scenario: Unauthenticated access returns 401
    Given the database has seed data
    When I send a GET request to /api/ai/usage
    Then the response status should be 401

  Scenario: GET usage returns defaults for a new user
    Given the database has seed data
    And I am authenticated as a test user
    When I send a GET request to /api/ai/usage
    Then the response status should be 200
    And usage should show 0 used out of 20 daily limit
