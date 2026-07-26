Feature: Rate limiting
  AI and general API requests are throttled to prevent abuse.

  Scenario: AI scan returns 429 after daily limit is exceeded
    Given the database has seed data
    And I am authenticated as a test user
    And the user has exceeded the AI usage limit
    When I send a POST request to /api/purchases/scan with a test image
    Then the response status should be 429
    And the response should contain a Retry-After header

  Scenario: AI plan generation returns 429 after daily limit is exceeded
    Given the database has seed data
    And I am authenticated as a test user
    And the user has exceeded the AI usage limit
    When I send a POST request to /api/plans/generate
    Then the response status should be 429
    And the response should contain a Retry-After header

  Scenario: AI chat returns 429 after daily limit is exceeded
    Given the database has seed data
    And I am authenticated as a test user
    And the user has exceeded the AI usage limit
    When I send a POST request to /api/ai/chat with body
      """
      {"message": "hello", "history": []}
      """
    Then the response status should be 429
    And the response should contain a Retry-After header

  Scenario: General API returns 429 after too many requests from one IP
    Given the database has seed data
    When a single IP sends 101 GET requests to /api/health within one minute
    Then the last response status should be 429
    And the response should contain a Retry-After header
