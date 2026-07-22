# OntoGuard for VS Code

**Catch conflicting business rules before an AI agent (or a human) acts on them.**

OntoGuard is a small VS Code / Cursor extension. You write your rules in a simple file, run a command, and it tells you — in plain English — when those rules fight each other or never really end.

It runs **on your machine**. No account. No cloud. No API key.

---

## Related links

- 📝 Medium — how the underlying firewall was built in 48 hours with Cursor AI: https://medium.com/towards-artificial-intelligence/ontoguard-i-built-an-ontology-firewall-for-ai-agents-in-48-hours-using-cursor-ai-be4208c405e7
- 🧠 ontoguard-ai — the semantic firewall this extension previews, for AI agents acting in production: https://github.com/cloudbadal007/ontoguard-ai
- 🌐 policy-consistency-checker — browser version of the same policy checks: https://github.com/cloudbadal007/policy-consistency-checker
- 🎥 Earlier OntoGuard videos:
  - https://youtu.be/s32Ds_Kq9Ps
  - https://youtu.be/1KKKHRBjBFQ

---

## Why this is needed

Teams write policies like:

- “If coverage is confirmed, the claim **must** be paid.”
- “If SIU has an open investigation, the claim **must not** be paid.”

Both can be true for the **same** case. A person might notice. An AI agent often will not — it may pay anyway.

Other rules say “keep coverage in force **until** the waiting period ends,” but nothing else ever triggers when that happens. The duty quietly continues.

Those mistakes show up late: wrong payments, compliance reviews, angry audits. OntoGuard surfaces them **while you are still editing the rules**.

---

## How it helps

| Problem | What OntoGuard does |
|---------|---------------------|
| Two rules say MUST and MUST NOT for the same thing | Flags a **direct contradiction** |
| A rule has an end date/condition, but nothing matches it | Flags a **temporal leak** (“this duty may not actually end”) |
| SHACL shapes + data that break a constraint | Flags a **SHACL violation** with the rule’s message |

Results appear in:

1. The **Problems** panel (squiggles / errors)
2. The **Output** panel → choose **OntoGuard**

> **Honest limit:** this is a structural / SHACL checker — a fast safety net. It is **not** a full mathematical prover (no cvc5/z3). It catches the common, high-cost mistakes early.

---

## What input you need

You can use **either** of these (or both).

### Option A — Policy file (easiest)

Create a JSON file whose name ends with `.policies.json`  
(example: `underwriting.policies.json`).

Each policy is one object with these fields:

| Field | Required? | Meaning | Example |
|-------|-----------|---------|---------|
| `id` | Yes | Unique name for this rule | `"uw-1"` |
| `kind` | Yes | `"must"` or `"must_not"` | `"must"` |
| `subject` | Yes | Who/what the rule is about | `"the claim"` |
| `action` | Yes | What must (or must not) happen | `"be paid"` |
| `when` | Yes | Trigger condition (plain text) | `"SIU has an open investigation"` |
| `until` | No | When the duty should end | `"the waiting period ends"` |

**Minimal example:**

```json
[
  {
    "id": "uw-1",
    "kind": "must",
    "subject": "the claim",
    "action": "be paid",
    "when": "coverage is confirmed under the policy terms"
  },
  {
    "id": "uw-2",
    "kind": "must_not",
    "subject": "the claim",
    "action": "be paid",
    "when": "SIU has an open investigation"
  }
]
```

Same subject + same action + opposite `kind` → **contradiction**.

If you add `"until": "..."` and no other policy’s `when` matches that text → **temporal leak**.

### Option B — Turtle / SHACL file

Use a `.ttl` file with two sections:

```turtle
# --- SHAPES ---
# (your SHACL shapes here)

# --- DATA ---
# (the instance / action you want to check here)
```

Or put shapes in `rules.ttl` and data in a sibling file named `rules.data.ttl` (or `data.ttl`).

---

## How to use it (step by step)

### 1. Install dependencies and build (developers)

```bash
git clone https://github.com/cloudbadal007/ontoguard-extension.git
cd ontoguard-extension
npm install
npm run compile
```

### 2. Launch the extension

1. Open this folder in **VS Code** or **Cursor**.
2. Press **F5** (or Run → **Start Debugging** → **Run OntoGuard Extension**).
3. A new window opens — the **Extension Development Host**. Use that window for the steps below.

*(Later you can install a `.vsix` package instead of F5. Same commands.)*

### 3. Try a ready-made sample (recommended first)

| File | What you will see |
|------|-------------------|
| `samples/underwriting.policies.json` | Covered claim vs SIU hold **contradiction** |
| `samples/coverage.policies.json` | Coverage/waiting-period conflict + **temporal leak** |
| `samples/conflicting-rules.ttl` | SHACL blocks pay-under-SIU-hold |
| `samples/duty-persists.ttl` | SHACL blocks benefit payment after mid-period lapse |

**Policy sample:**

1. Open `samples/underwriting.policies.json`.
2. Press `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`).
3. Run **OntoGuard: Check Policy Consistency**.
4. Open **View → Problems** and **View → Output → OntoGuard**.

**Tip:** saving any `*.policies.json` file re-runs the policy check automatically.

**SHACL sample:**

1. Open `samples/duty-persists.ttl`.
2. Command Palette → **OntoGuard: Validate SHACL**.
3. Read the violation in Problems / Output.

**No file open?**

1. Command Palette → **OntoGuard: Run Demo Scenario**.
2. Pick a demo (covered vs SIU, benefit that won't stop, or premium refund).
3. Read the result in Output.

### 4. Use it on your own rules

1. Copy a sample file and edit the text to match your domain.
2. Keep the same field names (`id`, `kind`, `subject`, `action`, `when`, optional `until`).
3. Run the matching command again.

---

## Commands (cheat sheet)

| Command | When to use |
|---------|-------------|
| **OntoGuard: Check Policy Consistency** | You have a `.policies.json` file open |
| **OntoGuard: Validate SHACL** | You have a `.ttl` / `.owl` shapes+data file open |
| **OntoGuard: Run Demo Scenario** | You want a one-click demo with no setup |
| **OntoGuard: Clear Diagnostics** | Clear OntoGuard messages from Problems |

You can also **right-click** in the editor:

- On a `.json` file → Check Policy Consistency  
- On a `.ttl` / `.owl` file → Validate SHACL  

---

## What it does *not* do

- It does **not** replace legal review or a formal proof engine.
- It does **not** understand every nuance of natural language — it matches structure (same subject/action, matching `until`/`when` text, SHACL constraints).
- It does **not** send your files anywhere.

---

## License

This project is **open source** under the [MIT License](LICENSE).

You are free to use, copy, modify, and distribute it — including commercially — as long as you keep the copyright and license notice.
