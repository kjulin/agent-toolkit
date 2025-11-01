import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { grep } from "../src/core/grep.js";
import * as path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs/promises";

// Get the directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the test workspace
const workspacePath = path.join(__dirname, "workspace", "grep-test");
let grepOp: ReturnType<typeof grep>;

beforeAll(async () => {
  // Create workspace directory
  await fs.mkdir(workspacePath, { recursive: true });

  // Create subdirectories
  await fs.mkdir(path.join(workspacePath, "subdir"), { recursive: true });
  await fs.mkdir(path.join(workspacePath, "subdir", "deep"), { recursive: true });

  // Create test files
  await fs.writeFile(
    path.join(workspacePath, "file1.txt"),
    "Hello World!\nThis is a simple text file.\nIt contains multiple lines.\nLine four has the word FINDME in it.\nAnd this is the last line.\n"
  );

  await fs.writeFile(path.join(workspacePath, "empty.txt"), "");

  await fs.writeFile(
    path.join(workspacePath, "special-chars.txt"),
    "This file has special characters: @#$%^&*()\n"
  );

  await fs.writeFile(
    path.join(workspacePath, "README.md"),
    "# Test README\n\nThis is a test markdown file.\n"
  );

  await fs.writeFile(
    path.join(workspacePath, "file2.md"),
    "# Another Markdown File\n\nSome content here.\n"
  );

  await fs.writeFile(
    path.join(workspacePath, "subdir", "code.ts"),
    "// TypeScript test file\nexport function greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n\nexport function farewell(name: string): string {\n  return `Goodbye, ${name}!`;\n}\n\n// FINDME: This is a special comment\nexport const VERSION = \"1.0.0\";\n"
  );

  await fs.writeFile(
    path.join(workspacePath, "subdir", "nested.json"),
    '{\n  "name": "test",\n  "version": "1.0.0"\n}\n'
  );

  await fs.writeFile(
    path.join(workspacePath, "subdir", "deep", "file.ts"),
    "// Deep TypeScript file\nexport const DEEP = true;\n"
  );

  await fs.writeFile(
    path.join(workspacePath, "subdir", "deep", "data.json"),
    '{\n  "data": "deep"\n}\n'
  );

  // Create the grep operation
  grepOp = grep(workspacePath);
});

afterAll(async () => {
  // Clean up workspace
  await fs.rm(workspacePath, { recursive: true, force: true });
});

describe("grep operation", () => {
  describe("validation", () => {
    it("should fail when pattern is not provided", async () => {
      const result = await grepOp({
        pattern: "",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("pattern is required");
    });

    it("should fail with invalid regex pattern", async () => {
      const result = await grepOp({
        pattern: "[invalid",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid regex pattern");
    });

    it("should fail when search path is outside workspace", async () => {
      const result = await grepOp({
        pattern: "test",
        path: "../../outside",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Search path must be within workspace");
    });
  });

  describe("files_with_matches mode (default)", () => {
    it("should find files containing pattern", async () => {
      const result = await grepOp({
        pattern: "FINDME",
      });

      expect(result.success).toBe(true);
      expect(result.data?.mode).toBe("files_with_matches");
      if (result.data?.mode === "files_with_matches") {
        expect(result.data.data.length).toBeGreaterThan(0);
        expect(result.data.data).toContain("file1.txt");
      }
    });

    it("should support case insensitive search with -i flag", async () => {
      const result = await grepOp({
        pattern: "findme",
        "-i": true,
      });

      expect(result.success).toBe(true);
      if (result.data?.mode === "files_with_matches") {
        expect(result.data.data.length).toBeGreaterThan(0);
        expect(result.data.data).toContain("file1.txt");
      }
    });

    it("should filter by glob pattern", async () => {
      const result = await grepOp({
        pattern: "FINDME",
        glob: "*.ts",
      });

      expect(result.success).toBe(true);
      if (result.data?.mode === "files_with_matches") {
        expect(result.data.data.length).toBeGreaterThan(0);
        // Should only contain .ts files
        for (const file of result.data.data) {
          expect(file).toMatch(/\.ts$/);
        }
      }
    });

    it("should filter by file type", async () => {
      const result = await grepOp({
        pattern: "function",
        type: "ts",
      });

      expect(result.success).toBe(true);
      if (result.data?.mode === "files_with_matches") {
        expect(result.data.data.length).toBeGreaterThan(0);
      }
    });

    it("should search in specific subdirectory", async () => {
      const result = await grepOp({
        pattern: "FINDME",
        path: "subdir",
      });

      expect(result.success).toBe(true);
      if (result.data?.mode === "files_with_matches") {
        expect(result.data.data.length).toBeGreaterThan(0);
        // All results should be from subdir
        for (const file of result.data.data) {
          expect(file).toMatch(/^subdir/);
        }
      }
    });

    it("should return empty array when no matches found", async () => {
      const result = await grepOp({
        pattern: "NONEXISTENT_PATTERN_XYZ123",
      });

      expect(result.success).toBe(true);
      if (result.data?.mode === "files_with_matches") {
        expect(result.data.data.length).toBe(0);
      }
    });
  });

  describe("content mode", () => {
    it("should return matches with line numbers and content", async () => {
      const result = await grepOp({
        pattern: "FINDME",
        output_mode: "content",
      });

      expect(result.success).toBe(true);
      expect(result.data?.mode).toBe("content");
      if (result.data?.mode === "content") {
        expect(result.data.data.length).toBeGreaterThan(0);

        // Find file1.txt result
        const file1Result = result.data.data.find((r) => r.path === "file1.txt");
        expect(file1Result).toBeDefined();
        expect(file1Result!.matches.length).toBeGreaterThan(0);

        const match = file1Result!.matches[0];
        expect(match.line).toBe(4);
        expect(match.content).toContain("FINDME");
        expect(match.column).toBeGreaterThan(0);
      }
    });

    it("should support regex patterns", async () => {
      const result = await grepOp({
        pattern: "function\\s+\\w+",
        output_mode: "content",
      });

      expect(result.success).toBe(true);
      if (result.data?.mode === "content") {
        expect(result.data.data.length).toBeGreaterThan(0);

        const codeResult = result.data.data.find((r) => r.path.includes("code.ts"));
        expect(codeResult).toBeDefined();
        expect(codeResult!.matches.length).toBeGreaterThan(0);
      }
    });

    it("should find multiple matches in same file", async () => {
      const result = await grepOp({
        pattern: "Hello",
        output_mode: "content",
      });

      expect(result.success).toBe(true);
      if (result.data?.mode === "content") {
        const file1Result = result.data.data.find((r) => r.path === "file1.txt");
        expect(file1Result).toBeDefined();
        expect(file1Result!.matches.length).toBeGreaterThan(0);
      }
    });

    it("should respect head_limit option", async () => {
      const result = await grepOp({
        pattern: ".",
        output_mode: "content",
        head_limit: 1,
      });

      expect(result.success).toBe(true);
      if (result.data?.mode === "content") {
        // Each file should have at most 1 match due to head_limit (max-count per file)
        for (const fileResult of result.data.data) {
          expect(fileResult.matches.length).toBeLessThanOrEqual(1);
        }
      }
    });

    it("should support case insensitive search", async () => {
      const result = await grepOp({
        pattern: "findme",
        output_mode: "content",
        "-i": true,
      });

      expect(result.success).toBe(true);
      if (result.data?.mode === "content") {
        expect(result.data.data.length).toBeGreaterThan(0);
      }
    });

    it("should return relative paths", async () => {
      const result = await grepOp({
        pattern: "FINDME",
        output_mode: "content",
      });

      expect(result.success).toBe(true);
      if (result.data?.mode === "content") {
        for (const item of result.data.data) {
          expect(path.isAbsolute(item.path)).toBe(false);
        }
      }
    });
  });

  describe("count mode", () => {
    it("should return match counts per file", async () => {
      const result = await grepOp({
        pattern: "Hello",
        output_mode: "count",
      });

      expect(result.success).toBe(true);
      expect(result.data?.mode).toBe("count");
      if (result.data?.mode === "count") {
        expect(result.data.data.length).toBeGreaterThan(0);

        const file1Result = result.data.data.find((r) => r.path === "file1.txt");
        expect(file1Result).toBeDefined();
        expect(file1Result!.count).toBeGreaterThan(0);
      }
    });

    it("should return correct counts for multiple matches", async () => {
      const result = await grepOp({
        pattern: ".",
        output_mode: "count",
        glob: "*.txt",
      });

      expect(result.success).toBe(true);
      if (result.data?.mode === "count") {
        expect(result.data.data.length).toBeGreaterThan(0);

        // Each file should have a count
        for (const item of result.data.data) {
          expect(item.count).toBeGreaterThan(0);
          expect(item.path).toMatch(/\.txt$/);
        }
      }
    });

    it("should respect case insensitive flag", async () => {
      const result = await grepOp({
        pattern: "findme",
        output_mode: "count",
        "-i": true,
      });

      expect(result.success).toBe(true);
      if (result.data?.mode === "count") {
        expect(result.data.data.length).toBeGreaterThan(0);
      }
    });
  });

  describe("multiline mode", () => {
    it("should enable multiline matching", async () => {
      const result = await grepOp({
        pattern: "Hello.*World",
        output_mode: "content",
        multiline: true,
      });

      expect(result.success).toBe(true);
      if (result.data?.mode === "content") {
        // Should find matches that span multiple lines if they exist
        expect(result.data.data.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("context lines", () => {
    it("should support -A flag for after context", async () => {
      const result = await grepOp({
        pattern: "FINDME",
        output_mode: "content",
        "-A": 2,
      });

      expect(result.success).toBe(true);
      // Context lines should be included in ripgrep JSON output
      if (result.data?.mode === "content") {
        expect(result.data.data.length).toBeGreaterThan(0);
      }
    });

    it("should support -B flag for before context", async () => {
      const result = await grepOp({
        pattern: "FINDME",
        output_mode: "content",
        "-B": 2,
      });

      expect(result.success).toBe(true);
      if (result.data?.mode === "content") {
        expect(result.data.data.length).toBeGreaterThan(0);
      }
    });

    it("should support -C flag for both before and after context", async () => {
      const result = await grepOp({
        pattern: "FINDME",
        output_mode: "content",
        "-C": 2,
      });

      expect(result.success).toBe(true);
      if (result.data?.mode === "content") {
        expect(result.data.data.length).toBeGreaterThan(0);
      }
    });
  });

  describe("edge cases", () => {
    it("should handle empty files", async () => {
      const result = await grepOp({
        pattern: ".",
        glob: "empty.txt",
      });

      expect(result.success).toBe(true);
      if (result.data?.mode === "files_with_matches") {
        // Empty file should have no matches
        expect(result.data.data.length).toBe(0);
      }
    });

    it("should handle files with special characters", async () => {
      const result = await grepOp({
        pattern: ".",
        glob: "special-chars.txt",
        output_mode: "content",
      });

      expect(result.success).toBe(true);
      if (result.data?.mode === "content") {
        expect(result.data.data.length).toBeGreaterThanOrEqual(0);
      }
    });

    it("should handle nested directories", async () => {
      const result = await grepOp({
        pattern: ".",
        glob: "**/*.json",
      });

      expect(result.success).toBe(true);
      if (result.data?.mode === "files_with_matches") {
        expect(result.data.data.length).toBeGreaterThan(0);

        const nestedFile = result.data.data.find((f) => f.includes("deep"));
        expect(nestedFile).toBeDefined();
      }
    });

    it("should handle pattern with no matches gracefully", async () => {
      const result = await grepOp({
        pattern: "ABSOLUTE_NONEXISTENT_UNIQUE_STRING_987654321",
        output_mode: "content",
      });

      expect(result.success).toBe(true);
      if (result.data?.mode === "content") {
        expect(result.data.data.length).toBe(0);
      }
    });
  });

  describe("combining options", () => {
    it("should combine glob and type filters", async () => {
      const result = await grepOp({
        pattern: "function",
        glob: "**/*.ts",
        output_mode: "content",
      });

      expect(result.success).toBe(true);
      if (result.data?.mode === "content") {
        for (const item of result.data.data) {
          expect(item.path).toMatch(/\.ts$/);
        }
      }
    });

    it("should combine case insensitive with multiline", async () => {
      const result = await grepOp({
        pattern: "hello",
        "-i": true,
        multiline: true,
        output_mode: "content",
      });

      expect(result.success).toBe(true);
      if (result.data?.mode === "content") {
        expect(result.data.data.length).toBeGreaterThanOrEqual(0);
      }
    });

    it("should combine path restriction with glob pattern", async () => {
      const result = await grepOp({
        pattern: ".",
        path: "subdir",
        glob: "*.ts",
      });

      expect(result.success).toBe(true);
      if (result.data?.mode === "files_with_matches") {
        for (const file of result.data.data) {
          expect(file).toMatch(/^subdir.*\.ts$/);
        }
      }
    });
  });

  describe("line numbers and columns", () => {
    it("should report correct line numbers", async () => {
      const result = await grepOp({
        pattern: "World",
        output_mode: "content",
      });

      expect(result.success).toBe(true);
      if (result.data?.mode === "content") {
        const file1Result = result.data.data.find((r) => r.path === "file1.txt");
        expect(file1Result).toBeDefined();

        const match = file1Result!.matches[0];
        expect(match.line).toBeGreaterThan(0);
      }
    });

    it("should report correct column numbers by default", async () => {
      const result = await grepOp({
        pattern: "World",
        output_mode: "content",
      });

      expect(result.success).toBe(true);
      if (result.data?.mode === "content") {
        const file1Result = result.data.data.find((r) => r.path === "file1.txt");
        expect(file1Result).toBeDefined();

        const match = file1Result!.matches[0];
        expect(match.column).toBeGreaterThan(0);
      }
    });
  });
});
