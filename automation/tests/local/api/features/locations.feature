Feature: Locations
  The locations API manages household storage locations.

  Scenario: Unauthenticated access returns 401
    Given the database has seed data
    When I send a GET request to /api/locations
    Then the response status should be 401

  Scenario: Authenticated access returns locations
    Given the database has seed data
    And I am authenticated as a test user
    When I send a GET request to /api/locations
    Then the response status should be 200
    And the locations array should have 3 items

  Scenario: Create a new location
    Given the database has seed data
    And I am authenticated as a test user
    When I send a POST request to /api/locations with body
      """
      {"label": "Garage"}
      """
    Then the response status should be 201
    And the created location should have label "Garage"

  Scenario: Delete a location not referenced by stock
    Given the database has seed data
    And I am authenticated as a test user
    When I create a new location "Test Delete"
    And I delete the created location
    Then the response status should be 204

  Scenario: Delete a location referenced by stock returns 409
    Given the database has seed data
    And I am authenticated as a test user
    When I send a DELETE request to /api/locations/loc-kitchen
    Then the response status should be 409

  Scenario: Delete nonexistent location returns 404
    Given the database has seed data
    And I am authenticated as a test user
    When I send a DELETE request to /api/locations/nonexistent
    Then the response status should be 404
