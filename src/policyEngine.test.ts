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
        subject: "the claim",
        action: "be paid",
        when: "coverage confirmed",
      },
      {
        id: "b",
        kind: "must_not",
        subject: "the claim",
        action: "be paid",
        when: "SIU hold",
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
        subject: "the policy",
        action: "remain in force",
        when: "premiums are current",
        until: "the waiting period ends",
      },
      {
        id: "b",
        kind: "must",
        subject: "the policy",
        action: "be reviewed",
        when: "a claim is filed",
      },
    ]);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].kind).toBe("temporal_leak");
  });
});

describe("checkPolicies", () => {
  it("detects claims/SIU contradiction from sample JSON", () => {
    const policies = parsePoliciesJson(`[
      {
        "id": "uw-1",
        "kind": "must",
        "subject": "the claim",
        "action": "be paid",
        "when": "coverage confirmed"
      },
      {
        "id": "uw-2",
        "kind": "must_not",
        "subject": "the claim",
        "action": "be paid",
        "when": "SIU hold"
      }
    ]`);

    const result = checkPolicies(policies);
    expect(result.hasConflict).toBe(true);
    expect(result.conflicts[0].kind).toBe("direct_contradiction");
  });
});
