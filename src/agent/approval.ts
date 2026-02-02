// src/agent/approval.ts
// Approval flow manager for high-risk actions

import { config } from "../config.js";
import type { ApprovalRequest, RiskLevel } from "../types/index.js";
import { logger } from "../utils/logger.js";

const APPROVAL_TIMEOUT_MS = 60000; // 1 minute

export interface ApprovalResult {
  approved: boolean;
  reason?: string;
  autoApproved?: boolean;
}

export class ApprovalManager {
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();
  private approvalCallbacks: Map<string, (result: ApprovalResult) => void> =
    new Map();

  // Assess risk level of an action
  assessRisk(
    action: ApprovalRequest["action"],
    details: ApprovalRequest["details"]
  ): RiskLevel {
    // High risk actions
    if (action === "git_push") return "high";
    if (action === "file_delete") return "high";

    // Medium risk
    if (action === "command_exec") {
      const cmd = details.command?.toLowerCase() || "";
      if (cmd.includes("rm") || cmd.includes("del") || cmd.includes("format")) {
        return "high";
      }
      if (cmd.includes("npm") || cmd.includes("git") || cmd.includes("pip")) {
        return "medium";
      }
      return "low";
    }

    if (action === "file_write") {
      // Check file type
      const path = details.path?.toLowerCase() || "";
      if (
        path.includes(".env") ||
        path.includes("config") ||
        path.includes("secret")
      ) {
        return "medium";
      }
      return "low";
    }

    return "low";
  }

  // Check if action needs approval
  needsApproval(risk: RiskLevel): boolean {
    switch (config.approvalPolicy) {
      case "never":
        return false;
      case "always":
        return true;
      case "on-request":
        return risk === "high" || risk === "medium";
      default:
        return risk === "high";
    }
  }

  // Create approval request
  createRequest(
    action: ApprovalRequest["action"],
    details: ApprovalRequest["details"]
  ): ApprovalRequest {
    const risk = this.assessRisk(action, details);
    const request: ApprovalRequest = {
      id: `approval_${Date.now().toString(36)}`,
      action,
      details,
      risk,
      status: "pending",
      createdAt: new Date(),
    };

    this.pendingApprovals.set(request.id, request);
    return request;
  }

  // Request approval (async - waits for user response)
  async requestApproval(request: ApprovalRequest): Promise<ApprovalResult> {
    // Auto-approve low risk if policy allows
    if (request.risk === "low" && config.approvalPolicy !== "always") {
      logger.info(`Auto-approved low-risk action: ${request.action}`);
      request.status = "approved";
      return { approved: true, autoApproved: true };
    }

    logger.info(`Waiting for approval: ${request.id} (${request.action})`);

    // Wait for approval with timeout
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.approvalCallbacks.delete(request.id);
        request.status = "rejected";
        resolve({ approved: false, reason: "Timeout - no response received" });
      }, APPROVAL_TIMEOUT_MS);

      this.approvalCallbacks.set(request.id, (result) => {
        clearTimeout(timeoutId);
        this.approvalCallbacks.delete(request.id);
        this.pendingApprovals.delete(request.id);
        resolve(result);
      });
    });
  }

  // Approve a pending request
  approve(requestId: string): boolean {
    const request = this.pendingApprovals.get(requestId);
    const callback = this.approvalCallbacks.get(requestId);

    if (request && callback) {
      request.status = "approved";
      callback({ approved: true });
      return true;
    }
    return false;
  }

  // Reject a pending request
  reject(requestId: string, reason?: string): boolean {
    const request = this.pendingApprovals.get(requestId);
    const callback = this.approvalCallbacks.get(requestId);

    if (request && callback) {
      request.status = "rejected";
      callback({ approved: false, reason: reason || "User rejected" });
      return true;
    }
    return false;
  }

  // Get pending approvals
  getPending(): ApprovalRequest[] {
    return Array.from(this.pendingApprovals.values());
  }

  // Format approval request for display
  formatRequest(request: ApprovalRequest): string {
    const riskEmoji = {
      low: "🟢",
      medium: "🟡",
      high: "🔴",
    };

    const lines: string[] = [
      `**⚠️ Approval Required**`,
      "",
      `**Action:** ${request.action}`,
      `**Risk Level:** ${riskEmoji[request.risk]} ${request.risk.toUpperCase()}`,
    ];

    if (request.details.command) {
      lines.push(`**Command:** \`${request.details.command}\``);
    }
    if (request.details.path) {
      lines.push(`**Path:** \`${request.details.path}\``);
    }
    if (request.details.preview) {
      lines.push(
        "",
        "**Preview:**",
        `\`\`\`\n${request.details.preview}\n\`\`\``
      );
    }

    lines.push(
      "",
      `Reply with \`/approve ${request.id}\` or \`/reject ${request.id}\``
    );

    return lines.join("\n");
  }
}

// Singleton
let approvalManager: ApprovalManager | null = null;

export function getApprovalManager(): ApprovalManager {
  if (!approvalManager) {
    approvalManager = new ApprovalManager();
  }
  return approvalManager;
}
