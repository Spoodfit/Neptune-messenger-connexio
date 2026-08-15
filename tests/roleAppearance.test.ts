import assert from "node:assert/strict";
import test from "node:test";

import { getRoleAppearance } from "../src/domain/roleAppearance";

test("light role surfaces are not dark badges", () => {
  for (const role of ["free", "triton", "moussaillon", "capitaine", "amiral", "allie", "visionnaire", "admin"] as const) {
    const light = getRoleAppearance(role, true);
    const dark = getRoleAppearance(role, false);
    assert.notEqual(light.background, dark.background);
    const hex = light.background.replace("#", "");
    const rgb = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16));
    assert.ok(rgb.reduce((sum, channel) => sum + channel, 0) > 450, `${role} light background must stay visually light`);
  }
});
