Feature: Purchase Creation
  The purchase API creates purchases with items, updating stock and history.

  Scenario: Unauthenticated access returns 401
    Given the database has seed data
    When I send a POST request to /api/purchases
    Then the response status should be 401

  Scenario: Create purchase updates stock
    Given the database has seed data
    And I am authenticated as a test user
    When I create a purchase with store "store-indo" and date "2026-07-01" and items
      | name        | qty | unit | price |
      | Milk        | 2   | L    | 25000 |
      | Cooking Oil | 1   | L    | 15000 |
    Then the response status should be 201
    And the response should have a purchase object
    And the response should have items array
    And the response should have stock array
    And the stock for "Milk" should have qty 2
    And the stock for "Cooking Oil" should have qty 1.5

  Scenario: Create purchase with new item creates item and stock
    Given the database has seed data
    And I am authenticated as a test user
    When I create a purchase with store "store-indo" and date "2026-07-01" and items
      | name      | qty | unit | price |
      | Tofu      | 3   | pcs  | 5000  |
      | Tempeh    | 2   | pcs  | 3000  |
    Then the response status should be 201
    And the response should have a purchase object
    And the stock for "Tofu" should have qty 3

  Scenario: Create purchase with existing item updates qty
    Given the database has seed data
    And I am authenticated as a test user
    When I create a purchase with store "store-super" and date "2026-07-01" and items
      | name   | qty | unit | price |
      | Rice   | 5   | kg   | 65000 |
    Then the response status should be 201
    And the stock for "Rice" should have qty 7

  Scenario: Invalid items schema returns 400
    Given the database has seed data
    And I am authenticated as a test user
    When I send a POST request to /api/purchases with body
      { "date": "2026-07-01", "items": [] }
    Then the response status should be 400

  Scenario: Another household cannot access purchase receipt
    Given the database has seed data
    And I am authenticated as a test user
    When I send a GET request to /api/purchases/nonexistent-id/receipt
    Then the response status should be 404
