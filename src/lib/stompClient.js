import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

export function createStompClient(baseUrl) {
  const url = baseUrl.replace(/\/$/, '')
  return new Client({
    webSocketFactory: () => new SockJS(`${url}/ws-blueprints`),
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onStompError: (frame) => console.error('[STOMP] error:', frame.headers['message']),
  })
}

export function subscribeBlueprint(client, author, name, onMsg) {
  const topic = `/topic/blueprints.${author}.${name}`
  const sub = client.subscribe(topic, (frame) => {
    try {
      onMsg(JSON.parse(frame.body))
    } catch (e) {
      console.error('[STOMP] parse error:', e)
    }
  })
  return () => sub.unsubscribe()
}
