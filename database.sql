CREATE DATABASE IF NOT EXISTS safari_db;
USE safari_db;

CREATE TABLE parks (
  park_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(150) NOT NULL,
  description TEXT
);

CREATE TABLE safari_packages (
  package_id INT AUTO_INCREMENT PRIMARY KEY,
  park_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  duration_hours INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  max_capacity INT NOT NULL,
  FOREIGN KEY (park_id) REFERENCES parks(park_id)
);

CREATE TABLE guides (
  guide_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  languages VARCHAR(100)
);

CREATE TABLE customers (
  customer_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(20),
  country VARCHAR(60)
);

CREATE TABLE bookings (
  booking_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  package_id INT NOT NULL,
  guide_id INT,
  safari_date DATE NOT NULL,
  num_people INT NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  status ENUM('Pending','Confirmed','Cancelled') DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  FOREIGN KEY (package_id) REFERENCES safari_packages(package_id),
  FOREIGN KEY (guide_id) REFERENCES guides(guide_id)
);

INSERT INTO parks (name, location, description) VALUES
('Yala National Park', 'Southern Province', 'Famous for leopards and elephants'),
('Udawalawe National Park', 'Sabaragamuwa Province', 'Elephant sanctuary and birdlife'),
('Wilpattu National Park', 'North Western Province', 'Largest national park in Sri Lanka');

INSERT INTO safari_packages (park_id, name, duration_hours, price, max_capacity) VALUES
(1, 'Yala Morning Jeep Safari', 4, 8500.00, 6),
(2, 'Udawalawe Half-Day Safari', 4, 6500.00, 6),
(3, 'Wilpattu Full-Day Safari', 8, 12000.00, 6);

INSERT INTO guides (name, phone, languages) VALUES
('Nimal Perera', '0771234567', 'English, Sinhala'),
('Kasun Silva', '0712345678', 'English, Tamil');