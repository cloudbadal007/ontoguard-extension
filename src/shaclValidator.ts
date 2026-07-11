/**
 * Lightweight SHACL validation using rdf-validate-shacl.
 * Same approach as the /ontoguard-live demo — constraint checking, not a solver.
 */

import DataFactory from "@rdfjs/data-model";
import DatasetFactory from "@rdfjs/dataset";
import type { DatasetCore } from "@rdfjs/types";
import { Parser, Store } from "n3";
import SHACLValidator from "rdf-validate-shacl";

export interface ShaclValidationResult {
  conforms: boolean;
  reason: string;
  messages: string[];
}

function parseTurtle(turtle: string, label: string): Store {
  const store = new Store();
  const parser = new Parser({ format: "text/turtle" });

  try {
    store.addQuads(parser.parse(turtle));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse ${label} Turtle: ${message}`);
  }

  return store;
}

function storeToDataset(store: Store): DatasetCore {
  const ds = DatasetFactory.dataset();

  for (const q of store.getQuads(null, null, null, null)) {
    ds.add(DataFactory.quad(q.subject, q.predicate, q.object, q.graph));
  }

  return ds;
}

function messageText(message: unknown): string | undefined {
  if (message == null) {
    return undefined;
  }

  if (Array.isArray(message)) {
    const parts = message
      .map((item) => messageText(item))
      .filter((text): text is string => Boolean(text));
    return parts.length > 0 ? parts.join(" ") : undefined;
  }

  if (typeof message === "string") {
    return message.trim();
  }

  if (typeof message === "object" && "value" in message) {
    const value = (message as { value?: unknown }).value;
    if (typeof value === "string") {
      return value.trim();
    }
  }

  return undefined;
}

export async function validateShacl(
  shapesTurtle: string,
  dataTurtle: string
): Promise<ShaclValidationResult> {
  try {
    if (!dataTurtle.trim()) {
      return {
        conforms: false,
        reason: "Validation error: data graph Turtle input is empty.",
        messages: [],
      };
    }

    if (!shapesTurtle.trim()) {
      return {
        conforms: false,
        reason: "Validation error: shapes graph Turtle input is empty.",
        messages: [],
      };
    }

    const shapes = storeToDataset(parseTurtle(shapesTurtle, "shapes"));
    const data = storeToDataset(parseTurtle(dataTurtle, "data"));
    const validator = new SHACLValidator(shapes);
    const report = await validator.validate(data);

    if (report.conforms) {
      return {
        conforms: true,
        reason: "Action conforms to all SHACL shape constraints.",
        messages: [],
      };
    }

    const messages = Array.from(
      new Set(
        report.results
          .map((result) => messageText(result.message))
          .filter((message): message is string => Boolean(message))
      )
    );

    return {
      conforms: false,
      reason:
        messages.length > 0
          ? messages.join(" ")
          : "Action violates one or more SHACL constraints.",
      messages,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      conforms: false,
      reason: `Validation error: ${message}`,
      messages: [],
    };
  }
}

/**
 * Split a combined Turtle document that uses `# --- SHAPES ---` / `# --- DATA ---`
 * markers, or treat the whole file as shapes when a sibling `*.data.ttl` is used.
 */
export function splitShapesAndData(turtle: string): {
  shapesTurtle: string;
  dataTurtle: string;
} | null {
  const shapesMarker = /#\s*-+\s*SHAPES\s*-+/i;
  const dataMarker = /#\s*-+\s*DATA\s*-+/i;

  const shapesMatch = shapesMarker.exec(turtle);
  const dataMatch = dataMarker.exec(turtle);

  if (!shapesMatch || !dataMatch || shapesMatch.index >= dataMatch.index) {
    return null;
  }

  const shapesStart = shapesMatch.index + shapesMatch[0].length;
  const dataStart = dataMatch.index + dataMatch[0].length;

  return {
    shapesTurtle: turtle.slice(shapesStart, dataMatch.index).trim(),
    dataTurtle: turtle.slice(dataStart).trim(),
  };
}
