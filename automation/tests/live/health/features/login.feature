Feature: Login & Logout
  Email login and logout work against the live API.

  Scenario: Login via email and verify session
    Given the production site is at https://rumaq.pages.dev
    And the API is at https://api.rumaq.workers.dev
    When I login via email as "alice@rumaq.dev" with password "password123"
    Then the response status should be 200
    And the body should contain ok
    And my session cookie should be stored

    When I GET /api/me
    Then the response status should be 200
    And the body should contain a user object
    And the user email should be "alice@rumaq.dev"

    When I logout
    Then the response status should be 200

    When I GET /api/me
    Then the response status should be 401
