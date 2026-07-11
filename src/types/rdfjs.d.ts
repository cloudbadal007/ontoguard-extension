declare module "@rdfjs/data-model" {
  import type { DataFactory, Quad, Quad_Graph, Quad_Object, Quad_Predicate, Quad_Subject } from "@rdfjs/types";

  const factory: DataFactory & {
    quad(
      subject: Quad_Subject,
      predicate: Quad_Predicate,
      object: Quad_Object,
      graph?: Quad_Graph
    ): Quad;
  };

  export default factory;
}

declare module "@rdfjs/dataset" {
  import type { DatasetCore, DatasetCoreFactory, Quad } from "@rdfjs/types";

  const factory: DatasetCoreFactory & {
    dataset(quads?: Quad[]): DatasetCore;
  };

  export default factory;
}
