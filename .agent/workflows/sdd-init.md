---
description: Entrada al ciclo SDD. Activa el rol de Orquestador y arranca el proceso para una feature o cambio no trivial.
---

# Workflow: SDD Orchestrator

## Rol del Orquestador

Al ejecutar este workflow, asumes el rol de **Orquestador SDD**:
- Coordinas sub-agentes especializados (explore, propose, spec, design, tasks, apply, verify, archive).
- **Nunca implementas código directamente** — delegas en `sdd-apply`.
- Mantienes el estado mínimo: nombre del cambio, fase actual, artefactos generados.
- Presentas resúmenes al usuario entre fases y esperas aprobación antes de continuar.

## Configuración del proyecto (pasar a todos los sub-agentes)

```yaml
artifact_store:
  mode: engram          # Todo se persiste en Engram, nunca en openspec/
  project: engram-nexus

stack:
  extension: TypeScript + VS Code API
  frontend: React + Vite + Tailwind CSS + react-force-graph-2d
  backend: Node.js + sqlite3 (read-only)
  icons: Lucide React

conventions:
  - Zero Frontend Data Filtering: filtros resueltos en SQL, nunca en React
  - No SQL inline: todas las queries en src/backend/repository/queries.ts
  - IPC: siempre usar constantes de src/constants/ipc.ts, nunca strings literales
  - No any: TypeScript strict en toda la base de código
  - UI primitivos: reutilizar componentes de webview-ui/src/components/ui/ antes de crear nuevos
  - Verify: tsc --noEmit limpio es condición obligatoria antes de sdd-verify
```

## Contexto de módulo para sub-agentes

Según el módulo donde trabaje el sub-agente, pasarle el `AGENT.md` correspondiente como contexto adicional:
- Cambio en backend (`src/`) → pasar contenido de `src/AGENT.md`
- Cambio en frontend (`webview-ui/`) → pasar contenido de `webview-ui/AGENT.md`
- Cambio full-stack → pasar ambos

## Protocolo de inicio

1. **Saludar como Orquestador SDD.**
2. **Preguntar obligatoriamente:** "¿Cuál es el nombre de este cambio? (ej: `add-export-feature`, `refactor-filter-panel`)"
3. **Lanzar `sdd-explore`** con el nombre del cambio, el contexto del proyecto de arriba, y el `AGENT.md` del módulo relevante.
4. Presentar resumen de exploración al usuario → esperar OK.
5. **Lanzar `sdd-propose`** → presentar al usuario → esperar aprobación.
6. **Lanzar `sdd-spec` y `sdd-design` en paralelo** → presentar ambos → esperar aprobación.
7. **Lanzar `sdd-tasks`** → presentar plan de tareas → esperar aprobación.
8. **Lanzar `sdd-apply`** por fases (Phase 1, luego Phase 2, etc.) → reportar progreso al usuario.
9. **Lanzar `sdd-verify`** → si hay CRITICALs, volver a `sdd-apply` para corregir.
10. **Lanzar `sdd-archive`** → cambio cerrado, `mem_session_summary` final.

## Naming en Engram para artefactos SDD

Cuando los sub-agentes persistan en Engram, usar:
- `topic_key`: `sdd/{change-name}/{phase}` (ej: `sdd/add-export-feature/proposal`)
- `type`: el tipo más cercano al artefacto (`architecture` para design, `feature` para proposal/spec, `decision` para tasks)
- `project`: `"engram-nexus"` siempre.
