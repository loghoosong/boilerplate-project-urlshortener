require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser')
const mongoose = require('mongoose')

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.use(bodyParser.urlencoded({ extended: false }))

const shortUrlSchema = new mongoose.Schema({
  shortId: Number,
  url: String,
});

const ShortUrl = mongoose.model('ShortUrl', shortUrlSchema);

let newId = 1;
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(
    () => {
      console.log('Mongo connected!');
      ShortUrl.findOne().sort('-shortId').exec()
        .then(
          data => {
            newId = data == null ? 1 : data.shortId + 1;
            console.log(`newId = ${newId}`);
          },
          err => { console.error(err) }
        );
    },
    err => { console.error(err); }
  );

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

const reg = /^http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w\-\./?%&=]*)?$/;

app.post('/api/shorturl', async function (req, res) {
  try {
    if (!reg.test(req.body.url)) {
      res.json({ 'error': 'invalid url' });
      return;
    }

    const record = await ShortUrl.findOne({ url: req.body.url });
    if (record !== null) {
      res.json({ 'original_url': req.body.url, 'short_url': record.shortId });
    } else {
      const newRecord = await ShortUrl.create({ shortId: newId, url: req.body.url });
      await newRecord.save();
      res.json({ 'original_url': req.body.url, 'short_url': newId });
      newId++;
    }
  } catch (err) {
    console.error(err);
  }
});

app.get('/api/shorturl/:short_url?', async function (req, res) {
  try {
    if (/^\d+$/.test(req.params.short_url) && req.params.short_url !== '0') {
      const record = await ShortUrl.findOne({ shortId: +req.params.short_url });
      if (record) {
        res.redirect(record.url);
      } else {
        res.json({ 'error': 'short_url not found' });
      }
    } else {
      res.json({ 'error': 'invalid short_url' });
    }
  } catch (err) {
    console.error(err);
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
