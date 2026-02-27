---
description: Protocolo de inicio de tarea. Ejecutar al recibir cualquier nueva instrucción de implementación.
---

# Protocolo de Inicio de Tarea

## Paso 1 — Recuperar contexto de memoria

- `mem_context` para ver sesiones anteriores.
- `mem_search` con palabras clave del dominio si la tarea puede haber sido decidida antes.

## Paso 2 — Clasificar la tarea

| Tipo de tarea | Criterio | Protocolo |
|---|---|---|
| **Feature nueva / bug complejo / refactor multi-archivo** | Toca > 2 archivos, tiene comportamiento nuevo, implica decisión de diseño | → Ir a **Paso 3: SDD** |
| **Tarea menor** | Fix puntual, ajuste de estilo, cambio de texto, corrección de typo | → Ir a **Paso 4: Ejecución directa** |

## Paso 3 — Tareas no triviales: iniciar SDD

Ejecutar `/sdd-init` y asumir el rol de **Orquestador SDD**.

> El Orquestador NUNCA implementa directamente. Coordina sub-agentes, sintetiza sus resultados y consulta al usuario entre fases.

Flujo de fases (en orden):

```
sdd-explore  →  sdd-propose  →  [sdd-spec + sdd-design en paralelo]  →  sdd-tasks  →  sdd-apply  →  sdd-verify  →  sdd-archive
```

**Siempre pasar a cada sub-agente:**
- `artifact_store.mode: engram` — todo se persiste en Engram, no en archivos locales.
- Las convenciones del proyecto (leer `.agent/rules/` y resumirlas como contexto).
- El `project: "engram-nexus"` para todos los `mem_save`.

**Gate obligatorio:** No avanzar a la siguiente fase sin aprobación explícita del usuario.

## Paso 4 — Tareas menores: ejecución directa

1. Leer los archivos afectados antes de modificar nada.
   - Cambios en IPC → revisar `src/constants/ipc.ts` primero.
   - Cambios en UI → revisar si ya existe un primitivo en `webview-ui/src/components/ui/`.
   - Cambios en queries → revisar `src/backend/repository/queries.ts`.
2. Implementar el cambio mínimo necesario.
3. `tsc --noEmit` limpio antes de confirmar.
4. `mem_save` si se tomó alguna decisión no obvia.
