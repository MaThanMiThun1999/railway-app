const puppeteer = require("puppeteer");
const express = require("express");
const moment = require("moment-timezone");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const NAUKRI_EMAILID = process.env.NAUKRI_EMAILID;
const NAUKRI_PASSWORD = process.env.NAUKRI_PASSWORD;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = (min, max) => delay(Math.floor(Math.random() * (max - min + 1) + min));
function convertGMTToIST(gmtDateString) {
  // Convert GMT to IST
  const istDate = moment(gmtDateString).tz("Asia/Kolkata");
  // Format the date to a readable string in 12-hour format
  return istDate.format("YYYY-MM-DD hh:mm:ss A"); // 12-hour format with AM/PM
}

const naukriUpdater = async (emailID, password) => {
  let browser;
  try {
    console.log(`Browser launching...!`);
    const now = new Date();
    console.log(`Launching started at: ${convertGMTToIST(now)}`);

    browser = await puppeteer.launch({
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36",
      ],
      headless: true,
      slowMo: 100,
    });
    console.log(`Browser launched...!`);

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
      });
    });
    await page.goto("https://www.naukri.com/nlogin/login", { waitUntil: "networkidle2" });
    await randomDelay(1000, 3000);
    console.log("Navigated to Naukri login page");

    if (!emailID || !password || typeof emailID !== "string" || typeof password !== "string") {
      throw new Error("Email ID or password is not set or not a string.");
    }

    console.log("Entering EmailID...!");
    await page.type("#usernameField", emailID);
    await randomDelay(1000, 3000);
    console.log("Entered Email ID");

    console.log("Entering Password...!");
    await page.type("#passwordField", password);
    await randomDelay(1000, 2000);
    console.log("Entered Password");
    console.log("Filled login form");

    // console.log("Clicking on Login button...!");
    // await page.click("button[data-ga-track='spa-event|login|login|Save||||true']");
    // await randomDelay(2000, 4000);
    // console.log("Clicked on Login button");

    console.log("Browser Closing");
  } catch (error) {
    console.log(`Error occured while creating the browser instance => ${error}`);
  } finally {
    if (browser) {
      await browser.close();
      console.log("Browser Closed");
      const now = new Date();
      console.log(`Closing started at: ${convertGMTToIST(now)}`);
    }
  }
};

const emailID = NAUKRI_EMAILID;
const password = NAUKRI_PASSWORD;

app.get("/", (req, res) => {
  res.send(`<h1>RailWaY app Running on port ${PORT}\nCurrent time is : ${convertGMTToIST(new Date())}!</h1>`);
});

app.get("/send", async (req, res) => {
  await naukriUpdater(emailID, password);
  res.send(`<h1>Successfully Email Sended</h1>`);
});

app.listen(PORT, () => console.log(`RailWaY app listening on port ${PORT}!`));
