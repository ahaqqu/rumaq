Feature: Health Check
  The API exposes a health endpoint for monitoring.

  Scenario: Health check returns ok
    Given the API is running
    When I send a GET request to /api/health
    Then the response status should be 200
    And the response body should contain { ok: true }

  Scenario: Health check returns public cache headers
    Given the API is running
    When I send a GET request to /api/health
    Then the response status should be 200
    And the response should have public cache headers with max-age=60
