import matter from "gray-matter";
import { TaskSpecSchema, type TaskSpec } from "../types/task.js";
import { logger } from "../utils/logger.js";

interface ParseResult {
  success: boolean;
  task?: TaskSpec;
  error?: string;
}

export function parseTask(input: string): ParseResult {
  let contentToParse = input.trim();

  // 1. Detect YAML block in chat message
  // Regex looks for ```yaml ... ```
  const yamlBlockRegex = /```(?:yaml|yml)\n([\s\S]+?)\n```/i;
  const match = input.match(yamlBlockRegex);

  if (match && match[1]) {
    contentToParse = `---\n${match[1]}\n---`; // Prepare for gray-matter
  } else if (!input.startsWith("---")) {
    // If no frontmatter and no yaml block, check if it's purely YAML content?
    // gray-matter expects '---' delimiters for frontmatter.
    // But if user sends just YAML text without code block or ---, gray-matter might treat it as content.
    // We'll assume if it looks like YAML key-value pairs? No, risky.
    // Stick to code block or frontmatter.
    // However, if input IS a file content (from readFile), it might just be the file content.
    // If it's markdown with frontmatter, gray-matter handles it.
  }

  try {
    const parsed = matter(contentToParse);

    // If no data found in frontmatter, maybe the content itself is what we want?
    // But gray-matter parses frontmatter into `data`.
    // If we wrapped YAML block in ---, `data` should have it.

    if (Object.keys(parsed.data).length === 0) {
      return {
        success: false,
        error:
          "No valid YAML task definition found. Please use ```yaml block or frontmatter.",
      };
    }

    // Validate with Zod
    const result = TaskSpecSchema.safeParse(parsed.data);

    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      return {
        success: false,
        error: `Validation Error: ${issues}`,
      };
    }

    return {
      success: true,
      task: result.data,
    };
  } catch (e) {
    logger.error("Failed to parse task input", { error: String(e) });
    return {
      success: false,
      error: `Parse Error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
