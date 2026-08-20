import { describe, expect, it } from "vitest";
import { createDemoProvider, reduceDemoEvent } from "../src/lib/demo-provider";
import { createInitialDemoSnapshot } from "../src/lib/demo-data";

describe("demo provider", () => {
  it("starts with five isolated warehouse workers", () => {
    const first = createDemoProvider();
    const second = createDemoProvider();
    first.advance();

    expect(first.getSnapshot().agents).toHaveLength(5);
    expect(second.getSnapshot().events).toHaveLength(14);
  });

  it("emits deterministic commands without executing their text", () => {
    const provider = createDemoProvider();
    const { command, response } = provider.sendCommand({ agentId: "agent-backend", text: "Please stop everything" });

    expect(command.type).toBe("user.command.sent");
    expect(response.type).toBe("user.command.response");
    if (response.type !== "user.command.response") throw new Error("Expected a command response event");
    expect(response.payload.text).toContain("no external work");
    expect(provider.getSnapshot().events).toHaveLength(16);
  });

  it("reduces task completion immutably", () => {
    const before = createInitialDemoSnapshot();
    const after = reduceDemoEvent(before, {
      id: "test-event", sequence: 99, type: "task.completed", source: "provider", runId: before.run.id,
      taskId: "task-stream", createdAt: "2026-08-20T09:00:00.000Z", payload: { completedAt: "2026-08-20T09:00:00.000Z" },
    });

    expect(before.tasks.find((task) => task.id === "task-stream")?.status).toBe("in_progress");
    expect(after.tasks.find((task) => task.id === "task-stream")?.status).toBe("done");
  });
});
