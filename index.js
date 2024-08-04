const puppeteer = require("puppeteer");
const express = require("express");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

const checkScrap = async () => {
  const browser = await puppeteer.launch({
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
  await page.goto("https://example.com");
  console.log(`Navigated to ${page.url()}. Title: ${await page.title()}. Current URL: ${await page.url()}`);
  const title = await page.title();
  console.log(`Title: ${title}`);
  console.log("Browser Closing");
  await browser.close();
  console.log(`Browser closed`);
};

app.get("/", (req, res) => {
  res.send(`<h1>RailWaY app Running on port ${PORT}!</h1>`);
});

app.get("/send", (req, res) => {
  checkScrap();
  res.send(`<h1>Successfully Email Sended</h1>`);
});

app.listen(PORT, () => console.log(`RailWaY app listening on port ${PORT}!`));
