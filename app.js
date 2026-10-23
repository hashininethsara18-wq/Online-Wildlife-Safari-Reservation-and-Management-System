require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./config/db');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Home page: shows all safari packages
app.get('/', async (req, res) => {
  try {
    const [packages] = await db.query(
      `SELECT sp.*, p.name AS park_name
       FROM safari_packages sp
       JOIN parks p ON sp.park_id = p.park_id`
    );
    res.render('index', { packages });
  } catch (err) {
    res.status(500).send('Database error: ' + err.message);
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));