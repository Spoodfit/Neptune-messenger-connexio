"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const roles_1 = require("../src/domain/roles");
(0, node_test_1.default)("les anciens rôles sont normalisés vers les six statuts Neptune", () => {
    strict_1.default.equal((0, roles_1.normalizeUserRole)("visionary"), "visionnaire");
    strict_1.default.equal((0, roles_1.normalizeUserRole)("captain"), "capitaine");
    strict_1.default.equal((0, roles_1.normalizeUserRole)("member"), "triton");
});
(0, node_test_1.default)("les permissions comparent les rôles normalisés", () => {
    strict_1.default.equal((0, roles_1.canAccessAllowedRoles)("captain", ["capitaine"]), true);
    strict_1.default.equal((0, roles_1.canAccessAllowedRoles)("triton", ["visionnaire"]), false);
});
(0, node_test_1.default)("une conversation restreinte sans rôles autorisés reste invisible", () => {
    strict_1.default.equal((0, roles_1.canAccessAllowedRoles)("admin"), false);
    strict_1.default.equal((0, roles_1.canAccessAllowedRoles)("visionnaire", []), false);
});
