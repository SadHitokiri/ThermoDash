export function connectWs(onMessage: (data: any) => void) {
  console.log('🌐 WS connecting...')

  const socket = new WebSocket('ws://localhost:4000')

  socket.onopen = () => {
    console.log('✅ WS connected')
  }

  socket.onmessage = (event) => {
    onMessage(JSON.parse(event.data))
  }

  socket.onerror = (e) => {
    console.error('❌ WS error', e)
  }

  socket.onclose = () => {
    console.log('🔌 WS closed')
  }
}