const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const express = require("express");
const moment = require("moment-timezone");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const { NAUKRI_EMAILID, NAUKRI_PASSWORD, BOT_EMAILID, BOT_MAIL_PASSWORD, RECEIVEING_EMAILID } = process.env;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = (min, max) => delay(Math.floor(Math.random() * (max - min + 1) + min));

function convertGMTToIST(gmtDateString) {
  const istDate = moment(gmtDateString).tz("Asia/Kolkata");
  return istDate.format("YYYY-MM-DD hh:mm:ss A");
}

const sendEmail = async (subject, text, attachment) => {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: BOT_EMAILID,
      pass: BOT_MAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  let mailOptions = {
    from: `"NaukriUpdateBot" <${BOT_EMAILID}>`,
    to: RECEIVEING_EMAILID,
    subject: subject,
    text: text,
  };

  if (attachment) {
    mailOptions.attachments = [{ filename: "Screenshot.png", content: attachment }];
  }

  let info = await transporter.sendMail(mailOptions);
  console.log("Email sent: %s", info.messageId);
};

// Retry mechanism for waiting for a selector
const waitForSelectorWithRetry = async (page, selector, timeout = 30000, retries = 3) => {
  let attempt = 0;
  while (attempt < retries) {
    try {
      await page.waitForSelector(selector, { timeout });
      return;
    } catch (error) {
      attempt++;
      console.log(`Retry ${attempt}/${retries} for selector: ${selector}`);
      await delay(5000); // wait before retrying
    }
  }
  throw new Error(`Failed to find selector: ${selector}`);
};

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
        "--disable-software-rasterizer",
        "--disable-http2",
      ],
      headless: true,
      slowMo: 100,
      protocolTimeout: 120000,
    });

    console.log(`Browser launched...!`);
    const page = await browser.newPage();

    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto("https://www.naukri.com/nlogin/login", { waitUntil: "networkidle2" });

    const loginCheck = await page.evaluate(() => document.querySelector(".dashboard") !== null);
    if (!loginCheck) {
      await page.type("#usernameField", emailID);
      await randomDelay(1000, 3000);
      await page.type("#passwordField", password);
      await randomDelay(1000, 2000);
      await page.click("button[data-ga-track='spa-event|login|login|Save||||true']");
      await randomDelay(2000, 4000);

      if (await page.evaluate(() => document.querySelector(".otp-input") !== null)) {
        console.log("OTP input found");
      } else {
        console.log("No OTP found");
      }
    }

    await page.goto("https://www.naukri.com/mnjuser/profile?id=&altresid", { waitUntil: "networkidle2" });
    await waitForSelectorWithRetry(page, ".widgetHead>.edit");

    await page.click(".widgetHead> .edit");

    await randomDelay(1000, 2000);
    // Click on <input> #keySkillSugg
    await page.waitForSelector("#keySkillSugg");
    await page.click("#keySkillSugg");

    await randomDelay(1000, 2000);
    // Fill "Node Fra" on <input> #keySkillSugg
    await page.waitForSelector("#keySkillSugg:not([disabled])");
    await page.type("#keySkillSugg", "Node Fra");

    // Click on <div> "Node Framework"
    await page.waitForSelector(".Sbtn");

    await randomDelay(2000, 4000);
    await page.click(".Sbtn");
    await randomDelay(2000, 4000);

    await page.evaluate(() => window.scrollBy(0, 131));
    await page.evaluate(() => window.scrollBy(0, -44));
    await page.evaluate(() => window.scrollBy(0, 253));

    await page.click("#saveKeySkills");

    const screenshotBuffer = await page.screenshot({ fullPage: true });
    await sendEmail("Naukri Profile Update", "Saved key skills and reached Naukri Profile Page", screenshotBuffer);
  } catch (error) {
    console.log(`Error occurred while creating the browser instance => ${error}`);
  } finally {
    if (browser) {
      await browser.close();
      const now = new Date();
      console.log(`Browser closed`);
      console.log(`Closing started at: ${convertGMTToIST(now)}`);
    }
  }
};

app.get("/", (req, res) => {
  res.send("Naukri-BOT is running");
});

app.listen(PORT, () => {
  console.log(`Naukri-BOT app listening on port ${PORT}!`);
  naukriUpdater(NAUKRI_EMAILID, NAUKRI_PASSWORD);
});
