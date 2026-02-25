export { expandGlobs, deduplicateMatches, type GlobMatch } from "./glob.js";

export {
  resolveWorkspaces,
  getWorkspace,
  getWorkspacesByTag,
  getAllWorkspaces,
  type WorkspaceContext,
} from "./resolver.js";

export {
  detectWorkspace,
  getEffectiveWorkspace,
  type DetectionResult,
} from "./detector.js";
