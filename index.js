const express = require("express");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => res.send(`<h1>RailWaY app Running on port ${PORT}!</h1>`));

app.get("/send", (req, res) => {
  res.send(`<h1>Successfully Email Sended</h1>`);
});

app.listen(PORT, () => console.log(`RailWaY app listening on port ${PORT}!`));
