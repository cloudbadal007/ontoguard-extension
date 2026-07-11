/**
 * Structural/heuristic policy consistency checks — NOT a full temporal or
 * deontic logic prover. Surfaces direct contradictions and unmatched end
 * conditions in hand-written MUST / MUST NOT policy sets.
 */

export type PolicyKind = "must" | "must_not";

export interface UserPolicy {
  id: string;
  kind: PolicyKind;
  subject: string;
  action: string;
  when: string;
  until?: string;
}

export interface PolicyConflict {
  policyA: UserPolicy;
  policyB: UserPolicy;
  reason: string;
  kind: "direct_contradiction" | "temporal_leak";
}

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: PolicyConflict[];
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

/** Same subject + action with opposing MUST / MUST NOT obligations. */
export function findDirectContradictions(
  policies: UserPolicy[]
): PolicyConflict[] {
  const conflicts: PolicyConflict[] = [];

  for (let i = 0; i < policies.length; i++) {
    for (let j = i + 1; j < policies.length; j++) {
      const a = policies[i];
      const b = policies[j];

      if (
        normalize(a.subject) === normalize(b.subject) &&
        normalize(a.action) === normalize(b.action) &&
        a.kind !== b.kind
      ) {
        const mustPolicy = a.kind === "must" ? a : b;
        const mustNotPolicy = a.kind === "must_not" ? a : b;
        conflicts.push({
          policyA: mustPolicy,
          policyB: mustNotPolicy,
          kind: "direct_contradiction",
          reason:
            `These policies fire on the same subject ("${a.subject}") and action ("${a.action}") ` +
            `with opposing obligations: one says MUST and the other says MUST NOT.`,
        });
      }
    }
  }

  return conflicts;
}

/** Time-bound policy whose until condition is not echoed in any when trigger. */
export function findTemporalLeaks(policies: UserPolicy[]): PolicyConflict[] {
  const conflicts: PolicyConflict[] = [];

  for (const policy of policies) {
    if (!policy.until?.trim()) {
      continue;
    }

    const untilNorm = normalize(policy.until);
    const hasMatchingWhen = policies.some(
      (other) =>
        other.id !== policy.id &&
        (normalize(other.when).includes(untilNorm) ||
          untilNorm.includes(normalize(other.when)))
    );

    if (!hasMatchingWhen) {
      conflicts.push({
        policyA: policy,
        policyB: policy,
        kind: "temporal_leak",
        reason:
          `This policy on "${policy.subject}" (${policy.kind === "must" ? "MUST" : "MUST NOT"} ` +
          `"${policy.action}") has an end condition ("${policy.until}"), but no other policy's ` +
          `trigger condition matches that text. This duty may not actually end when you think it does.`,
      });
    }
  }

  return conflicts;
}

export function checkPolicies(policies: UserPolicy[]): ConflictResult {
  const conflicts = [
    ...findDirectContradictions(policies),
    ...findTemporalLeaks(policies),
  ];
  return { hasConflict: conflicts.length > 0, conflicts };
}

export function parsePoliciesJson(text: string): UserPolicy[] {
  const parsed: unknown = JSON.parse(text);

  if (!Array.isArray(parsed)) {
    throw new Error("Policy file must be a JSON array of policies.");
  }

  return parsed.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Policy at index ${index} must be an object.`);
    }

    const row = item as Record<string, unknown>;
    const kind = row.kind;
    if (kind !== "must" && kind !== "must_not") {
      throw new Error(
        `Policy at index ${index} needs kind "must" or "must_not".`
      );
    }

    for (const field of ["id", "subject", "action", "when"] as const) {
      if (typeof row[field] !== "string" || !String(row[field]).trim()) {
        throw new Error(`Policy at index ${index} needs a non-empty "${field}".`);
      }
    }

    return {
      id: String(row.id),
      kind,
      subject: String(row.subject),
      action: String(row.action),
      when: String(row.when),
      until: typeof row.until === "string" ? row.until : undefined,
    };
  });
}
