import { describe, it, expect } from 'vitest';
import { buildGraphFromObservations, type Observation } from '../backend/repository/graphBuilder';
import { NODE_IDS, DEFAULT_PROJECT } from '../constants/types';

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

  it('links project to observation', () => {
    const obs = makeObs({ id: 7, project: 'nexus' });
    const { links } = buildGraphFromObservations([obs], ['nexus'], ['nexus']);
    const link = links.find((l) => l.source === 'project-nexus' && l.target === '7');
    expect(link).toBeDefined();
  });

  it('chains obs in same session with value 2', () => {
    const obs1 = makeObs({ id: 1, project: 'p', session_id: 'session-abc' });
    const obs2 = makeObs({ id: 2, project: 'p', session_id: 'session-abc' });
    const obs3 = makeObs({ id: 3, project: 'p', session_id: 'session-abc' });
    const { links } = buildGraphFromObservations([obs1, obs2, obs3], ['p'], ['p']);
    const chain1 = links.find((l) => l.source === '1' && l.target === '2' && l.value === 2);
    const chain2 = links.find((l) => l.source === '2' && l.target === '3' && l.value === 2);
    expect(chain1).toBeDefined();
    expect(chain2).toBeDefined();
  });

  it('excludes manual-save session_id from session chains', () => {
    const obs1 = makeObs({ id: 1, project: 'p', session_id: 'manual-save' });
    const obs2 = makeObs({ id: 2, project: 'p', session_id: 'manual-save' });
    const { links } = buildGraphFromObservations([obs1, obs2], ['p'], ['p']);
    const sessionLink = links.find((l) => l.value === 2);
    expect(sessionLink).toBeUndefined();
  });

  it('chains obs with same topic_key within same project with value 1', () => {
    const obs1 = makeObs({ id: 1, project: 'p', topic_key: 'auth/jwt' });
    const obs2 = makeObs({ id: 2, project: 'p', topic_key: 'auth/oauth' });
    const { links } = buildGraphFromObservations([obs1, obs2], ['p'], ['p']);
    const topicLink = links.find((l) => l.source === '1' && l.target === '2' && l.value === 1);
    expect(topicLink).toBeDefined();
  });

  it('does not create cross-project topic chains', () => {
    const obs1 = makeObs({ id: 1, project: 'projectA', topic_key: 'auth' });
    const obs2 = makeObs({ id: 2, project: 'projectB', topic_key: 'auth' });
    const { links } = buildGraphFromObservations([obs1, obs2], ['projectA', 'projectB'], ['projectA', 'projectB']);
    const topicLink = links.find((l) => l.value === 1 && (
      (l.source === '1' && l.target === '2') || (l.source === '2' && l.target === '1')
    ));
    expect(topicLink).toBeUndefined();
  });

  it('chains obs with same type+project with value 0.5 (semantic, not structural)', () => {
    const obs1 = makeObs({ id: 1, project: 'p', type: 'bugfix', session_id: undefined });
    const obs2 = makeObs({ id: 2, project: 'p', type: 'bugfix', session_id: undefined });
    const { links } = buildGraphFromObservations([obs1, obs2], ['p'], ['p']);
    // project→obs links also have value 0.5, filter by source being obs ids
    const typeChain = links.find(
      (l) => l.source === '1' && l.target === '2' && l.value === 0.5
    );
    expect(typeChain).toBeDefined();
  });

  it('O(N) session chains: N obs in same session produce N-1 links', () => {
    const N = 10;
    const observations = Array.from({ length: N }, (_, i) =>
      makeObs({ id: i + 1, project: 'p', session_id: 'sess-x' })
    );
    const { links } = buildGraphFromObservations(observations, ['p'], ['p']);
    const sessionLinks = links.filter((l) => l.value === 2);
    expect(sessionLinks).toHaveLength(N - 1);
  });

  it('allProjects in returned GraphData equals allProjectsInDb', () => {
    const allProjectsInDb = ['a', 'b', 'c'];
    const { allProjects } = buildGraphFromObservations([], ['a'], allProjectsInDb);
    expect(allProjects).toEqual(allProjectsInDb);
  });
});
