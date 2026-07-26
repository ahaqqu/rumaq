Feature: Stores
  The stores API manages household stores.

  Scenario: Unauthenticated access returns 401
    Given the database has seed data
    When I send a GET request to /api/stores
    Then the response status should be 401

  Scenario: Authenticated access returns stores
    Given the database has seed data
    And I am authenticated as a test user
    When I send a GET request to /api/stores
    Then the response status should be 200
    And the stores array should have 2 items

  Scenario: Create a new store
    Given the database has seed data
    And I am authenticated as a test user
    When I send a POST request to /api/stores with body
      """
      {"label": "New Store"}
      """
    Then the response status should be 201
    And the created store should have label "New Store"

  Scenario: Delete a store
    Given the database has seed data
    And I am authenticated as a test user
    When I create a new store "Test Delete Store"
    And I delete the created store
    Then the response status should be 204

  Scenario: Delete nonexistent store returns 404
    Given the database has seed data
    And I am authenticated as a test user
    When I send a DELETE request to /api/stores/nonexistent
    Then the response status should be 404
