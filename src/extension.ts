import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import {
  checkPolicies,
  parsePoliciesJson,
  type PolicyConflict,
} from "./policyEngine";
import { demoScenarios } from "./scenarios";
import { splitShapesAndData, validateShacl } from "./shaclValidator";

let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext): void {
  diagnosticCollection =
    vscode.languages.createDiagnosticCollection("ontoguard");
  context.subscriptions.push(diagnosticCollection);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "ontoguard.checkPolicies",
      () => runPolicyCheck()
    ),
    vscode.commands.registerCommand(
      "ontoguard.validateShacl",
      () => runShaclValidation()
    ),
    vscode.commands.registerCommand("ontoguard.runDemo", () => runDemo()),
    vscode.commands.registerCommand("ontoguard.clearDiagnostics", () => {
      diagnosticCollection.clear();
      void vscode.window.showInformationMessage("OntoGuard diagnostics cleared.");
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (doc.languageId === "json" && doc.fileName.endsWith(".policies.json")) {
        void runPolicyCheck(doc);
      }
    })
  );
}

export function deactivate(): void {
  diagnosticCollection?.dispose();
}

async function runPolicyCheck(
  document?: vscode.TextDocument
): Promise<void> {
  const doc = document ?? vscode.window.activeTextEditor?.document;
  if (!doc) {
    void vscode.window.showWarningMessage("Open a .policies.json file first.");
    return;
  }

  let policies;
  try {
    policies = parsePoliciesJson(doc.getText());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`OntoGuard: ${message}`);
    return;
  }

  const result = checkPolicies(policies);
  const diagnostics: vscode.Diagnostic[] = [];

  for (const conflict of result.conflicts) {
    diagnostics.push(conflictToDiagnostic(doc, conflict));
  }

  diagnosticCollection.set(doc.uri, diagnostics);

  if (!result.hasConflict) {
    void vscode.window.showInformationMessage(
      "OntoGuard: no structural conflicts found."
    );
    return;
  }

  const summary = result.conflicts
    .map((c) => `[${c.kind}] ${c.reason}`)
    .join("\n\n");

  const channel = getOutputChannel();
  channel.clear();
  channel.appendLine("OntoGuard — Policy Consistency Check");
  channel.appendLine("(Structural checks — not a formal prover)");
  channel.appendLine("");
  channel.appendLine(summary);
  channel.show(true);

  void vscode.window.showWarningMessage(
    `OntoGuard: ${result.conflicts.length} conflict(s) found. See Problems panel.`
  );
}

function conflictToDiagnostic(
  doc: vscode.TextDocument,
  conflict: PolicyConflict
): vscode.Diagnostic {
  const targetId = conflict.policyA.id;
  const text = doc.getText();
  const idPattern = new RegExp(
    `"id"\\s*:\\s*"${escapeRegExp(targetId)}"`,
    "m"
  );
  const match = idPattern.exec(text);
  const startOffset = match?.index ?? 0;
  const start = doc.positionAt(startOffset);
  const end = doc.positionAt(startOffset + (match?.[0].length ?? 1));
  const range = new vscode.Range(start, end);

  const severity =
    conflict.kind === "direct_contradiction"
      ? vscode.DiagnosticSeverity.Error
      : vscode.DiagnosticSeverity.Warning;

  const diagnostic = new vscode.Diagnostic(
    range,
    conflict.reason,
    severity
  );
  diagnostic.source = "OntoGuard";
  diagnostic.code = conflict.kind;
  return diagnostic;
}

async function runShaclValidation(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showWarningMessage("Open a Turtle (.ttl) file first.");
    return;
  }

  const doc = editor.document;
  const text = doc.getText();
  let shapesTurtle: string;
  let dataTurtle: string;

  const split = splitShapesAndData(text);
  if (split) {
    shapesTurtle = split.shapesTurtle;
    dataTurtle = split.dataTurtle;
  } else {
    const sibling = await findSiblingDataFile(doc.uri.fsPath);
    if (!sibling) {
      void vscode.window.showErrorMessage(
        "OntoGuard: put `# --- SHAPES ---` and `# --- DATA ---` markers in the file, " +
          "or add a sibling `*.data.ttl` next to your shapes file."
      );
      return;
    }
    shapesTurtle = text;
    dataTurtle = sibling;
  }

  const result = await validateShacl(shapesTurtle, dataTurtle);
  const diagnostics: vscode.Diagnostic[] = [];

  if (!result.conforms) {
    const range = new vscode.Range(0, 0, 0, Number.MAX_SAFE_INTEGER);
    const diagnostic = new vscode.Diagnostic(
      range,
      result.reason,
      vscode.DiagnosticSeverity.Error
    );
    diagnostic.source = "OntoGuard";
    diagnostic.code = "shacl_violation";
    diagnostics.push(diagnostic);
  }

  diagnosticCollection.set(doc.uri, diagnostics);

  const channel = getOutputChannel();
  channel.clear();
  channel.appendLine("OntoGuard — SHACL Validation");
  channel.appendLine("(Constraint checking via rdf-validate-shacl — not a solver)");
  channel.appendLine("");
  channel.appendLine(result.conforms ? "CONFORMS" : "VIOLATION");
  channel.appendLine(result.reason);
  channel.show(true);

  if (result.conforms) {
    void vscode.window.showInformationMessage(
      "OntoGuard: SHACL validation passed."
    );
  } else {
    void vscode.window.showWarningMessage(
      "OntoGuard: SHACL violation detected. See Problems panel."
    );
  }
}

async function findSiblingDataFile(shapesPath: string): Promise<string | null> {
  const dir = path.dirname(shapesPath);
  const base = path.basename(shapesPath, path.extname(shapesPath));
  const candidates = [
    path.join(dir, `${base}.data.ttl`),
    path.join(dir, `${base}-data.ttl`),
    path.join(dir, "data.ttl"),
  ];

  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate, "utf8");
    } catch {
      // try next
    }
  }
  return null;
}

async function runDemo(): Promise<void> {
  const pick = await vscode.window.showQuickPick(
    demoScenarios.map((s) => ({
      label: s.title,
      description: s.id,
      detail: s.plainEnglishSetup,
      scenario: s,
    })),
    { placeHolder: "Pick a demo scenario to validate" }
  );

  if (!pick) {
    return;
  }

  const result = await validateShacl(
    pick.scenario.shapesTurtle,
    pick.scenario.dataTurtle
  );

  const channel = getOutputChannel();
  channel.clear();
  channel.appendLine(`OntoGuard — Demo: ${pick.scenario.title}`);
  channel.appendLine(pick.scenario.plainEnglishSetup);
  channel.appendLine("");
  channel.appendLine(result.conforms ? "CONFORMS" : "VIOLATION");
  channel.appendLine(result.reason);
  channel.appendLine("");
  channel.appendLine(
    "Note: this is SHACL constraint checking on a demo scenario, not a formal prover."
  );
  channel.show(true);

  if (result.conforms) {
    void vscode.window.showInformationMessage(
      `Demo "${pick.scenario.title}": conforms.`
    );
  } else {
    void vscode.window.showWarningMessage(
      `Demo "${pick.scenario.title}": blocked — ${result.reason}`
    );
  }
}

let outputChannel: vscode.OutputChannel | undefined;

function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel("OntoGuard");
  }
  return outputChannel;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
