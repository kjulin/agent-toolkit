-- Easy Column Fetch Scenario
-- Setup a simple employees table with various departments and salaries
-- Includes distractor tables to make schema exploration more realistic

DROP SCHEMA IF EXISTS eval_easy_column_fetch CASCADE;
CREATE SCHEMA eval_easy_column_fetch;

-- Create departments table (distractor - not needed for the task)
CREATE TABLE eval_easy_column_fetch.departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  budget INTEGER NOT NULL,
  manager_id INTEGER
);

INSERT INTO eval_easy_column_fetch.departments (name, budget, manager_id) VALUES
  ('Engineering', 5000000, 1),
  ('Marketing', 2000000, 3),
  ('Sales', 3000000, 4),
  ('HR', 1000000, NULL);

-- Create offices table (distractor - not needed for the task)
CREATE TABLE eval_easy_column_fetch.offices (
  id SERIAL PRIMARY KEY,
  location VARCHAR(100) NOT NULL,
  capacity INTEGER NOT NULL,
  opened_date DATE NOT NULL
);

INSERT INTO eval_easy_column_fetch.offices (location, capacity, opened_date) VALUES
  ('San Francisco', 200, '2015-03-01'),
  ('New York', 150, '2016-06-15'),
  ('Austin', 100, '2020-01-20'),
  ('Remote', 9999, '2020-03-15');

-- Create employees table (main table for the task)
CREATE TABLE eval_easy_column_fetch.employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  salary INTEGER NOT NULL,
  hire_date DATE NOT NULL,
  active BOOLEAN DEFAULT true,
  office_id INTEGER
);

INSERT INTO eval_easy_column_fetch.employees (name, department, salary, hire_date, active, office_id) VALUES
  ('Alice Johnson', 'Engineering', 120000, '2020-01-15', true, 1),
  ('Bob Smith', 'Engineering', 110000, '2021-03-20', true, 1),
  ('Carol White', 'Marketing', 95000, '2019-07-10', true, 2),
  ('David Brown', 'Sales', 85000, '2022-02-01', true, 2),
  ('Eve Davis', 'Engineering', 130000, '2018-11-05', true, 1),
  ('Frank Miller', 'Marketing', 78000, '2023-01-15', false, 3),
  ('Grace Lee', 'Sales', 92000, '2020-09-12', true, 3),
  ('Henry Wilson', 'Engineering', 105000, '2021-06-30', true, 4);

-- Create employee_reviews table (distractor - not needed for the task)
CREATE TABLE eval_easy_column_fetch.employee_reviews (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  review_date DATE NOT NULL,
  rating INTEGER NOT NULL,
  comments TEXT
);

INSERT INTO eval_easy_column_fetch.employee_reviews (employee_id, review_date, rating, comments) VALUES
  (1, '2023-12-15', 5, 'Excellent performance'),
  (2, '2023-12-16', 4, 'Good work'),
  (5, '2023-12-17', 5, 'Outstanding contributions'),
  (8, '2023-12-18', 4, 'Solid performer');
