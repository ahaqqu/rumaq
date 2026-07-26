Feature: Rate limiting
  AI and general API requests are throttled to prevent abuse.

  Scenario: AI scan returns 429 after daily limit is exceeded
    Given the database has seed data
    And I am authenticated as a test user
    And the user has an AI key configured
    And the user has exceeded the AI usage limit
    When I send a POST request to /api/purchases/scan with a test image
    Then the response status should be 429
    And the response should contain a Retry-After header

  Scenario: AI plan generation returns 429 after daily limit is exceeded
    Given the database has seed data
    And I am authenticated as a test user
    And the user has an AI key configured
    And the user has exceeded the AI usage limit
    When I send a POST request to /api/plans/generate
    Then the response status should be 429
    And the response should contain a Retry-After header

  Scenario: AI chat returns 429 after daily limit is exceeded
    Given the database has seed data
    And I am authenticated as a test user
    And the user has an AI key configured
    And the user has exceeded the AI usage limit
    When I send a POST request to /api/ai/chat with body
      """
      {"message": "hello", "history": []}
      """
    Then the response status should be 429
    And the response should contain a Retry-After header
