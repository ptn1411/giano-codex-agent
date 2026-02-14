import fs from "fs";
import path from "path";
import { formatTaskForAgent } from "../src/tasks/executor.js";
import { parseTask } from "../src/tasks/parser.js";

async function runTests() {
  console.log("🧪 Running Task Parser Tests...\n");

  // Test 1: YAML Block
  console.log("Test 1: YAML Block parsing");
  const yamlInput = `
Here is a task:
\`\`\`yaml
objective: "Test YAML Parsing"
steps:
  - "Step 1"
  - "Step 2"
\`\`\`
  `;
  const res1 = parseTask(yamlInput);
  if (res1.success) {
    console.log("✅ YAML Block: Passed");
    // console.log(res1.task);
  } else {
    console.error("❌ YAML Block: Failed", res1.error);
  }

  // Test 2: Markdown Frontmatter (Read file)
  console.log("\nTest 2: Markdown Frontmatter parsing");
  try {
    const filePath = path.join(process.cwd(), "tasks/examples/task-sample.md");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const res2 = parseTask(fileContent);

    if (res2.success) {
      console.log("✅ Frontmatter: Passed");
      console.log("Formatted Prompt Preview:");
      console.log("---------------------------------------------------");
      console.log(formatTaskForAgent(res2.task!));
      console.log("---------------------------------------------------");
    } else {
      console.error("❌ Frontmatter: Failed", res2.error);
    }
  } catch (e) {
    console.error("❌ Frontmatter: Failed to read file", e);
  }

  // Test 3: Invalid Schema
  console.log("\nTest 3: Invalid Schema (Missing objective)");
  const invalidInput = `
\`\`\`yaml
steps: ["Only step"]
\`\`\`
  `;
  const res3 = parseTask(invalidInput);
  if (!res3.success && res3.error?.includes("Objective is required")) {
    console.log("✅ Invalid Schema: Passed (Caught error)");
  } else {
    console.error(
      "❌ Invalid Schema: Failed (Did not catch error or wrong error)",
      res3
    );
  }
}

runTests();
