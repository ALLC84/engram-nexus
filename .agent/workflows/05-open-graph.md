---
description: Flujo de apertura del Knowledge Graph — referencia técnica del ciclo completo.
---

# Flujo: Open Knowledge Graph

## Trigger

El usuario abre el panel lateral de Engram Nexus o ejecuta el comando `engram-nexus.openGraph`.

## 1. Inicialización (Backend — `GraphViewProvider.ts`)

- `GraphViewProvider` verifica si ya existe un panel webview activo.
- Si no existe, crea un nuevo `WebviewPanel` cargando assets desde `webview-ui/build/`.
- Recursos cargados con `webview.asWebviewUri()`.

## 2. Carga de datos inicial (Backend → Webview)

- Se establece conexión read-only a `~/.engram/engram.db`.
- `messageHandler.ts` recibe el primer `fetchData` del webview y delega a `engramRepository.getGraphData()`.
- El repo ejecuta la query de `queries.buildGraphDataQuery()` con filtros vacíos y límite `nexus.maxNodes` (default: 100).
- Resultado enviado via `postMessage` con channel `IPC_CHANNELS.DATA_LOADED`.

## 3. Renderizado inicial (Webview — `NetworkGraph.tsx`)

- `useGraphData` hook recibe el evento `dataLoaded` y actualiza el estado.
- `NetworkGraph` renderiza el grafo force-directed con nodos coloreados por tipo.
- `useSmartCamera` ajusta fuerzas D3 y ejecuta `zoomToFit()` tras un delay para que la física se asiente.

## 4. Ciclo de interacción (IPC)

| Acción del usuario | Webview envía | Backend responde |
|---|---|---|
| Búsqueda de texto | `IPC_CHANNELS.SEARCH` | `IPC_CHANNELS.DATA_LOADED` |
| Cambio de filtro/fecha | `IPC_CHANNELS.FETCH_DATA` | `IPC_CHANNELS.DATA_LOADED` |
| "Show Trail" en nodo | `IPC_CHANNELS.GET_TRAIL` | `IPC_CHANNELS.TRAIL_LOADED` |
| "Inject Context" | `IPC_CHANNELS.INJECT_CONTEXT` | (clipboard, sin respuesta) |
| Apertura de panel | `IPC_CHANNELS.GET_SETTINGS` | `IPC_CHANNELS.SETTINGS_LOADED` |
| Config cambia en VS Code | — | `IPC_CHANNELS.REFRESH_DATA` |

## 5. Puntos críticos

- **IPC silencioso:** Si el channel name no coincide exactamente entre webview y extension, el mensaje se descarta sin error. Siempre usar las constantes de `src/constants/ipc.ts`.
- **Read-only:** Ninguna operación debe escribir en la base de datos.
- **maxNodes:** El límite de observaciones es configurable (`nexus.maxNodes`, 10–500). Afecta directamente el rendimiento del grafo.
