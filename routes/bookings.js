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

// List bookings with search, filter and sort
router.get('/', async (req, res) => {
  const { search = '', status = '', sort = 'date_desc' } = req.query;

  // Only allow these sort choices (protects the database)
  const sortOptions = {
    date_desc: 'b.safari_date DESC',
    date_asc: 'b.safari_date ASC',
    price_desc: 'b.total_price DESC',
    price_asc: 'b.total_price ASC'
  };
  const orderBy = sortOptions[sort] || sortOptions.date_desc;

  let sql = `
    SELECT b.*, c.name AS customer_name, c.email, sp.name AS package_name
    FROM bookings b
    JOIN customers c ON b.customer_id = c.customer_id
    JOIN safari_packages sp ON b.package_id = sp.package_id
    WHERE 1=1`;
  const params = [];

  if (search) {
    sql += ' AND c.name LIKE ?';
    params.push('%' + search + '%');
  }
  if (status) {
    sql += ' AND b.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY ' + orderBy;

  try {
    const [bookings] = await db.query(sql, params);
    res.render('bookings/list', { bookings, search, status, sort });
  } catch (err) {
    res.status(500).send('Database error: ' + err.message);
  }
});

// View one booking in detail
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, c.name AS customer_name, c.email, c.phone, c.country,
              sp.name AS package_name, sp.duration_hours, p.name AS park_name,
              g.name AS guide_name, g.phone AS guide_phone
       FROM bookings b
       JOIN customers c ON b.customer_id = c.customer_id
       JOIN safari_packages sp ON b.package_id = sp.package_id
       JOIN parks p ON sp.park_id = p.park_id
       LEFT JOIN guides g ON b.guide_id = g.guide_id
       WHERE b.booking_id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).send('Booking not found');
    res.render('bookings/details', { booking: rows[0] });
  } catch (err) {
    res.status(500).send('Database error: ' + err.message);
  }
});

module.exports = router;