declare module "rdf-validate-shacl" {
  import type { DatasetCore } from "@rdfjs/types";

  interface ValidationResult {
    message: unknown;
    focusNode?: unknown;
  }

  interface ValidationReport {
    conforms: boolean;
    results: ValidationResult[];
  }

  export default class SHACLValidator {
    constructor(shapes: DatasetCore);
    validate(data: DatasetCore): Promise<ValidationReport>;
  }
}
