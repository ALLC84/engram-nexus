---
description: Guía de mantenimiento de memoria persistente entre sesiones.
---

# Mantenimiento de Memoria (Engram)

## Cuándo guardar

Guardar **inmediatamente** después de cualquiera de estos eventos:
- Decisión de arquitectura tomada (qué enfoque elegimos y por qué).
- Bug fix no obvio (root cause + solución).
- Nuevo patrón o convención establecida.
- Gotcha o edge case descubierto (ej: `overflow-hidden` corta tooltips, mismatch IPC silencioso).
- Cambio de estructura de archivos.

## Formato de mem_save

Usar siempre `project: "engram-nexus"` y el formato estructurado:

```
**What**: descripción concisa de lo que se hizo
**Why**: razón o problema que lo motivó
**Where**: archivos afectados (paths relativos)
**Learned**: gotchas, edge cases, decisiones (omitir si no hay nada extra)
```

## Títulos

Títulos buscables y concretos. El título es lo que aparece en `mem_search`:
- Bien: `"Anti-hairball O(N) chain links"`, `"Fixed tooltip clipping — remove overflow-hidden"`
- Mal: `"fix graph"`, `"update ui"`

## Resumen de sesión

Al cerrar, `mem_session_summary` con al menos:
- **Goal:** una frase.
- **Discoveries:** los hallazgos técnicos más importantes.
- **Accomplished:** tareas completadas con detalle de implementación.
- **Relevant Files:** paths de archivos significativamente modificados.

## Búsqueda antes de implementar

Antes de tocar algo que puede haber sido decidido antes, hacer `mem_search` con palabras clave del dominio. Evitar reinventar decisiones ya tomadas.
