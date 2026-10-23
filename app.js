require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./config/db');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Temporary test route to confirm the database works
app.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM safari_packages');
    res.json(rows);
  } catch (err) {
    res.status(500).send('Database error: ' + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));