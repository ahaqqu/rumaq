Feature: Stock Management
  The stock API manages inventory items for the kitchen.

  Scenario: Unauthenticated access returns 401
    Given the database has seed data
    When I send a GET request to /api/stock
    Then the response status should be 401

  Scenario: Authenticated access returns stock
    Given the database has seed data
    And I am authenticated as a test user
    When I send a GET request to /api/stock
    Then the response status should be 200
    And the response should contain a stock array
    And the stock array should have 3 items

  Scenario: Each stock item has required fields
    Given the database has seed data
    And I am authenticated as a test user
    When I send a GET request to /api/stock
    Then each item should have id, name, qty, unit, and location

  Scenario: Filter stock by location
    Given the database has seed data
    And I am authenticated as a test user
    When I send a GET request to /api/stock with location "loc-kitchen"
    Then the response status should be 200
    And the stock array should have 1 item
    And the first item should be named "Cooking Oil"

  Scenario: Search stock by name
    Given the database has seed data
    And I am authenticated as a test user
    When I send a GET request to /api/stock with q "egg"
    Then the response status should be 200
    And the stock array should have 1 item
    And the first item should be named "Eggs"

  Scenario: Stock is ordered by urgency
    Given the database has seed data
    And I am authenticated as a test user
    When I send a GET request to /api/stock
    Then the items should be ordered by run_out_days ascending

  Scenario: Authenticated stock response has per-user cache headers
    Given the database has seed data
    And I am authenticated as a test user
    When I send a GET request to /api/stock
    Then the response status should be 200
    And the response should have authenticated cache headers

  Scenario: PATCH stock updates quantity and recalculates run-out
    Given the database has seed data
    And I am authenticated as a test user
    When I send a PATCH request to /api/stock/stock-rice with body
      """
      {"qty": 1.0, "unit": "kg"}
      """
    Then the response status should be 200
    And the stock item should have qty 1
    And the stock item should have run_out_days computed

  Scenario: PATCH stock with another household stock returns 404
    Given the database has seed data
    And I am authenticated as a test user
    When I send a PATCH request to /api/stock/nonexistent-stock with body
      """
      {"qty": 1.0}
      """
    Then the response status should be 404

  Scenario: PATCH stock validates schema rejects negative qty
    Given the database has seed data
    And I am authenticated as a test user
    When I send a PATCH request to /api/stock/stock-rice with body
      """
      {"qty": -1}
      """
    Then the response status should be 400

  Scenario: PATCH stock with invalid location returns 400
    Given the database has seed data
    And I am authenticated as a test user
    When I send a PATCH request to /api/stock/stock-rice with body
      """
      {"location_id": "nonexistent-location"}
      """
    Then the response status should be 400
