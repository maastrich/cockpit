import { CyclicDependencyError } from "../../utils/errors.js";

/**
 * Perform topological sort using Kahn's algorithm.
 * Returns nodes in execution order (dependencies first).
 *
 * @param nodes - Map of node ID to its dependencies
 * @returns Array of node IDs in topological order
 * @throws CyclicDependencyError if a cycle is detected
 */
export function topologicalSort(nodes: Map<string, string[]>): string[] {
  // Calculate in-degree for each node
  const inDegree = new Map<string, number>();
  const graph = new Map<string, string[]>();

  // Initialize
  for (const nodeId of nodes.keys()) {
    inDegree.set(nodeId, 0);
    graph.set(nodeId, []);
  }

  // Build reverse adjacency list (node -> dependents)
  for (const [nodeId, deps] of nodes) {
    for (const dep of deps) {
      // Skip dependencies that aren't in our node set
      if (!nodes.has(dep)) {
        continue;
      }

      // dep -> nodeId (nodeId depends on dep)
      const dependents = graph.get(dep) ?? [];
      dependents.push(nodeId);
      graph.set(dep, dependents);

      // Increment in-degree of nodeId
      inDegree.set(nodeId, (inDegree.get(nodeId) ?? 0) + 1);
    }
  }

  // Find all nodes with no incoming edges
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  const result: string[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    result.push(nodeId);

    // For each dependent of this node
    const dependents = graph.get(nodeId) ?? [];
    for (const dependent of dependents) {
      const newDegree = (inDegree.get(dependent) ?? 1) - 1;
      inDegree.set(dependent, newDegree);

      if (newDegree === 0) {
        queue.push(dependent);
      }
    }
  }

  // Check for cycles
  if (result.length !== nodes.size) {
    const cycle = detectCycle(nodes);
    throw new CyclicDependencyError(cycle);
  }

  return result;
}

/**
 * Detect a cycle in the dependency graph.
 * Uses DFS to find a cycle.
 *
 * @param nodes - Map of node ID to its dependencies
 * @returns Array representing the cycle path
 */
function detectCycle(nodes: Map<string, string[]>): string[] {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(nodeId: string): string[] | null {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const deps = nodes.get(nodeId) ?? [];

    for (const dep of deps) {
      if (!nodes.has(dep)) {
        continue;
      }

      if (!visited.has(dep)) {
        const cycle = dfs(dep);
        if (cycle) {
          return cycle;
        }
      } else if (recursionStack.has(dep)) {
        // Found a cycle
        const cycleStart = path.indexOf(dep);
        return [...path.slice(cycleStart), dep];
      }
    }

    path.pop();
    recursionStack.delete(nodeId);
    return null;
  }

  for (const nodeId of nodes.keys()) {
    if (!visited.has(nodeId)) {
      const cycle = dfs(nodeId);
      if (cycle) {
        return cycle;
      }
    }
  }

  // Shouldn't reach here if we know there's a cycle
  return Array.from(nodes.keys());
}

/**
 * Group nodes into parallel execution levels.
 * Nodes in the same level have no dependencies on each other
 * and can be executed in parallel.
 *
 * @param nodes - Map of node ID to its dependencies
 * @returns Array of arrays, where each inner array is a parallel level
 */
export function getParallelLevels(nodes: Map<string, string[]>): string[][] {
  const levels: string[][] = [];
  const completed = new Set<string>();
  const remaining = new Set(nodes.keys());

  while (remaining.size > 0) {
    const currentLevel: string[] = [];

    // Find all nodes whose dependencies are all completed
    for (const nodeId of remaining) {
      const deps = nodes.get(nodeId) ?? [];
      const allDepsCompleted = deps.every(
        (dep) => !nodes.has(dep) || completed.has(dep)
      );

      if (allDepsCompleted) {
        currentLevel.push(nodeId);
      }
    }

    if (currentLevel.length === 0) {
      // No progress - must have a cycle
      throw new CyclicDependencyError(Array.from(remaining));
    }

    // Move current level to completed
    for (const nodeId of currentLevel) {
      completed.add(nodeId);
      remaining.delete(nodeId);
    }

    levels.push(currentLevel);
  }

  return levels;
}
