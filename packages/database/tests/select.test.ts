import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { select } from '../src/core/select';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/tests';

describe('select operation', () => {
  let pool: Pool;
  let selectOp: ReturnType<typeof select>;
  const testSchema = 'test_select_schema';

  beforeAll(async () => {
    // Create a pool for test setup/teardown
    pool = new Pool({ connectionString: TEST_DATABASE_URL });

    // Drop and recreate test schema to ensure clean state
    await pool.query(`DROP SCHEMA IF EXISTS ${testSchema} CASCADE`);
    await pool.query(`CREATE SCHEMA ${testSchema}`);

    // Create test table in test schema
    await pool.query(`
      CREATE TABLE ${testSchema}.test_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100),
        age INTEGER,
        active BOOLEAN DEFAULT true
      )
    `);

    // Insert test data
    await pool.query(`
      INSERT INTO ${testSchema}.test_users (name, email, age, active) VALUES
      ('Alice Johnson', 'alice@example.com', 30, true),
      ('Bob Smith', 'bob@example.com', 25, true),
      ('Charlie Brown', 'charlie@example.com', 35, false),
      ('Diana Prince', 'diana@example.com', 28, true)
    `);

    // Create select operation
    selectOp = select(TEST_DATABASE_URL);
  });

  afterAll(async () => {
    // Cleanup: drop test schema and all its contents
    await pool.query(`DROP SCHEMA IF EXISTS ${testSchema} CASCADE`);
    await pool.end();
  });

  describe('successful queries', () => {
    it('should execute basic SELECT query', async () => {
      const result = await selectOp(`SELECT * FROM ${testSchema}.test_users`);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.rows).toHaveLength(4);
      expect(result.data!.rowCount).toBe(4);
      expect(result.data!.fields).toBeDefined();
      expect(result.data!.fields.length).toBeGreaterThan(0);
    });

    it('should execute SELECT with WHERE clause', async () => {
      const result = await selectOp(`SELECT * FROM ${testSchema}.test_users WHERE age > 28`);

      expect(result.success).toBe(true);
      expect(result.data!.rows).toHaveLength(2);
      expect(result.data!.rows.every((row) => row.age > 28)).toBe(true);
    });

    it('should execute SELECT with parameterized query', async () => {
      const result = await selectOp(
        `SELECT * FROM ${testSchema}.test_users WHERE age > $1`,
        [28]
      );

      expect(result.success).toBe(true);
      expect(result.data!.rows).toHaveLength(2);
    });

    it('should execute SELECT with specific columns', async () => {
      const result = await selectOp(`SELECT name, email FROM ${testSchema}.test_users`);

      expect(result.success).toBe(true);
      expect(result.data!.rows[0]).toHaveProperty('name');
      expect(result.data!.rows[0]).toHaveProperty('email');
      expect(result.data!.rows[0]).not.toHaveProperty('age');
    });

    it('should execute SELECT with ORDER BY', async () => {
      const result = await selectOp(
        `SELECT * FROM ${testSchema}.test_users ORDER BY age ASC`
      );

      expect(result.success).toBe(true);
      expect(result.data!.rows[0].age).toBe(25);
      expect(result.data!.rows[3].age).toBe(35);
    });

    it('should execute SELECT with LIMIT', async () => {
      const result = await selectOp(`SELECT * FROM ${testSchema}.test_users LIMIT 2`);

      expect(result.success).toBe(true);
      expect(result.data!.rows).toHaveLength(2);
    });

    it('should execute SELECT with COUNT aggregate', async () => {
      const result = await selectOp(`SELECT COUNT(*) as count FROM ${testSchema}.test_users`);

      expect(result.success).toBe(true);
      expect(result.data!.rows[0].count).toBe('4');
    });

    it('should execute SELECT with JOIN', async () => {
      // Create a second table for JOIN test in test schema
      await pool.query(`
        CREATE TABLE ${testSchema}.test_orders (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES ${testSchema}.test_users(id),
          total DECIMAL(10, 2)
        )
      `);

      await pool.query(`
        INSERT INTO ${testSchema}.test_orders (user_id, total) VALUES
        (1, 100.50),
        (1, 200.75),
        (2, 50.25)
      `);

      const result = await selectOp(`
        SELECT u.name, o.total
        FROM ${testSchema}.test_users u
        JOIN ${testSchema}.test_orders o ON u.id = o.user_id
        WHERE u.id = 1
      `);

      expect(result.success).toBe(true);
      expect(result.data!.rows).toHaveLength(2);

      // Cleanup (will also be cleaned up by schema CASCADE drop)
      await pool.query(`DROP TABLE IF EXISTS ${testSchema}.test_orders`);
    });

    it('should execute CTE (WITH) query', async () => {
      const result = await selectOp(`
        WITH active_users AS (
          SELECT * FROM ${testSchema}.test_users WHERE active = true
        )
        SELECT name FROM active_users
      `);

      expect(result.success).toBe(true);
      expect(result.data!.rows).toHaveLength(3);
    });

    it('should return empty result for no matches', async () => {
      const result = await selectOp(
        `SELECT * FROM ${testSchema}.test_users WHERE age > 100`
      );

      expect(result.success).toBe(true);
      expect(result.data!.rows).toHaveLength(0);
      expect(result.data!.rowCount).toBe(0);
    });
  });

  describe('security and validation', () => {
    it('should reject INSERT queries', async () => {
      const result = await selectOp(
        "INSERT INTO test_users (name, email, age) VALUES ('Hacker', 'hack@evil.com', 99)"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Only SELECT queries are allowed');
    });

    it('should reject UPDATE queries', async () => {
      const result = await selectOp(
        "UPDATE test_users SET name = 'Hacked' WHERE id = 1"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Only SELECT queries are allowed');
    });

    it('should reject DELETE queries', async () => {
      const result = await selectOp('DELETE FROM test_users WHERE id = 1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Only SELECT queries are allowed');
    });

    it('should reject DROP queries', async () => {
      const result = await selectOp('DROP TABLE test_users');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Only SELECT queries are allowed');
    });

    it('should reject CREATE queries', async () => {
      const result = await selectOp('CREATE TABLE hack (id INTEGER)');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Only SELECT queries are allowed');
    });
  });

  describe('error handling', () => {
    it('should handle syntax errors', async () => {
      const result = await selectOp('SELECT * FORM test_users'); // typo: FORM instead of FROM

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('syntax error');
    });

    it('should handle non-existent table', async () => {
      const result = await selectOp('SELECT * FROM nonexistent_table');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle non-existent column', async () => {
      const result = await selectOp(
        'SELECT nonexistent_column FROM test_users'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle parameter mismatch', async () => {
      const result = await selectOp(
        'SELECT * FROM test_users WHERE age > $1 AND name = $2',
        [30] // Missing second parameter
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('field metadata', () => {
    it('should return field information', async () => {
      const result = await selectOp(`SELECT id, name, age FROM ${testSchema}.test_users`);

      expect(result.success).toBe(true);
      expect(result.data!.fields).toHaveLength(3);
      expect(result.data!.fields[0].name).toBe('id');
      expect(result.data!.fields[1].name).toBe('name');
      expect(result.data!.fields[2].name).toBe('age');
      expect(result.data!.fields[0].dataTypeID).toBeDefined();
    });
  });
});
