---
description: Protocolo para resolver bugs sin dar vueltas en círculo.
---

# Protocolo de Debug Sistemático

1. **Reproducir primero.** Documentar los pasos exactos para que el bug aparezca. No tocar código sin haber confirmado el problema.

2. **Aislar la capa:**
   - Bug de datos → revisar `engramRepository.ts` y `queries.ts`. Testear la query en SQLite directamente.
   - Bug de IPC → verificar que ambos lados usen el mismo `IPC_CHANNELS.*` constante. Un mismatch de string silenciosamente descarta el mensaje.
   - Bug de renderizado → revisar el hook que alimenta al componente antes de tocar JSX.
   - Bug de tipos TS → `tsc --noEmit` para ver el error completo con contexto.

3. **Fix mínimo.** Cambiar solo lo necesario para resolver el bug. No refactorizar en el mismo paso.

4. **Verificar:** `tsc --noEmit` limpio después del fix.

5. **Documentar en Engram:**
   - `mem_save` con `type: "bugfix"`: qué falló, por qué, y cómo se resolvió.
   - Especialmente importante para bugs de IPC silenciosos y bugs de CSS (overflow-hidden, z-index).
