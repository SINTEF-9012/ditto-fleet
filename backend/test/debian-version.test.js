import { test } from "node:test";
import assert from "node:assert/strict";
import { compareVersions, isVersionLower } from "../src/debian-version.js";

test("orders versions like dpkg --compare-versions", () => {
  const cases = [
    ["1.0", "1.0", 0],
    ["1.0", "1.1", -1],
    ["1.0", "1.0-0", 0],
    ["1.0", "1.0-1", -1],
    ["01.2", "1.2", 0],
    ["1:0.1", "2.0", 1],
    ["1.0~rc1", "1.0", -1],
    ["1.0~", "1.0", -1],
    ["1.0a", "1.0", 1],
    ["1.0+b1", "1.0", 1],
    ["7.6p2-4", "7.6-0", 1],
    ["3.0.9-1", "3.0.14-1", -1],
    ["3.0.11-1~deb12u2", "3.0.14-1~deb12u1", -1],
    ["3.0.14-1~deb12u1", "3.0.14-1~deb12u2", -1],
    ["3.0.14-1~deb12u2", "3.0.14-1", -1],
  ];
  for (const [a, b, expected] of cases) {
    const reverse = expected === 0 ? 0 : -expected;
    assert.equal(Math.sign(compareVersions(a, b)), expected, `${a} vs ${b}`);
    assert.equal(Math.sign(compareVersions(b, a)), reverse, `${b} vs ${a}`);
  }
});

test("detects vulnerable versions that a lexicographic comparison misses", () => {
  assert.ok("3.0.9-1" > "3.0.14-1");
  assert.ok(isVersionLower("3.0.9-1", "3.0.14-1"));
  assert.ok(!isVersionLower("3.0.14-1~deb12u2", "3.0.14-1~deb12u2"));
});
