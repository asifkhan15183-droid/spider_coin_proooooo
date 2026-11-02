import test from "node:test";
import assert from "node:assert/strict";
import { verifyTelegramInitData } from "../src/auth.js";

test("rejects missing Telegram initData", async () => {
  await assert.rejects(() => verifyTelegramInitData("", "token"), /not configured/);
});

test("rejects malformed Telegram initData", async () => {
  await assert.rejects(() => verifyTelegramInitData("user=%7B%22id%22%3A1%7D", "token"), /signature/);
});
