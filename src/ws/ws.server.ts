import { WebSocketServer, WebSocket } from 'ws'
import { eventBus } from '../core/eventBus'

const clients = new Set<WebSocket>()

export function initWsServer(server: any) {
  const wss = new WebSocketServer({ server })

  wss.on('connection', (ws) => {
    clients.add(ws)

    ws.on('close', () => {
      clients.delete(ws)
    })
  })

  eventBus.on('telemetry', (data) => {
    const payload = JSON.stringify(data)

    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload)
      }
    }
  })
}