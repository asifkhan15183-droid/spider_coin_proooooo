import test from "node:test";
import assert from "node:assert/strict";
import { validAddress, validTxHash, safeText } from "../src/utils.js";

test("validates EVM address and transaction hash shapes", () => {
  assert.equal(validAddress("0x" + "a".repeat(40)), true);
  assert.equal(validAddress("0x123"), false);
  assert.equal(validTxHash("0x" + "b".repeat(64)), true);
  assert.equal(validTxHash("nope"), false);
});
test("bounds user text", () => {
  assert.equal(safeText("  hello  "), "hello");
  assert.equal(safeText("a".repeat(20), 5), "aaaaa");
});
