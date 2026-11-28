import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emptyCheckpoint } from "@langchain/langgraph-checkpoint";
import { expect, it } from "vitest";
import { InMemorySaver } from "../src/storage/checkpoint.mjs";

it("persists checkpoints written after a truncate across restart", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "lg-checkpoint-truncate-"));
  const saver = new InMemorySaver();
  const conn = await saver.initialize(cwd);
  try {
    const metadata = { source: "input", step: 0, parents: {} } as const;
    const before = await saver.put(
      { configurable: { thread_id: "before" } },
      emptyCheckpoint(),
      metadata
    );
    await conn.flush();

    await saver.clear();
    const after = await saver.put(
      { configurable: { thread_id: "after" } },
      emptyCheckpoint(),
      metadata
    );
    await saver.putWrites(after, [["result", 42]], "task");
    await conn.flush();

    const restarted = new InMemorySaver();
    await restarted.initialize(cwd);
    expect(await restarted.getTuple(before)).toBeUndefined();
    expect((await restarted.getTuple(after))?.pendingWrites).toEqual([
      ["task", "result", 42],
    ]);
  } finally {
    await conn.flush();
    await rm(cwd, { recursive: true, force: true });
  }
});
