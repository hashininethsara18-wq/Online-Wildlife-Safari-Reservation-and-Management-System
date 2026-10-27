// app.js - main server file for the Wildlife Safari Reservation System
require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./config/db');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const methodOverride = require('method-override');
app.use(methodOverride('_method'));

const bookingRoutes = require('./routes/bookings');
app.use('/bookings', bookingRoutes);

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

// 404 page: runs when no route matches
app.use((req, res) => {
  res.status(404).render('error', { message: 'Sorry, that page was not found.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));