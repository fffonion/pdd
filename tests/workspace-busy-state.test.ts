import { expect, test } from "bun:test";
import {
  getWorkspaceStageBusy,
  getWorkspaceUiBusy,
  scheduleWorkspaceStageBusyProcessing,
  shouldShowWorkspacePanelsSuspenseLoading,
} from "../src/lib/workspace-busy-state";

test("workspace busy state should keep editor refresh busy out of the canvas loading overlay", () => {
  expect(getWorkspaceUiBusy(false, false)).toBe(false);
  expect(getWorkspaceUiBusy(true, false)).toBe(true);
  expect(getWorkspaceUiBusy(false, true)).toBe(true);

  expect(getWorkspaceStageBusy(false, false)).toBe(false);
  expect(getWorkspaceStageBusy(true, false)).toBe(true);
  expect(getWorkspaceStageBusy(false, true)).toBe(false);
});

test("workspace stage busy scheduling should arm busy before processing starts", async () => {
  const events: string[] = [];
  scheduleWorkspaceStageBusyProcessing(
    () => events.push("busy"),
    () => events.push("process"),
    { busyDelayMs: 10, processDelayMs: 20 },
  );

  await Bun.sleep(14);
  expect(events).toEqual(["busy"]);

  await Bun.sleep(12);
  expect(events).toEqual(["busy", "process"]);
});

test("workspace stage busy scheduling cleanup should cancel both busy and processing callbacks", async () => {
  const events: string[] = [];
  const cleanup = scheduleWorkspaceStageBusyProcessing(
    () => events.push("busy"),
    () => events.push("process"),
    { busyDelayMs: 10, processDelayMs: 20 },
  );

  await Bun.sleep(5);
  cleanup();
  await Bun.sleep(20);

  expect(events).toEqual([]);
});

test("workspace panels suspense fallback should show loading when entering from landing with a pending image process", () => {
  expect(shouldShowWorkspacePanelsSuspenseLoading(false, false)).toBe(false);
  expect(shouldShowWorkspacePanelsSuspenseLoading(true, false)).toBe(false);
  expect(shouldShowWorkspacePanelsSuspenseLoading(false, true)).toBe(false);
  expect(shouldShowWorkspacePanelsSuspenseLoading(true, true)).toBe(true);
});
