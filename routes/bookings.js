const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Show the create form
router.get('/new', async (req, res) => {
  try {
    const [packages] = await db.query(
      `SELECT sp.*, p.name AS park_name
       FROM safari_packages sp
       JOIN parks p ON sp.park_id = p.park_id`
    );
    const [guides] = await db.query('SELECT * FROM guides');
    res.render('bookings/new', { packages, guides, errors: [], old: {} });
  } catch (err) {
    res.status(500).send('Database error: ' + err.message);
  }
});

// Save a new booking
router.post('/', async (req, res) => {
  const { name, email, phone, country, package_id, guide_id, safari_date, num_people } = req.body;
  try {
    // Get the package to calculate the price
    const [pk] = await db.query('SELECT * FROM safari_packages WHERE package_id = ?', [package_id]);
    if (pk.length === 0) return res.status(400).send('Invalid package');
    const jeeps = Math.ceil(num_people / pk[0].max_capacity);
    const total_price = pk[0].price_per_jeep * jeeps;

    // Find the customer by email, or create a new one
    let customer_id;
    const [existing] = await db.query('SELECT customer_id FROM customers WHERE email = ?', [email]);
    if (existing.length > 0) {
      customer_id = existing[0].customer_id;
    } else {
      const [result] = await db.query(
        'INSERT INTO customers (name, email, phone, country) VALUES (?, ?, ?, ?)',
        [name, email, phone, country]
      );
      customer_id = result.insertId;
    }

    await db.query(
      `INSERT INTO bookings (customer_id, package_id, guide_id, safari_date, num_people, total_price)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [customer_id, package_id, guide_id || null, safari_date, num_people, total_price]
    );
    res.redirect('/bookings');
  } catch (err) {
    res.status(500).send('Database error: ' + err.message);
  }
});

// Temporary list page (we build the real one in Phase 3)
router.get('/', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM bookings');
  res.json(rows);
});

module.exports = router;