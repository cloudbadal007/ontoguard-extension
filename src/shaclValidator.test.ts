import { describe, expect, it } from "vitest";
import { demoScenarios } from "./scenarios";
import { splitShapesAndData, validateShacl } from "./shaclValidator";

describe("validateShacl demos", () => {
  it.each(demoScenarios)(
    "$id blocking scenario does not conform",
    async (scenario) => {
      const result = await validateShacl(
        scenario.shapesTurtle,
        scenario.dataTurtle
      );
      expect(result.conforms).toBe(false);
      expect(result.reason.length).toBeGreaterThan(0);
    }
  );
});

describe("splitShapesAndData", () => {
  it("splits marked Turtle documents", () => {
    const turtle = `# --- SHAPES ---
@prefix ex: <http://example.org#> .
ex:S a <http://www.w3.org/ns/shacl#NodeShape> .

# --- DATA ---
@prefix ex: <http://example.org#> .
ex:x a ex:Thing .
`;
    const split = splitShapesAndData(turtle);
    expect(split).not.toBeNull();
    expect(split!.shapesTurtle).toContain("NodeShape");
    expect(split!.dataTurtle).toContain("ex:x");
  });
});
