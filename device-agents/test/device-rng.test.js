import { test } from "node:test";
import assert from "node:assert/strict";
import { deviceRng } from "../src/emulator.js";

const first = (seed, index, purpose) => deviceRng(seed, index, purpose)();

test("emulated devices draw reproducible, unrelated random streams", () => {
  for (let index = 1; index <= 1000; index += 1) {
    assert.notEqual(first(2, index), first(1, index + 1));
    assert.notEqual(first(2, index), first(1, index));
    assert.notEqual(first(1, index, 0), first(1, index, 1));
  }
  assert.equal(first(7, 3), first(7, 3));
});

test("failures injected in two repetitions do not repeat shifted by one device", () => {
  const failed = (seed) =>
    new Set(Array.from({ length: 500 }, (_, i) => i + 1).filter((index) => first(seed, index) < 0.08));
  const a = failed(1);
  const b = failed(2);
  const shifted = [...a].filter((index) => b.has(index - 1)).length;
  assert.ok(a.size > 0 && shifted < a.size / 2, `${shifted} of ${a.size} failures repeat shifted by one device`);
});
