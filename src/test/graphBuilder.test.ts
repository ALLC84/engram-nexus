import { describe, it, expect } from 'vitest';
import { buildGraphFromObservations, type Observation } from '../backend/repository/graphBuilder';
import { NODE_IDS, DEFAULT_PROJECT, NODE_GROUPS } from '../constants/types';

function makeObs(overrides: Partial<Observation> & { id: number }): Observation {
  return {
    title: `Obs ${overrides.id}`,
    content: 'content',
    type: 'learning',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('buildGraphFromObservations', () => {
  it('always includes root SOMA node with id root-soma', () => {
    const { nodes } = buildGraphFromObservations([], [], []);
    const root = nodes.find((n) => n.id === NODE_IDS.ROOT_SOMA);
    expect(root).toBeDefined();
    expect(root?.name).toBe('SOMA');
    expect(root?.val).toBe(6);
  });

  it('uses custom rootLabel for root node name', () => {
    const { nodes } = buildGraphFromObservations([], [], [], 'CUSTOM');
    const root = nodes.find((n) => n.id === NODE_IDS.ROOT_SOMA);
    expect(root?.name).toBe('CUSTOM');
  });

  it('creates project nodes for each entry in allProjects', () => {
    const { nodes } = buildGraphFromObservations([], ['alpha', 'beta'], ['alpha', 'beta']);
    expect(nodes.find((n) => n.id === 'project-alpha')).toBeDefined();
    expect(nodes.find((n) => n.id === 'project-beta')).toBeDefined();
  });

  it('links root to each project node', () => {
    const { links } = buildGraphFromObservations([], ['alpha'], ['alpha']);
    const link = links.find((l) => l.source === NODE_IDS.ROOT_SOMA && l.target === 'project-alpha');
    expect(link).toBeDefined();
    expect(link?.value).toBe(1);
  });

  it('creates a project node for obs without project (DEFAULT_PROJECT)', () => {
    const obs = makeObs({ id: 1 }); // no project field
    const { nodes } = buildGraphFromObservations([obs], [], []);
    const defaultProjectNode = nodes.find((n) => n.id === `project-${DEFAULT_PROJECT}`);
    expect(defaultProjectNode).toBeDefined();
  });

  it('creates an observation node with id = String(obs.id)', () => {
    const obs = makeObs({ id: 42, project: 'nexus' });
    const { nodes } = buildGraphFromObservations([obs], ['nexus'], ['nexus']);
    const obsNode = nodes.find((n) => n.id === '42');
    expect(obsNode).toBeDefined();
    expect(obsNode?.name).toBe('Obs 42');
  });

  describe('Two-tier Hierarchy (Project -> Type Hub -> Observation)', () => {
    it('creates a Type Hub node for observations of a specific type', () => {
      const obs = makeObs({ id: 1, project: 'p', type: 'bugfix' });
      const { nodes } = buildGraphFromObservations([obs], ['p'], ['p']);

      const typeHubId = 'type-hub-p-bugfix';
      const hub = nodes.find((n) => n.id === typeHubId);
      expect(hub).toBeDefined();
      expect(hub?.name).toBe('BUGFIX');
      expect(hub?.group).toBe(NODE_GROUPS.TYPE_HUB);
    });

    it('links Project to Type Hub', () => {
      const obs = makeObs({ id: 1, project: 'p', type: 'bugfix' });
      const { links } = buildGraphFromObservations([obs], ['p'], ['p']);

      const typeHubId = 'type-hub-p-bugfix';
      const link = links.find((l) => l.source === 'project-p' && l.target === typeHubId);
      expect(link).toBeDefined();
      expect(link?.value).toBe(0.8);
    });

    it('links Type Hub to Observation', () => {
      const obs = makeObs({ id: 1, project: 'p', type: 'bugfix' });
      const { links } = buildGraphFromObservations([obs], ['p'], ['p']);

      const typeHubId = 'type-hub-p-bugfix';
      const link = links.find((l) => l.source === typeHubId && l.target === '1');
      expect(link).toBeDefined();
      expect(link?.value).toBe(0.5);
    });

    it('does NOT link Project directly to Observation', () => {
      const obs = makeObs({ id: 1, project: 'p' });
      const { links } = buildGraphFromObservations([obs], ['p'], ['p']);

      const directLink = links.find((l) => l.source === 'project-p' && l.target === '1');
      expect(directLink).toBeUndefined();
    });

    it('creates unique Type Hubs per project and per type', () => {
      const obsP = makeObs({ id: 1, project: 'p', type: 'bugfix' });
      const obsQ = makeObs({ id: 2, project: 'q', type: 'bugfix' });
      const { nodes } = buildGraphFromObservations([obsP, obsQ], ['p', 'q'], ['p', 'q']);

      expect(nodes.find((n) => n.id === 'type-hub-p-bugfix')).toBeDefined();
      expect(nodes.find((n) => n.id === 'type-hub-q-bugfix')).toBeDefined();
    });
  });

  it('allProjects in returned GraphData equals allProjectsInDb', () => {
    const allProjectsInDb = ['a', 'b', 'c'];
    const { allProjects } = buildGraphFromObservations([], ['a'], allProjectsInDb);
    expect(allProjects).toEqual(allProjectsInDb);
  });

  describe('observations field', () => {
    it('returns the input observations in reverse order (newest first)', () => {
      const obs1 = makeObs({ id: 1, created_at: '2024-01-01T00:00:00Z' });
      const obs2 = makeObs({ id: 2, created_at: '2024-02-01T00:00:00Z' });
      const obs3 = makeObs({ id: 3, created_at: '2024-03-01T00:00:00Z' });
      const { observations } = buildGraphFromObservations([obs1, obs2, obs3], [], []);
      expect(observations.map((o) => o.id)).toEqual([3, 2, 1]);
    });

    it('returns empty observations when input is empty', () => {
      const { observations } = buildGraphFromObservations([], [], []);
      expect(observations).toHaveLength(0);
    });

    it('contains only real observations (no structural nodes)', () => {
      const obs = makeObs({ id: 1, project: 'p', type: 'bugfix' });
      const { observations } = buildGraphFromObservations([obs], ['p'], ['p']);
      expect(observations).toHaveLength(1);
      expect(observations[0].id).toBe(1);
    });
  });

  it('no semantic chains are created (session, topic, or type rescue)', () => {
    const obs1 = makeObs({
      id: 1,
      project: 'p',
      session_id: 's1',
      topic_key: 't1',
      type: 'bugfix',
    });
    const obs2 = makeObs({
      id: 2,
      project: 'p',
      session_id: 's1',
      topic_key: 't1',
      type: 'bugfix',
    });
    const { links } = buildGraphFromObservations([obs1, obs2], ['p'], ['p']);

    // Links between observations should be zero
    const interObsLinks = links.filter(
      (l) => (l.source === '1' && l.target === '2') || (l.source === '2' && l.target === '1')
    );
    expect(interObsLinks).toHaveLength(0);
  });
});
