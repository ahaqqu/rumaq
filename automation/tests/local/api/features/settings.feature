Feature: User Settings
  The settings API manages user preferences and the encrypted AI key.

  Scenario: Unauthenticated access returns 401
    Given the database has seed data
    When I send a GET request to /api/settings
    Then the response status should be 401

  Scenario: GET settings returns public fields without AI key
    Given the database has seed data
    And I am authenticated as a test user
    When I send a GET request to /api/settings
    Then the response status should be 200
    And the settings should include motion_preference and has_ai_key
    And has_ai_key should be false

  Scenario: PATCH settings encrypts the AI key
    Given the database has seed data
    And I am authenticated as a test user
    When I send a PATCH request to /api/settings with body
      """
      {"ai_key": "sk-test-key-12345", "ai_provider": "gemini"}
      """
    Then the response status should be 200
    And has_ai_key should be true
    And the response should not contain the plain AI key

  Scenario: PATCH settings updates persona
    Given the database has seed data
    And I am authenticated as a test user
    When I send a PATCH request to /api/settings with body
      """
      {"persona_user_role": "chef", "persona_ai_role": "assistant", "persona_enabled": true}
      """
    Then the response status should be 200
    And setting "persona_user_role" should be "chef"
    And setting "persona_enabled" should be true

  Scenario: GET settings returns has_ai_key true after key is saved
    Given the database has seed data
    And I am authenticated as a test user
    And I send a PATCH request to /api/settings with body
      """
      {"ai_key": "my-secret-key"}
      """
    When I send a GET request to /api/settings
    Then the response status should be 200
    And has_ai_key should be true
