// src/bot/handlers/tasks.ts
// Bot commands for task system

import fs from "fs/promises";
import type { Bot, Context } from "gianobot";
import path from "path";
import { config } from "../../config.js";
import {
  getTaskExecutor,
  getTaskParser,
  getTaskReporter,
} from "../../tasks/index.js";
import { logError, logInfo } from "../../utils/logger.js";

export function setupTasksHandler(bot: Bot): void {
  // /tasks - List available task files
  bot.command("tasks", async (ctx: Context) => {
    try {
      const tasksDir = path.join(config.defaultWorkspace, "tasks");

      try {
        await fs.access(tasksDir);
      } catch {
        await ctx.reply(
          "📋 **No tasks directory found**\n\n" +
            `Create a \`tasks/\` folder in your workspace with \`.md\` task files.\n\n` +
            "Example task structure:\n" +
            "```markdown\n" +
            "---\n" +
            "name: My Task\n" +
            "---\n" +
            "## Steps\n" +
            "- [ ] First step\n" +
            "- [ ] Second step\n" +
            "```"
        );
        return;
      }

      const files = await fs.readdir(tasksDir);
      const mdFiles = files.filter((f) => f.endsWith(".md"));

      if (mdFiles.length === 0) {
        await ctx.reply("📋 No task files found in `tasks/` directory.");
        return;
      }

      const parser = getTaskParser();
      const lines: string[] = ["📋 **Available Tasks:**", ""];

      for (const file of mdFiles.slice(0, 20)) {
        const filePath = path.join(tasksDir, file);
        try {
          const task = await parser.parseFile(filePath);
          lines.push(`• **${task.frontmatter.name}** (\`${file}\`)`);
          if (task.frontmatter.description) {
            lines.push(`  ${task.frontmatter.description.slice(0, 80)}`);
          }
        } catch {
          lines.push(`• \`${file}\` (parse error)`);
        }
      }

      lines.push("", "Use `/run <filename>` to execute a task.");

      await ctx.reply(lines.join("\n"));
    } catch (error) {
      logError("Failed to list tasks", error);
      await ctx.reply("❌ Failed to list tasks: " + String(error));
    }
  });

  // /run <file> - Execute a task file
  bot.command("run", async (ctx: Context) => {
    const filename = ctx.args?.join(" ");

    if (!filename) {
      await ctx.reply(
        "**Usage:** `/run <filename>`\n\n" +
          "Example: `/run feature-add-login.md`"
      );
      return;
    }

    try {
      const tasksDir = path.join(config.defaultWorkspace, "tasks");
      let filePath = path.join(tasksDir, filename);

      // Add .md extension if not present
      if (!filePath.endsWith(".md")) {
        filePath += ".md";
      }

      // Check file exists
      try {
        await fs.access(filePath);
      } catch {
        await ctx.reply(`❌ Task file not found: \`${filename}\``);
        return;
      }

      logInfo(`Running task: ${filename}`);
      await ctx.reply(
        `⏳ **Starting task:** ${filename}\n\nThis may take a while...`
      );

      const parser = getTaskParser();
      const executor = getTaskExecutor();
      const reporter = getTaskReporter();

      // Parse task
      const task = await parser.parseFile(filePath);

      // Execute
      const result = await executor.execute(task, {
        taskId: `task_${Date.now().toString(36)}`,
        workingDirectory: config.defaultWorkspace,
        variables: {},
        chatId: ctx.chatId,
        userId: ctx.userId,
      });

      // Generate report
      const summary = reporter.generateChatSummary(result, task);
      await ctx.reply(summary);

      // Save full report
      const reportPath = path.join(
        config.defaultWorkspace,
        "tasks",
        `report-${path.basename(filename, ".md")}-${Date.now()}.md`
      );
      await reporter.saveReport(result, task, reportPath);
      await ctx.reply(`📄 Full report saved: \`${path.basename(reportPath)}\``);
    } catch (error) {
      logError("Task execution failed", error);
      await ctx.reply("❌ Task execution failed: " + String(error));
    }
  });
}
