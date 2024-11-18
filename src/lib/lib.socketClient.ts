import type { topic, message, Message } from "../types/types.messaging";

import conf from "../conf";
import { logger } from "../utils";

let socket: WebSocket;

export function initSocketClient(
      port: number,
      rootTopic: string,
      onMessage: (message: Message<topic>) => void,
      hostname: string = conf.hostname,
      protocol: string = conf.socketProtocol,
) {
      const url = `${protocol}://${hostname}:${port}?rootTopic=${rootTopic}`;
      socket = new WebSocket(url);
      return new Promise((resolve, reject) => {
            socket.onopen = () => resolve(true);
            socket.onmessage = ({ data }) => messageProcessor(data, onMessage);
            socket.onerror = (ev: Event) => {
                  reject
                        ? reject(Error(`Socket for ${rootTopic} failed to open`))
                        : logger.error(Error(`Websocket error: ${ev}`));
            };
      });
}
export function send(message: string) {
      socket.send(message);
}
export function postMessage(message: Message) {
      socket.send(JSON.stringify(message));
}
export function closeSocketClient() {
      socket?.close();
}
function messageProcessor(
      _message: message,
      onMessage: (message: Message<topic>) => void,
) {
      const messageString = _message.toString();
      const message = JSON.parse(messageString) as Message<topic>;
      onMessage(message);
}
