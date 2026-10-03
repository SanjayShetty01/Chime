const path = require("path");
const { chromium } = require(path.resolve(__dirname, "../frontend/node_modules/playwright"));

const TOKEN = process.env.CHIME_TEST_TOKEN || "";
const USER_ID = process.env.CHIME_USER_ID || "test-user-id";
const USERNAME = process.env.CHIME_USERNAME || "testuser";
const OUT_DIR = path.resolve(__dirname, "../docs/screenshots");

async function run() {
  if (!TOKEN) {
    console.warn("Notice: CHIME_TEST_TOKEN environment variable not set. Authenticated routes may fail.");
  }

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 2, // 2x retina crispness
  });

  // Set the authentication cookies
  await context.addCookies([
    {
      name: "chime-token",
      value: TOKEN,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
    {
      name: "chime-user",
      value: encodeURIComponent(JSON.stringify({ id: USER_ID, username: USERNAME })),
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();

  // 1. Capture Upload Page
  console.log("Capturing Upload Page...");
  await page.goto("http://localhost:8080/upload", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "upload-page.png") });

  // 2. Capture History Page
  console.log("Capturing History Page...");
  await page.goto("http://localhost:8080/history", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT_DIR, "upload-history.png") });

  // 3. Capture Statement Result: Transactions Table
  console.log("Capturing Statement Transactions Table...");
  await page.goto("http://localhost:8080/results/c67e5edf-ec56-470d-aa59-135cabd9fe1a", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "statement-table.png") });

  // 4. Capture Statement Result: Dashboard & Charts
  console.log("Capturing Statement Dashboard & Charts...");
  await page.click('button:has-text("Dashboard")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "statement-dashboard.png") });

  // 5. Capture Multi-Month Analytics Dashboard
  console.log("Capturing Multi-Month Analytics...");
  await page.goto("http://localhost:8080/analytics", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "analytics-dashboard.png") });

  await browser.close();
  console.log("All screenshots successfully captured!");
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
