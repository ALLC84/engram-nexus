import {
  OBSERVATION_TYPES,
  NODE_GROUPS,
  NODE_IDS,
  SPECIAL_SESSION_IDS,
  DEFAULT_PROJECT,
} from '../../constants/types';

export interface Observation {
  id: number;
  title: string;
  content: string;
  type: string;
  topic_key?: string;
  project?: string;
  session_id?: string;
  author?: string;
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
}

/**
 * Constructs the graph data structure (nodes and links) from a flat list of observations.
 *
 * This function performs three passes:
 * 1. Creates project nodes (clusters).
 * 2. Creates observation nodes and links them to their project.
 * 3. Creates semantic links between observations based on:
 *    - Session ID (same session, same project).
 *    - Topic Key (same topic or sub-topic).
 *    - Type (same type within same project).
 *
 * @param observations - The list of observations to graph.
 * @param allProjects - The list of all available project names (ensures clusters exist even if empty).
 * @param allProjectsInDb - The complete list of all project names in the database (for allProjects field).
 * @param rootLabel - The label for the central root node (default: 'SOMA').
 * @returns The complete graph data object with nodes and links.
 */
export function buildGraphFromObservations(
  observations: Observation[],
  allProjects: string[],
  allProjectsInDb: string[],
  rootLabel = 'SOMA'
): GraphData {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const projectNodes = new Set<string>();

  nodes.push({
    id: NODE_IDS.ROOT_SOMA,
    name: rootLabel,
    val: 4,
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

    links.push({
      source: NODE_IDS.ROOT_SOMA,
      target: projectId,
      value: 1,
    });
  });

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

      links.push({
        source: NODE_IDS.ROOT_SOMA,
        target: projectId,
        value: 1,
      });
    }

    const topicBase = obs.topic_key ? obs.topic_key.split('/')[0].trim() : projName;

    nodes.push({
      id: String(obs.id),
      name: obs.title || `Observation ${obs.id}`,
      val: 1,
      group: topicBase,
      details: { ...obs, project: obs.project || DEFAULT_PROJECT },
    });

    links.push({
      source: projectId,
      target: String(obs.id),
      value: 0.5,
    });
  });

  // Third pass: Chain observations by session, topic, and type (O(N) — no cliques)
  const sessionGroups = new Map<string, Observation[]>();
  const topicGroups = new Map<string, Observation[]>();
  const typeGroups = new Map<string, Observation[]>();

  for (const obs of observations) {
    // Session grouping — skip MANUAL_SAVE
    if (obs.session_id && obs.session_id !== SPECIAL_SESSION_IDS.MANUAL_SAVE) {
      const group = sessionGroups.get(obs.session_id) ?? [];
      group.push(obs);
      sessionGroups.set(obs.session_id, group);
    }

    // Topic grouping — scoped per project to avoid cross-project edges
    if (obs.topic_key) {
      const topicRoot = obs.topic_key.split('/')[0].trim();
      if (topicRoot) {
        const key = `${topicRoot}:${obs.project ?? DEFAULT_PROJECT}`;
        const group = topicGroups.get(key) ?? [];
        group.push(obs);
        topicGroups.set(key, group);
      }
    }

    // Type grouping — scoped per project, rescues orphan nodes
    const typeKey = `${obs.type}:${obs.project ?? DEFAULT_PROJECT}`;
    const typeGroup = typeGroups.get(typeKey) ?? [];
    typeGroup.push(obs);
    typeGroups.set(typeKey, typeGroup);
  }

  // Chain: same session → value 2 (strong temporal signal)
  for (const group of sessionGroups.values()) {
    for (let i = 0; i < group.length - 1; i++) {
      links.push({ source: String(group[i].id), target: String(group[i + 1].id), value: 2 });
    }
  }

  // Chain: same topic root within same project → value 1 (semantic signal)
  for (const group of topicGroups.values()) {
    for (let i = 0; i < group.length - 1; i++) {
      links.push({ source: String(group[i].id), target: String(group[i + 1].id), value: 1 });
    }
  }

  // Chain: same type within same project → value 0.5 (weak structural signal, rescues orphans)
  for (const group of typeGroups.values()) {
    for (let i = 0; i < group.length - 1; i++) {
      links.push({ source: String(group[i].id), target: String(group[i + 1].id), value: 0.5 });
    }
  }

  return { nodes, links, projects: Array.from(projectNodes), allProjects: allProjectsInDb };
}
