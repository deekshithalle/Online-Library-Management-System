
// Online Library Management System
// Selenium Web UI Test Suite - 8 Test Cases
// Start application using: npm.cmd start
// Run tests using: npm.cmd run test:selenium

const { Builder, By, until } = require("selenium-webdriver");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const BASE_URL = "http://localhost:3001";
const EVIDENCE_DIR = path.join(__dirname, "..", "test-evidence");

const stamp = Date.now();
const BOOK_TITLE = `Selenium Test Book ${stamp}`;
const UPDATED_TITLE = `Selenium Updated Book ${stamp}`;
const BOOK_ISBN = `SEL-${stamp}`;
const STUDENT_NAME = `Selenium Student ${stamp}`;
const STUDENT_EMAIL = `selenium.${stamp}@example.com`;

let driver;
let passed = 0;
let failed = 0;

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

async function screenshot(name) {
  const image = await driver.takeScreenshot();
  fs.writeFileSync(
    path.join(EVIDENCE_DIR, `${name}.png`),
    image,
    "base64"
  );
}

async function testCase(name, callback) {
  try {
    await callback();
    await screenshot(name);
    passed++;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed++;
    console.error(`FAIL ${name}: ${error.message}`);

    try {
      await screenshot(`${name}-FAIL`);
    } catch (_) {
      // Preserve the original test failure.
    }
  }
}

function dateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function setDate(id, value) {
  await driver.executeScript((elementId, dateValue) => {
    const element = document.getElementById(elementId);
    element.value = dateValue;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, id, value);
}

async function selectOption(id, text) {
  await driver.executeScript((elementId, searchText) => {
    const select = document.getElementById(elementId);
    const option = Array.from(select.options).find(
      item => item.text.includes(searchText)
    );

    if (!option) {
      throw new Error(`Option not found: ${searchText}`);
    }

    select.value = option.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }, id, text);
}

async function openTab(section) {
  await driver.findElement(
    By.css(`[data-tab="${section}"]`)
  ).click();
}

async function findActiveLoanRow() {
  const rows = await driver.findElements(
    By.css("#loansBody tr")
  );

  for (const row of rows) {
    const text = await row.getText();

    if (
      text.includes(UPDATED_TITLE) &&
      text.includes(STUDENT_NAME) &&
      text.includes("ISSUED")
    ) {
      return row;
    }
  }

  throw new Error("Active loan record was not found");
}
async function returnActiveLoan() {
  const button = await driver.findElement(
    By.xpath(
      `//tr[contains(.,'${UPDATED_TITLE}') and contains(.,'${STUDENT_NAME}') and contains(.,'ISSUED')]//button[@data-return]`
    )
  );

  await button.click();
}
async function waitForLoanStatus(status) {
  await driver.wait(async () => {
    try {
      const rows = await driver.findElements(
        By.css("#loansBody tr")
      );

      for (const row of rows) {
        const text = await row.getText();

        if (
          text.includes(UPDATED_TITLE) &&
          text.includes(STUDENT_NAME) &&
          text.includes(status)
        ) {
          return true;
        }
      }

      return false;
    } catch (error) {
      if (error.name === "StaleElementReferenceError") {
        return false;
      }
      throw error;
    }
  }, 15000);
}

(async function runLibraryTests() {
  try {
    driver = await new Builder().forBrowser("chrome").build();

    await driver.manage().window().maximize();
    await driver.get(BASE_URL);

    await driver.wait(
      until.elementLocated(By.id("loginForm")),
      10000
    );

    // TC-01: Admin login
    await testCase("TC-01-Admin-Login", async () => {
      await driver.findElement(By.id("username")).clear();
      await driver.findElement(By.id("username")).sendKeys("admin");

      await driver.findElement(By.id("password")).clear();
      await driver.findElement(By.id("password")).sendKeys("admin123");

      await driver.findElement(
        By.css("#loginForm button")
      ).click();

      await driver.wait(async () => {
        return driver.executeScript(
          "return !document.getElementById('appPanel').hidden;"
        );
      }, 10000);

      assert.equal(
        await driver.findElement(By.id("adminBadge")).getText(),
        "Administrator"
      );
    });

    // TC-02: Add a new book
    await testCase("TC-02-Add-Book", async () => {
      await openTab("booksSection");

      await driver.findElement(By.id("bookTitle")).sendKeys(BOOK_TITLE);
      await driver.findElement(By.id("bookAuthor")).sendKeys("Test Author");
      await driver.findElement(By.id("bookIsbn")).sendKeys(BOOK_ISBN);
      await driver.findElement(By.id("bookCategory")).sendKeys("Testing");

      const copies = driver.findElement(By.id("bookCopiesInput"));
      await copies.clear();
      await copies.sendKeys("2");

      await driver.findElement(By.id("bookSubmit")).click();

      await driver.wait(
        until.elementLocated(
          By.xpath(`//td[contains(.,'${BOOK_TITLE}')]`)
        ),
        10000
      );
    });

    // TC-03: Search for a book
    await testCase("TC-03-Search-Book", async () => {
      const search = driver.findElement(By.id("bookSearch"));

      await search.clear();
      await search.sendKeys(BOOK_TITLE);

      await driver.findElement(By.id("searchBtn")).click();

      await driver.wait(
        until.elementLocated(
          By.xpath(`//td[contains(.,'${BOOK_TITLE}')]`)
        ),
        10000
      );

      await driver.findElement(By.id("clearSearch")).click();
    });

    // TC-04: Update book details
    await testCase("TC-04-Update-Book", async () => {
      const row = await driver.findElement(
        By.xpath(`//tr[td[contains(.,'${BOOK_TITLE}')]]`)
      );

      await row.findElement(By.css("[data-edit]")).click();

      const title = driver.findElement(By.id("bookTitle"));
      await title.clear();
      await title.sendKeys(UPDATED_TITLE);

      await driver.findElement(By.id("bookSubmit")).click();

      await driver.wait(
        until.elementLocated(
          By.xpath(`//td[contains(.,'${UPDATED_TITLE}')]`)
        ),
        10000
      );
    });

    // TC-05: Register student and issue book
    await testCase("TC-05-Issue-Book", async () => {
      await openTab("studentsSection");

      await driver.findElement(By.id("studentName"))
        .sendKeys(STUDENT_NAME);

      await driver.findElement(By.id("studentEmail"))
        .sendKeys(STUDENT_EMAIL);

      await driver.findElement(
        By.css("#studentForm button")
      ).click();

      await driver.wait(
        until.elementLocated(
          By.xpath(`//td[contains(.,'${STUDENT_EMAIL}')]`)
        ),
        10000
      );

      await openTab("loansSection");

      await selectOption("issueBook", UPDATED_TITLE);
      await selectOption("issueStudent", STUDENT_EMAIL);

      await setDate("issueDate", dateOffset(0));
      await setDate("dueDate", dateOffset(7));

      await driver.findElement(
        By.css("#issueForm button")
      ).click();

      await driver.wait(
        () => findActiveLoanRow().then(() => true).catch(() => false),
        10000
      );
    });

    // TC-06: Return book before due date
    await testCase("TC-06-Normal-Book-Return", async () => {
      await openTab("loansSection");

      await returnActiveLoan();
      await waitForLoanStatus("RETURNED");

      const rows = await driver.findElements(
        By.css("#loansBody tr")
      );

      const returned = [];

      for (const row of rows) {
        const text = await row.getText();

        if (
          text.includes(UPDATED_TITLE) &&
          text.includes(STUDENT_NAME) &&
          text.includes("RETURNED")
        ) {
          returned.push(text);
        }
      }

      assert.ok(
        returned.some(text => text.includes("₹0.00")),
        "Normal return should have zero fine"
      );
    });

    // TC-07: Overdue fine calculation
    await testCase("TC-07-Overdue-Fine", async () => {
      await openTab("loansSection");

      // Issue the same book again, with a due date three days ago.
      await selectOption("issueBook", UPDATED_TITLE);
      await selectOption("issueStudent", STUDENT_EMAIL);

      await setDate("issueDate", dateOffset(-5));
      await setDate("dueDate", dateOffset(-3));

      await driver.findElement(
        By.css("#issueForm button")
      ).click();

      await driver.wait(
        () => findActiveLoanRow().then(() => true).catch(() => false),
        10000
      );

      await returnActiveLoan();
      await waitForLoanStatus("RETURNED");

      const rows = await driver.findElements(
        By.css("#loansBody tr")
      );

      let fineVerified = false;

      for (const row of rows) {
        const text = await row.getText();

        if (
          text.includes(UPDATED_TITLE) &&
          text.includes(STUDENT_NAME) &&
          text.includes("RETURNED") &&
          text.includes("₹15.00")
        ) {
          fineVerified = true;
          break;
        }
      }

      assert.equal(
        fineVerified,
        true,
        "Expected overdue fine of ₹15 for three late days"
      );

      const status = await driver.findElement(By.id("status")).getText();

      assert.ok(
        status.includes("fine ₹15"),
        "Fine success message should be displayed"
      );
    });

    // TC-08: Search for unavailable book
    await testCase("TC-08-Unavailable-Book", async () => {
      await openTab("booksSection");

      const search = driver.findElement(By.id("bookSearch"));

      await search.clear();
      await search.sendKeys(`Missing Book ${stamp}`);

      await driver.findElement(By.id("searchBtn")).click();

      await driver.wait(
        until.elementLocated(
          By.xpath("//td[contains(.,'No books found')]")
        ),
        10000
      );

      const result = await driver.findElement(
        By.id("booksBody")
      ).getText();

      assert.ok(result.includes("No books found"));
    });

  } catch (error) {
    console.error("SUITE ERROR:", error.message);
    failed++;
  } finally {
    if (driver) {
      await driver.quit();
    }

    console.log("\n========== SELENIUM TEST SUMMARY ==========");
    console.log(`Total test cases: ${passed + failed}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Screenshots: ${EVIDENCE_DIR}`);

    if (failed === 0 && passed === 8) {
      console.log("ALL 8 SELENIUM UI TEST CASES PASSED.");
    } else {
      console.log("SOME TEST CASES FAILED. Check the output and screenshots.");
      process.exitCode = 1;
    }
  }
})();
