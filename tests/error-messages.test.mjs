import test from "node:test";
import assert from "node:assert/strict";
import { userFacingError } from "../src/shared/error-messages.js";

test("an existing capture is not misreported as a protected browser page", () => {
  assert.equal(
    userFacingError(new Error("Cannot capture a tab with an active stream")),
    "Level is already active on this tab. The controls have been refreshed."
  );
});

test("genuinely protected browser pages keep the protected-page guidance", () => {
  assert.equal(
    userFacingError(new Error("This protected browser page cannot be processed")),
    "This is a protected browser page and Brave does not allow extensions to process its audio."
  );
});
