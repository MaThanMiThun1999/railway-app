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
  });

  let mailOptions = {
    from: `"Naukri Update Bot" <${BOT_EMAILID}>`,
    to: RECEIVEING_EMAILID,
    subject: subject,
    text: text,
  };

  if (attachment) {
    mailOptions.attachments = [
      {
        filename: "screenshot.png",
        content: attachment,
      },
    ];
  }

  let info = await transporter.sendMail(mailOptions);
  console.log("Email sent: %s", info.messageId);
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
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36",
      ],
      headless: true,
      slowMo: 100,
    });

    console.log(`Browser launched...!`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Check if cookies file exists
    const cookiesPath = path.resolve(__dirname, "cookies.json");
    const previousSession = fs.existsSync(cookiesPath);
    if (previousSession) {
      const cookies = JSON.parse(fs.readFileSync(cookiesPath, "utf-8"));
      if (cookies.length) {
        await page.setCookie(...cookies);
        console.log("Session cookies loaded!");
      }
    }

    await page.goto("https://www.naukri.com/nlogin/login", { waitUntil: "networkidle2" });

    // Check if logged in
    const loginCheck = await page.evaluate(() => {
      return document.querySelector(".dashboard") !== null;
    });

    if (!loginCheck) {
      console.log("Navigated to Naukri login page");

      if (!emailID || !password || typeof emailID !== "string" || typeof password !== "string") {
        throw new Error("Email ID or password is not set or not a string.");
      }

      console.log("Entering Email ID...!");
      await page.type("#usernameField", emailID);
      await randomDelay(1000, 3000);
      console.log("Entered Email ID");

      console.log("Entering Password...!");
      await page.type("#passwordField", password);
      await randomDelay(1000, 2000);
      console.log("Entered Password");
      console.log("Filled login form");

      console.log("Clicking on Login button...!");
      await page.click("button[data-ga-track='spa-event|login|login|Save||||true']");
      await randomDelay(2000, 4000);
      console.log("Clicked on Login button");

      if (
        await page.evaluate(() => {
          return document.querySelector(".otp-input") !== null;
        })
      ) {
        console.log("OTP input found");
        const OTPscreenshotBuffer = await page.screenshot({ fullPage: true });
        sendEmail("Naukri Profile Update", "Reached Naukri Profile Page", OTPscreenshotBuffer.toString());
        console.log("Sent OTP screenshot");
      } else {
        console.log("OTP input not found");
      }
    }
    console.log("Navigating to profile update section...!");
    await page.goto("https://www.naukri.com/mnjuser/profile?id=&altresid", { waitUntil: "networkidle2" });
    await randomDelay(2000, 4000);
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    sendEmail("Naukri Profile Update", "Reached Naukri Profile Page", screenshotBuffer);
    console.log("Navigated to profile update section");
    console.log("Browser Closing");
  } catch (error) {
    console.log(`Error occurred while creating the browser instance => ${error}`);
  } finally {
    if (browser) {
      // await browser.close();
      console.log("Browser Closed");
      const now = new Date();
      console.log(`Closing started at: ${convertGMTToIST(now)}`);
    }
  }
};

const emailID = NAUKRI_EMAILID;
const password = NAUKRI_PASSWORD;

app.get("/", async(req, res) => {
    await naukriUpdater(emailID, password);
    res.send(`<h1>Successfully Naukri Profile Updated</h1>`);
});

app.get("/send", async (req, res) => {
  await naukriUpdater(emailID, password);
  res.send(`<h1>Successfully Email Sent</h1>`);
});

app.listen(PORT, () => console.log(`Naukri-BOT app listening on port ${PORT}!`));
