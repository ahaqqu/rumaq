// Generated from: tests/local/e2e/features/smoke.feature
import { test } from "playwright-bdd";

test.describe('App Shell Smoke', () => {

  test('Main page loads and renders shell', async ({ Given, Then, And, page }) => { 
    await Given('I visit the app', null, { page }); 
    await Then('the page should have a title', null, { page }); 
    await And('the root element should be mounted', null, { page }); 
    await And('the topbar should be visible', null, { page }); 
    await And('a heading should be visible', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests/local/e2e/features/smoke.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":4,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given I visit the app","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":6,"keywordType":"Outcome","textWithKeyword":"Then the page should have a title","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":7,"keywordType":"Outcome","textWithKeyword":"And the root element should be mounted","stepMatchArguments":[]},{"pwStepLine":10,"gherkinStepLine":8,"keywordType":"Outcome","textWithKeyword":"And the topbar should be visible","stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":9,"keywordType":"Outcome","textWithKeyword":"And a heading should be visible","stepMatchArguments":[]}]},
]; // bdd-data-end