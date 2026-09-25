export function validateEmbeddingDimension(values: number[], expectedDimension: number): number[] {
  if (values.length !== expectedDimension) {
    throw new Error(
      `[ERR_GEMINI_EMBEDDING_DIMENSION] Gemini returned ${values.length} dimensions; expected ${expectedDimension}.`
    );
  }
  return values;
}
