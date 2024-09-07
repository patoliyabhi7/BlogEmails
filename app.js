const express = require('express')
const readEmails = require('./controller/readEmails')
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.status(200).send("Welcome")
})

module.exports = app;