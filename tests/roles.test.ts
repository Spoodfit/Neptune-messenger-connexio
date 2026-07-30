import assert from "node:assert/strict";
import test from "node:test";

import {
  canAccessAllowedRoles,
  normalizeUserRole
} from "../src/domain/roles";

test("les anciens rôles sont normalisés vers les six statuts Neptune", () => {
  assert.equal(normalizeUserRole("visionary"), "visionnaire");
  assert.equal(normalizeUserRole("captain"), "capitaine");
  assert.equal(normalizeUserRole("member"), "triton");
});

test("les permissions comparent les rôles normalisés", () => {
  assert.equal(canAccessAllowedRoles("captain", ["capitaine"]), true);
  assert.equal(canAccessAllowedRoles("triton", ["visionnaire"]), false);
});
