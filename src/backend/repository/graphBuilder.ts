import { OBSERVATION_TYPES, NODE_GROUPS, NODE_IDS, DEFAULT_PROJECT } from '../../constants/types';

export interface Observation {
  id: number;
  title: string;
  content: string;
  type: string;
  topic_key?: string;
  project?: string;
  session_id?: string;
  author?: string;
  scope?: string;
  created_at: string;
}

export interface GraphNode {
  id: string;
  name: string;
  val: number;
  group: string;
  color?: string;
  details: Observation;
}

export interface GraphLink {
  source: string;
  target: string;
  value: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  projects: string[];
  allProjects: string[];
  /** Raw observations sorted by created_at DESC (newest first). Used by List view — no frontend filtering needed. */
  observations: Observation[];
}

/**
 * Constructs the graph data structure (nodes and links) from a flat list of observations.
 *
 * ## Link hierarchy
 *
 * | Layer          | Value | Meaning                                              |
 * |----------------|-------|------------------------------------------------------|
 * | Project anchor |  1.0  | Structural — Project linked to SOMA                  |
 * | Type Hub       |  0.8  | Structural — Type Hub linked to Project              |
 * | Observation    |  0.5  | Structural — Observation linked to Type Hub          |
 *
 * ## Project anchoring: star topology
 *
 * Every observation connects to its Type Hub, and every Type Hub connects
 * to its Project node. The force layout clusters related nodes around their type hub,
 * which in turn orbit their project hub.
 *
 * @param observations     - Flat list of observations, expected sorted by created_at ASC.
 * @param allProjects      - Project names to render as cluster nodes (can include empty ones).
 * @param allProjectsInDb  - Complete DB project list (drives the allProjects filter UI).
 * @param rootLabel        - Label for the central root node (default: 'SOMA').
 */
export function buildGraphFromObservations(
  observations: Observation[],
  allProjects: string[],
  allProjectsInDb: string[],
  rootLabel = 'SOMA'
): GraphData {
  const nodes: GraphNode[] = [];
  const linksByPair = new Map<string, GraphLink>();
  const projectNodes = new Set<string>();
  const typeHubNodes = new Set<string>();

  const addLink = (source: string, target: string, value: number): void => {
    const key = `${source}::${target}`;
    const current = linksByPair.get(key);
    if (!current || value > current.value) {
      linksByPair.set(key, { source, target, value });
    }
  };

  // ── Pass 1: Root and project cluster nodes ────────────────────────────────

  nodes.push({
    id: NODE_IDS.ROOT_SOMA,
    name: rootLabel,
    val: 6,
    group: NODE_GROUPS.SOMA_ROOT,
    color: '#ffffff',
    details: {
      id: -1,
      title: 'SOMA Core',
      content: 'Central knowledge repository root.',
      type: OBSERVATION_TYPES.SYSTEM,
      created_at: new Date().toISOString(),
    } as Observation,
  });

  allProjects.forEach((projName) => {
    const projectId = `project-${projName}`;
    projectNodes.add(projName);
    nodes.push({
      id: projectId,
      name: projName.toUpperCase(),
      val: 3,
      group: NODE_GROUPS.PROJECT,
      color: '#7aa2f7',
      details: {
        id: -2,
        title: `Project: ${projName}`,
        content: `Root node for project ${projName}`,
        type: OBSERVATION_TYPES.PROJECT,
        project: projName,
        created_at: new Date().toISOString(),
      } as Observation,
    });

    addLink(NODE_IDS.ROOT_SOMA, projectId, 1);
  });

  // ── Pass 2: Observation nodes ─────────────────────────────────────────────
  // No project→obs links here. Anchoring happens in Pass 4 once session
  // groups are known and we can identify the chronological first per session.

  observations.forEach((obs) => {
    const projName = obs.project || DEFAULT_PROJECT;
    const projectId = `project-${projName}`;

    if (!projectNodes.has(projName)) {
      projectNodes.add(projName);
      nodes.push({
        id: projectId,
        name: projName.toUpperCase(),
        val: 3,
        group: NODE_GROUPS.PROJECT,
        details: {
          id: -2,
          title: `Project: ${projName}`,
          content: `Root node for project ${projName}`,
          type: OBSERVATION_TYPES.PROJECT,
          project: projName,
          created_at: new Date().toISOString(),
        } as Observation,
      });

      addLink(NODE_IDS.ROOT_SOMA, projectId, 1);
    }

    const topicBase = obs.topic_key ? obs.topic_key.split('/')[0].trim() : projName;

    nodes.push({
      id: String(obs.id),
      name: obs.title || `Observation ${obs.id}`,
      val: 1,
      group: topicBase,
      details: { ...obs, project: obs.project || DEFAULT_PROJECT },
    });
  });

  // ── Pass 3: Hub anchoring (Star topology) ──────────────────────────────
  //
  // Every observation connects to its Type Hub, and every Type Hub connects
  // to its Project node. Combined with the session/topic chains above, the
  // force layout clusters related nodes around their type hub, which in turn
  // orbit their project hub.

  for (const obs of observations) {
    const projName = obs.project ?? DEFAULT_PROJECT;
    const typeLabel = obs.type || 'unknown';
    const typeHubId = `type-hub-${projName}-${typeLabel}`;

    // Ensure the Type Hub node exists
    if (!typeHubNodes.has(typeHubId)) {
      typeHubNodes.add(typeHubId);
      nodes.push({
        id: typeHubId,
        name: typeLabel.toUpperCase(),
        val: 2, // Larger than observation (1), smaller than project (3)
        group: NODE_GROUPS.TYPE_HUB,
        details: {
          id: -3,
          title: `Type: ${typeLabel}`,
          content: `Hub for all ${typeLabel} observations in ${projName}`,
          type: NODE_GROUPS.TYPE_HUB,
          project: projName,
          created_at: new Date().toISOString(),
        } as Observation,
      });

      // Link Project -> Type Hub
      addLink(`project-${projName}`, typeHubId, 0.8);
    }

    // Link Type Hub -> Observation
    addLink(typeHubId, String(obs.id), 0.5);
  }

  return {
    nodes,
    links: Array.from(linksByPair.values()),
    projects: Array.from(projectNodes),
    allProjects: allProjectsInDb,
    observations: observations.slice().reverse(),
  };
}
