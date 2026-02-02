// src/tasks/parser.ts
// Markdown task parser

import fs from "fs/promises";
import matter from "gray-matter";
import type {
  ParsedTask,
  TaskFrontmatter,
  TaskSection,
  TaskStep,
} from "./types.js";

export class TaskParser {
  // Parse a markdown task file
  async parseFile(filePath: string): Promise<ParsedTask> {
    const content = await fs.readFile(filePath, "utf-8");
    return this.parse(content, filePath);
  }

  // Parse markdown content
  parse(content: string, filePath = ""): ParsedTask {
    // Extract frontmatter
    const { data, content: body } = matter(content);
    const frontmatter = this.parseFrontmatter(data);

    // Parse sections
    const sections = this.parseSections(body);

    // Extract steps from the steps section or checkboxes
    const steps = this.extractSteps(sections, body);

    // Extract affected files
    const affectedFiles = this.extractFiles(sections);

    // Extract success criteria
    const successCriteria = this.extractCriteria(sections);

    return {
      frontmatter,
      sections,
      steps,
      affectedFiles,
      successCriteria,
      rawContent: content,
      filePath,
    };
  }

  private parseFrontmatter(data: Record<string, unknown>): TaskFrontmatter {
    return {
      name: String(data.name || data.title || "Untitled Task"),
      description: data.description ? String(data.description) : undefined,
      version: data.version ? String(data.version) : undefined,
      author: data.author ? String(data.author) : undefined,
      created_at: data.created_at ? String(data.created_at) : undefined,
      depends_on: Array.isArray(data.depends_on)
        ? data.depends_on.map(String)
        : undefined,
      variables:
        typeof data.variables === "object" && data.variables
          ? (data.variables as Record<string, string>)
          : undefined,
      tags: Array.isArray(data.tags) ? data.tags.map(String) : undefined,
    };
  }

  private parseSections(body: string): TaskSection[] {
    const sections: TaskSection[] = [];
    const lines = body.split("\n");

    let currentSection: TaskSection | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
      // Check for header (## Section Title)
      const headerMatch = line.match(/^##\s+(.+)$/);
      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          currentSection.content = currentContent.join("\n").trim();
          sections.push(currentSection);
        }

        const title = headerMatch[1]!.trim();
        currentSection = {
          title,
          content: "",
          type: this.detectSectionType(title),
        };
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentSection) {
      currentSection.content = currentContent.join("\n").trim();
      sections.push(currentSection);
    }

    return sections;
  }

  private detectSectionType(title: string): TaskSection["type"] {
    const lower = title.toLowerCase();
    if (lower.includes("goal") || lower.includes("objective")) return "goal";
    if (lower.includes("context") || lower.includes("background"))
      return "context";
    if (
      lower.includes("step") ||
      lower.includes("task") ||
      lower.includes("checklist")
    )
      return "steps";
    if (lower.includes("file") || lower.includes("affect")) return "files";
    if (
      lower.includes("criteria") ||
      lower.includes("success") ||
      lower.includes("verify")
    )
      return "criteria";
    return "other";
  }

  private extractSteps(sections: TaskSection[], body: string): TaskStep[] {
    const steps: TaskStep[] = [];
    let order = 0;

    // First try to find steps section
    const stepsSection = sections.find((s) => s.type === "steps");
    const content = stepsSection?.content || body;

    // Extract checkboxes: - [ ] or - [x]
    const checkboxRegex = /^[-*]\s*\[([ xX])\]\s*(.+)$/gm;
    let match;

    while ((match = checkboxRegex.exec(content)) !== null) {
      const isCompleted = match[1]?.toLowerCase() === "x";
      const description = match[2]?.trim() || "";

      steps.push({
        id: `step_${order + 1}`,
        description,
        status: isCompleted ? "completed" : "pending",
        order: order++,
      });
    }

    // If no checkboxes, try numbered list
    if (steps.length === 0) {
      const numberedRegex = /^\d+\.\s+(.+)$/gm;
      while ((match = numberedRegex.exec(content)) !== null) {
        const description = match[1]?.trim() || "";
        steps.push({
          id: `step_${order + 1}`,
          description,
          status: "pending",
          order: order++,
        });
      }
    }

    return steps;
  }

  private extractFiles(sections: TaskSection[]): string[] {
    const files: string[] = [];

    const filesSection = sections.find((s) => s.type === "files");
    if (!filesSection) return files;

    // Extract backtick-wrapped file paths or list items
    const backticksRegex = /`([^`]+\.[a-zA-Z]+)`/g;
    let match;

    while ((match = backticksRegex.exec(filesSection.content)) !== null) {
      if (match[1]) files.push(match[1]);
    }

    // Also check for list items starting with file paths
    const listRegex = /^[-*]\s*([^\s]+\.[a-zA-Z]+)/gm;
    while ((match = listRegex.exec(filesSection.content)) !== null) {
      if (match[1] && !files.includes(match[1])) {
        files.push(match[1]);
      }
    }

    return files;
  }

  private extractCriteria(sections: TaskSection[]): string[] {
    const criteria: string[] = [];

    const criteriaSection = sections.find((s) => s.type === "criteria");
    if (!criteriaSection) return criteria;

    // Extract checkboxes or list items
    const listRegex = /^[-*]\s*(?:\[.\])?\s*(.+)$/gm;
    let match;

    while ((match = listRegex.exec(criteriaSection.content)) !== null) {
      if (match[1]) criteria.push(match[1].trim());
    }

    return criteria;
  }

  // Apply variable substitution
  substituteVariables(
    task: ParsedTask,
    variables: Record<string, string>
  ): ParsedTask {
    const mergedVars = { ...task.frontmatter.variables, ...variables };

    const substitute = (text: string): string => {
      let result = text;
      for (const [key, value] of Object.entries(mergedVars)) {
        result = result.replace(
          new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"),
          value
        );
        result = result.replace(new RegExp(`\\$\\{${key}\\}`, "g"), value);
      }
      return result;
    };

    return {
      ...task,
      frontmatter: {
        ...task.frontmatter,
        name: substitute(task.frontmatter.name),
        description: task.frontmatter.description
          ? substitute(task.frontmatter.description)
          : undefined,
      },
      steps: task.steps.map((step) => ({
        ...step,
        description: substitute(step.description),
      })),
      affectedFiles: task.affectedFiles.map(substitute),
      successCriteria: task.successCriteria.map(substitute),
    };
  }
}

// Singleton
let taskParser: TaskParser | null = null;

export function getTaskParser(): TaskParser {
  if (!taskParser) {
    taskParser = new TaskParser();
  }
  return taskParser;
}
