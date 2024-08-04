const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const Imap = require("node-imap");
const { simpleParser } = require("mailparser");
const moment = require("moment-timezone");
require("dotenv").config();

const {
  NAUKRI_EMAILID,
  NAUKRI_PASSWORD,
  BOT_EMAILID,
  BOT_MAIL_PASSWORD,
  RECEIVEING_EMAILID,
  IMAP_USER,
  IMAP_PASSWORD,
  IMAP_HOST,
  IMAP_PORT
} = process.env;

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
      { filename: "screenshot.png", content: attachment }
    ];
  }

  let info = await transporter.sendMail(mailOptions);
  console.log("Email sent: %s", info.messageId);
};

const getOTPFromEmail = async () => {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: IMAP_USER,
      password: IMAP_PASSWORD,
      host: IMAP_HOST,
      port: IMAP_PORT,
      tls: true
    });

    function openInbox(cb) {
      imap.openBox('INBOX', true, cb);
    }

    imap.once('ready', () => {
      openInbox((err, box) => {
        if (err) throw err;
        imap.search(['UNSEEN', ['SUBJECT', 'OTP']], (err, results) => {
          if (err) {
            reject(err);
            return;
          }
          if (!results || !results.length) {
            reject(new Error('No OTP email found'));
            return;
          }

          const f = imap.fetch(results, { bodies: '' });
          f.on('message', (msg, seqno) => {
            msg.on('body', (stream, info) => {
              simpleParser(stream, (err, mail) => {
                if (err) {
                  reject(err);
                  return;
                }
                const otpMatch = mail.text.match(/(\d{6})/);
                if (otpMatch) {
                  resolve(otpMatch[1]);
                } else {
                  reject(new Error('No OTP found in email'));
                }
              });
            });
          });
          f.once('error', (err) => {
            reject(err);
          });
          f.once('end', () => {
            imap.end();
          });
        });
      });
    });

    imap.once('error', (err) => {
      reject(err);
    });

    imap.once('end', () => {
      console.log('Connection ended');
    });

    imap.connect();
  });
};

const naukriUpdater = async (emailID, password) => {
  let browser;
  try {
    console.log(`Browser launching...!`);
    const now = new Date();
    console.log(`Launching started at: ${convertGMTToIST(now)}`);
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-accelerated-2d-canvas", "--no-first-run", "--no-zygote", "--single-process", "--disable-gpu"],
      headless: false,
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

      // Wait for OTP input field
      console.log("Waiting for OTP input...");
      await page.waitForSelector("#otpField", { timeout: 60000 });
      console.log("OTP input field found.");

      // Get OTP from email
      const otp = await getOTPFromEmail();
      console.log(`Retrieved OTP: ${otp}`);

      // Enter OTP
      await page.type("#otpField", otp);
      await page.click("button[type='submit']");

      // Wait for navigation to complete
      await page.waitForNavigation({ waitUntil: "networkidle2" });

      // Save session cookies
      const cookies = await page.cookies();
      fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
      console.log("Session cookies saved!");
    }

    console.log("Navigating to profile update section...!");
    await page.goto("https://www.naukri.com/mnjuser/profile?id=&altresid", { waitUntil: "networkidle2" });
    await randomDelay(2000, 4000);
    console.log("Navigated to profile update section");

    // Add code here to update specific fields in the profile
    // Example: await page.type('#skills', 'New Skills');
    console.log("Browser Closing");
  } catch (error) {
    console.log(`Error occurred while creating the browser instance => ${error}`);
  } finally {
    if (browser) {
      await browser.close();
      console.log("Browser Closed");
      const now = new Date();
      console.log(`Closing started at: ${convertGMTToIST(now)}`);
    }
  }
};

module.exports = { naukriUpdater };
