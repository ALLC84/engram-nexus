---
description: Protocolo de cierre de sesión. Ejecutar antes de dar la tarea por terminada.
---

# Protocolo de Cierre de Sesión

## Pasos en orden

1. **Verificación final:**
   - `tsc --noEmit` limpio.
   - Sin `any` introducidos.
   - Sin SQL inline fuera de `queries.ts`.

2. **Persistir decisiones tomadas:**
   - `mem_save` para cada decisión arquitectónica, bug fix, o patrón establecido durante la sesión.
   - Usar `project: "engram-nexus"` siempre.
   - Títulos buscables y concretos (ej: `"Fixed clipped tooltips in bottom toolbar"` no `"fix ui"`).

3. **Resumen de sesión:**
   - `mem_session_summary` con: Goal, Discoveries, Accomplished, Relevant Files.
   - Incluir archivos modificados y su rol en el cambio.

4. **Informar al usuario:**
   - Estado final: qué se hizo, qué quedó pendiente si algo.
   - Si hay cambios no commiteados, listar archivos modificados.
