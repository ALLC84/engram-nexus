---
scope: shared
---

# Skill: Agent Lock Manager

Gestiona semáforos de bloqueo para evitar conflictos entre agentes durante procesos críticos.

## 🛠 CUÁNDO USARLO

- Antes de iniciar: Tests, migraciones de DB, despliegues o refactorizaciones masivas.
- Al finalizar: Siempre se debe liberar el bloqueo.

## 📥 INPUTS

- `action`: "lock" | "unlock"
- `process_name`: Nombre del proceso (ej. "testing", "deploy", "migration")

## 🚀 EJECUCIÓN (BASH)

````bash
if [ "$action" == "lock" ]; then
  touch ".agents/locks/$process_name.lock"
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] LOCK: $process_name iniciado por $AGENT_NAME" >> .agents/docs/changelog.md
elif [ "$action" == "unlock" ]; then
  rm -f ".agents/locks/$process_name.lock"
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] UNLOCK: $process_name finalizado por $AGENT_NAME" >> .agents/docs/changelog.md
fi

---

### 2. Actualización de `master-instructions.md`

Ahora debemos obligar a los agentes a usar este Skill. Actualiza la sección de **Semáforos** en tu archivo de instrucciones:

**Archivo:** `/.agents/rules/master-instructions.md` (Solo la parte de Semáforos)

```markdown
3. **Semáforos:** Para procesos largos (tests, deploys, refactors), DEBES usar el skill `agent_lock_manager` con la acción `lock` al empezar y `unlock` al terminar. Prohibido editar archivos si existe un `.lock` activo sin permiso explícito del usuario.
````
