import { expect, test } from "bun:test";
import {
  parseStoredPindouTimerState,
  serializePindouTimerState,
  type StoredPindouTimerState,
} from "../src/lib/pindou-timer-storage";

test("parseStoredPindouTimerState should restore a paused timer snapshot", () => {
  const raw = JSON.stringify({
    elapsedMs: 12_345,
    running: false,
    startedAt: null,
  } satisfies StoredPindouTimerState);

  expect(parseStoredPindouTimerState(raw, 50_000)).toEqual({
    elapsedMs: 12_345,
    running: false,
    startedAt: null,
  });
});

test("parseStoredPindouTimerState should continue a running timer after reload", () => {
  const raw = JSON.stringify({
    elapsedMs: 8_000,
    running: true,
    startedAt: 10_000,
  } satisfies StoredPindouTimerState);

  expect(parseStoredPindouTimerState(raw, 15_500)).toEqual({
    elapsedMs: 13_500,
    running: true,
    startedAt: 15_500,
  });
});

test("parseStoredPindouTimerState should fall back to an empty timer for invalid data", () => {
  expect(parseStoredPindouTimerState("{bad json", 99_000)).toEqual({
    elapsedMs: 0,
    running: false,
    startedAt: null,
  });
  expect(parseStoredPindouTimerState(JSON.stringify({ elapsedMs: "bad" }), 99_000)).toEqual({
    elapsedMs: 0,
    running: false,
    startedAt: null,
  });
});

test("serializePindouTimerState should store the active startedAt timestamp", () => {
  expect(
    serializePindouTimerState({
      elapsedMs: 4_500,
      running: true,
      startedAt: 42_000,
    }),
  ).toBe("{\"elapsedMs\":4500,\"running\":true,\"startedAt\":42000}");
});
