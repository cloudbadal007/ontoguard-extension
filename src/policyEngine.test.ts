import { describe, expect, it } from "vitest";
import {
  checkPolicies,
  findDirectContradictions,
  findTemporalLeaks,
  parsePoliciesJson,
} from "./policyEngine";

describe("findDirectContradictions", () => {
  it("detects same subject+action with opposite kind", () => {
    const conflicts = findDirectContradictions([
      {
        id: "a",
        kind: "must",
        subject: "the account",
        action: "be approved",
        when: "eligible",
      },
      {
        id: "b",
        kind: "must_not",
        subject: "the account",
        action: "be approved",
        when: "flagged",
      },
    ]);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].kind).toBe("direct_contradiction");
  });
});

describe("findTemporalLeaks", () => {
  it("flags until with no matching when elsewhere", () => {
    const conflicts = findTemporalLeaks([
      {
        id: "a",
        kind: "must",
        subject: "records",
        action: "be kept",
        when: "created",
        until: "retention period ends",
      },
      {
        id: "b",
        kind: "must",
        subject: "records",
        action: "be archived",
        when: "storage is full",
      },
    ]);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].kind).toBe("temporal_leak");
  });
});

describe("checkPolicies", () => {
  it("detects eligibility contradiction from sample JSON", () => {
    const policies = parsePoliciesJson(`[
      {
        "id": "elig-1",
        "kind": "must",
        "subject": "the account",
        "action": "be approved",
        "when": "eligible"
      },
      {
        "id": "elig-2",
        "kind": "must_not",
        "subject": "the account",
        "action": "be approved",
        "when": "fraud hold"
      }
    ]`);

    const result = checkPolicies(policies);
    expect(result.hasConflict).toBe(true);
    expect(result.conflicts[0].kind).toBe("direct_contradiction");
  });
});
