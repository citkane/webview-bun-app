import type { ServerWebSocket, Socket } from "bun";

/**
 * @todo Bun tcp readystate is ambiguous. This needs to be checked and normalised with websocket readystate.
 */
export enum socketReadystate {
      "opening",
      "open",
      "closing",
      "closed",
}
export declare namespace handlers {
      /** message received from client */
      type message = (socket: handlerSocket, data: string) => void;
      /** socket opened */
      type open = (socket: handlerSocket) => void;
      /** tcp socket closed */
      type close = (socket: handlerSocket, ev?: CloseEvent) => void;
      type wsClose = (
            ws: ServerWebSocket<SocketData>,
            code: number,
            reason: string,
      ) => void | Promise<void>;
      /** tcp socket ready for more data */
      type drain = (socket: handlerSocket) => void;
      /** server per socket error handler */
      type error = (socket: handlerSocket, error: Error) => void;
      /** client side connection failed */
      type connectError = (socket: handlerSocket, error: Error) => void;
      /** client side connection closed by server */
      type end = (socket: handlerSocket) => void;
      /** client side connection timed out */
      type timeout = (socket: handlerSocket) => void;
}

export type SocketData = {
      rootTopic: string;
      targetTopic: string;
      context: "client" | "server";
      kind: "web" | "tcp";
      port: number;
};
export type tcpSocket = Socket<SocketData>;
export type handlerSocket =
      | Socket<SocketData>
      | (WebSocket & { data?: SocketData })
      | ServerWebSocket<SocketData>;
