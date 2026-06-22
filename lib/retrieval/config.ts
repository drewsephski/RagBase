export const RETRIEVAL = {
  /** Initial vector search breadth before neighbor expansion. */
  INITIAL_MATCH_COUNT: 8,
  /** Include this many chunks before/after each matched chunk. */
  ADJACENT_CHUNK_RADIUS: 1,
  /** Max tokens of source passages sent to the model. */
  MAX_CONTEXT_TOKENS: 6000,
  /** When a source has at most this many chunks, send the full document. */
  SMALL_DOC_MAX_CHUNKS: 10,
  /** Max tokens the model may generate (prevents mid-answer cutoffs). */
  MAX_OUTPUT_TOKENS: 4096,
} as const;
