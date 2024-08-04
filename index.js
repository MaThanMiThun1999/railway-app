const express = require("express");
const { naukriUpdater } = require("./naukriUpdater");
const moment = require("moment-timezone");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

function convertGMTToIST(gmtDateString) {
  const istDate = moment(gmtDateString).tz("Asia/Kolkata");
  return istDate.format("YYYY-MM-DD hh:mm:ss A");
}

app.get("/", (req, res) => {
  res.send(`<h1>Naukri-BOT app Running on port ${PORT}\nCurrent time is: ${convertGMTToIST(new Date())}!</h1>`);
});

app.get("/send", async (req, res) => {
  const { NAUKRI_EMAILID, NAUKRI_PASSWORD } = process.env;
  await naukriUpdater(NAUKRI_EMAILID, NAUKRI_PASSWORD);
  res.send(`<h1>Successfully Email Sent</h1>`);
});

app.listen(PORT, () => console.log(`Naukri-BOT app listening on port ${PORT}!`));
