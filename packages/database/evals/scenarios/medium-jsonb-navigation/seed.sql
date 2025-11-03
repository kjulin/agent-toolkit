-- Medium JSONB Navigation Scenario
-- Setup orders with JSONB metadata containing product IDs, requiring joins
-- Includes distractor tables to make schema exploration more realistic

DROP SCHEMA IF EXISTS eval_medium_jsonb_nav CASCADE;
CREATE SCHEMA eval_medium_jsonb_nav;

-- Create categories table (distractor - not needed for the task)
CREATE TABLE eval_medium_jsonb_nav.categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT
);

INSERT INTO eval_medium_jsonb_nav.categories (name, description) VALUES
  ('Electronics', 'Electronic devices and accessories'),
  ('Furniture', 'Office and home furniture'),
  ('Supplies', 'Office supplies and consumables');

-- Create products table
CREATE TABLE eval_medium_jsonb_nav.products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0
);

INSERT INTO eval_medium_jsonb_nav.products (id, name, category, price, stock_quantity) VALUES
  (101, 'Laptop Pro', 'Electronics', 1299.99, 45),
  (102, 'Wireless Mouse', 'Electronics', 29.99, 200),
  (103, 'Desk Chair', 'Furniture', 249.99, 30),
  (104, 'Monitor 27"', 'Electronics', 399.99, 75),
  (105, 'Keyboard Mechanical', 'Electronics', 89.99, 120),
  (106, 'Standing Desk', 'Furniture', 599.99, 15);

-- Create customers table (distractor - customer names are in orders table)
CREATE TABLE eval_medium_jsonb_nav.customers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO eval_medium_jsonb_nav.customers (email, phone) VALUES
  ('john.doe@example.com', '555-0101'),
  ('jane.smith@example.com', '555-0102'),
  ('bob.johnson@example.com', '555-0103'),
  ('alice.williams@example.com', '555-0104');

-- Create orders table with JSONB metadata (main table for the task)
CREATE TABLE eval_medium_jsonb_nav.orders (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  order_date DATE NOT NULL,
  metadata JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'
);

INSERT INTO eval_medium_jsonb_nav.orders (customer_name, order_date, metadata, status) VALUES
  ('John Doe', '2024-01-15', '{"product_id": 101, "quantity": 1, "priority": "high", "notes": "Gift wrap requested"}', 'shipped'),
  ('Jane Smith', '2024-01-16', '{"product_id": 102, "quantity": 3, "priority": "normal", "notes": "Office supplies"}', 'delivered'),
  ('Bob Johnson', '2024-01-17', '{"product_id": 103, "quantity": 2, "priority": "normal", "notes": "Ergonomic setup"}', 'pending'),
  ('Alice Williams', '2024-01-18', '{"product_id": 104, "quantity": 1, "priority": "high", "notes": "Dual monitor setup"}', 'processing'),
  ('Charlie Brown', '2024-01-19', '{"product_id": 105, "quantity": 1, "priority": "low", "notes": "Replacement keyboard"}', 'delivered'),
  ('Diana Prince', '2024-01-20', '{"product_id": 101, "quantity": 2, "priority": "urgent", "notes": "Corporate order"}', 'shipped');

-- Create shipments table (distractor - not needed for the task)
CREATE TABLE eval_medium_jsonb_nav.shipments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL,
  tracking_number VARCHAR(50) NOT NULL,
  shipped_date DATE NOT NULL,
  carrier VARCHAR(50) NOT NULL
);

INSERT INTO eval_medium_jsonb_nav.shipments (order_id, tracking_number, shipped_date, carrier) VALUES
  (1, 'TRACK123456', '2024-01-16', 'FedEx'),
  (2, 'TRACK123457', '2024-01-17', 'UPS'),
  (6, 'TRACK123458', '2024-01-21', 'FedEx');
