// routes/bookings.js - all booking routes (create, read, update, delete)
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ---------- Helper functions ----------

// Load packages and guides for the dropdown lists
async function loadLists() {
  const [packages] = await db.query(
    `SELECT sp.*, p.name AS park_name
     FROM safari_packages sp
     JOIN parks p ON sp.park_id = p.park_id`
  );
  const [guides] = await db.query('SELECT * FROM guides');
  return { packages, guides };
}

// Check the form data. Returns a list of error messages (empty = OK)
function validateBooking(body, isNew) {
  const errors = [];
  const { name, email, phone, package_id, safari_date, num_people } = body;

  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters.');
  }

  if (isNew) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.push('Please enter a valid email address.');
    }
  }

  if (phone && !/^[0-9+\- ]{7,15}$/.test(phone.trim())) {
    errors.push('Phone must be 7 to 15 characters (numbers, +, - and spaces only).');
  }

  if (!package_id) {
    errors.push('Please select a safari package.');
  }

  if (!safari_date) {
    errors.push('Please choose a safari date.');
  } else if (isNew) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const chosen = new Date(safari_date + 'T00:00:00');
    if (isNaN(chosen.getTime())) {
      errors.push('Safari date is not valid.');
    } else if (chosen < today) {
      errors.push('Safari date cannot be in the past.');
    }
  }

  const people = Number(num_people);
  if (!Number.isInteger(people) || people < 1 || people > 30) {
    errors.push('Number of people must be a whole number from 1 to 30.');
  }

  return errors;
}

// ---------- CREATE ----------

// Show the create form
router.get('/new', async (req, res) => {
  try {
    const lists = await loadLists();
    res.render('bookings/new', { ...lists, errors: [], old: {} });
  } catch (err) {
    res.status(500).send('Database error: ' + err.message);
  }
});

// Save a new booking
router.post('/', async (req, res) => {
  const { name, phone, country, package_id, guide_id, safari_date, num_people } = req.body;
  const email = (req.body.email || '').trim().toLowerCase();
  const errors = validateBooking(req.body, true);

  try {
    let pk = [];
    if (package_id) {
      [pk] = await db.query('SELECT * FROM safari_packages WHERE package_id = ?', [package_id]);
      if (pk.length === 0) errors.push('The selected package does not exist.');
    }

    // If there are errors, show the form again with the old values
    if (errors.length > 0) {
      const lists = await loadLists();
      return res.status(400).render('bookings/new', { ...lists, errors, old: req.body });
    }

    // Price is per jeep (6 people per jeep)
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
        [name.trim(), email, phone ? phone.trim() : null, country ? country.trim() : null]
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

// ---------- READ ----------

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

// ---------- UPDATE ----------

// Show the edit form
router.get('/:id/edit', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, c.name AS customer_name, c.email, c.phone, c.country
       FROM bookings b
       JOIN customers c ON b.customer_id = c.customer_id
       WHERE b.booking_id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).send('Booking not found');

    const lists = await loadLists();
    res.render('bookings/edit', { booking: rows[0], ...lists, errors: [] });
  } catch (err) {
    res.status(500).send('Database error: ' + err.message);
  }
});

// Save the changes
router.put('/:id', async (req, res) => {
  const { name, phone, country, package_id, guide_id, safari_date, num_people, status } = req.body;
  const errors = validateBooking(req.body, false);
  if (!['Pending', 'Confirmed', 'Cancelled'].includes(status)) {
    errors.push('Status is not valid.');
  }

  try {
    const [rows] = await db.query(
      `SELECT b.*, c.name AS customer_name, c.email, c.phone, c.country
       FROM bookings b
       JOIN customers c ON b.customer_id = c.customer_id
       WHERE b.booking_id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).send('Booking not found');

    let pk = [];
    if (package_id) {
      [pk] = await db.query('SELECT * FROM safari_packages WHERE package_id = ?', [package_id]);
      if (pk.length === 0) errors.push('The selected package does not exist.');
    }

    // If there are errors, show the edit form again with what the user typed
    if (errors.length > 0) {
      const lists = await loadLists();
      const booking = {
        ...rows[0],
        customer_name: name,
        phone,
        country,
        package_id: Number(package_id),
        guide_id: guide_id ? Number(guide_id) : null,
        safari_date,
        num_people,
        status
      };
      return res.status(400).render('bookings/edit', { booking, ...lists, errors });
    }

    const jeeps = Math.ceil(num_people / pk[0].max_capacity);
    const total_price = pk[0].price_per_jeep * jeeps;

    await db.query(
      'UPDATE customers SET name = ?, phone = ?, country = ? WHERE customer_id = ?',
      [name.trim(), phone ? phone.trim() : null, country ? country.trim() : null, rows[0].customer_id]
    );
    await db.query(
      `UPDATE bookings
       SET package_id = ?, guide_id = ?, safari_date = ?, num_people = ?, total_price = ?, status = ?
       WHERE booking_id = ?`,
      [package_id, guide_id || null, safari_date, num_people, total_price, status, req.params.id]
    );
    res.redirect('/bookings/' + req.params.id);
  } catch (err) {
    res.status(500).send('Database error: ' + err.message);
  }
});

// ---------- READ ONE ----------

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

// ---------- DELETE ----------

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM bookings WHERE booking_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).send('Booking not found');
    res.redirect('/bookings');
  } catch (err) {
    res.status(500).send('Database error: ' + err.message);
  }
});

module.exports = router;