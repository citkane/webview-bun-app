import type { ServerWebSocket, SocketHandler, WebSocketHandler } from "bun";

import {
      type handlers,
      type tcpSocket,
      type SocketData,
      type handlerSocket,
      logger,
} from "..";

class web {
      static makeClient(
            handlers: ReturnType<typeof web.makeClientHandlers>,
            httpPort: number,
            hostname: string,
            protocol: string,
            rootTopic: string,
      ) {
            const url = `${protocol}://${hostname}:${httpPort}?rootTopic=${rootTopic}`;
            const socket = new WebSocket(url);
            socket.onopen = (ev) => {
                  socket.onmessage = (ev) => handlers.message(socket, ev.data.toString());
                  if (handlers.open) handlers.open(socket);
            };
            if (!!handlers.close) {
                  socket.onclose = (ev) => handlers.close!(socket, ev);
            }
            if (handlers.error) {
                  socket.onerror = (ev) => handlers.error!(socket, Error(ev.type));
            }

            return socket;
      }
      static makeServer(
            handlers: ReturnType<typeof web.makeServerHandlers>,
            httpPort: number,
            hostname: string,
      ) {
            return Bun.serve<SocketData>({
                  port: httpPort,
                  hostname: hostname,
                  fetch(req, server) {
                        if (server.upgrade(req)) return undefined;
                  },
                  websocket: handlers as WebSocketHandler<SocketData>,
            });
      }

      static makeServerHandlers(
            onMessage: handlers.message,
            onOpen?: handlers.open,
            onDrain?: handlers.drain,
            onClose?: handlers.wsClose,
            onError?: handlers.error,
      ) {
            return {
                  message: (ws: ServerWebSocket<SocketData>, message: string | Buffer) =>
                        onMessage(ws, message.toString()),
                  open: onOpen,
                  drain: onDrain,
                  close: onClose,
                  error: onError,
            };
      }
      static makeClientHandlers(
            onMessage: handlers.message,
            onOpen?: handlers.open,
            onClose?: handlers.close,
            onError?: handlers.error,
      ) {
            const handlers = {
                  ...web.makeServerHandlers(
                        onMessage,
                        onOpen,
                        undefined,
                        undefined,
                        onError,
                  ),
                  close: onClose,
                  message: onMessage,
            };
            delete handlers["drain"];
            return handlers;
      }
}
class tcp {
      static makeClient(
            handlers: ReturnType<typeof tcp.makeClientHandlers>,
            tcpPort: number,
            hostname = "localhost",
      ) {
            return Bun.connect<SocketData>({
                  hostname,
                  port: tcpPort,
                  socket: handlers,
            });
      }
      static makeServer = (
            handlers: ReturnType<typeof tcp.makeServerHandlers>,
            tcpPort: number,
            hostname = "localhost",
      ) => {
            return Bun.listen<SocketData>({
                  hostname,
                  port: tcpPort,
                  socket: handlers,
            });
      };
      static makeServerHandlers(
            onMessage: handlers.message,
            onOpen: handlers.open = blankHandler,
            onClose: handlers.close = blankHandler,
            onDrain: handlers.drain = blankHandler,
            onError: handlers.error = blankHandler,
      ) {
            return {
                  data: (socket, data) => {
                        tcp.dataParser(data).forEach((message) => {
                              if (!message) return;
                              onMessage(socket, message);
                        });
                  },
                  open: onOpen, // socket opened
                  close: onClose, // socket closed
                  drain: onDrain, // socket ready for more data
                  error: onError, // error handler
            } as SocketHandler<SocketData, "buffer">;
      }
      static makeClientHandlers(
            onMessage: handlers.message,
            onOpen: handlers.open = blankHandler,
            onClose: handlers.close = blankHandler,
            onDrain: handlers.drain = blankHandler,
            onError: handlers.error = blankHandler,
            onConnectError: handlers.connectError = blankHandler,
            onEnd: handlers.end = blankHandler,
            onTimeout: handlers.timeout = blankHandler,
      ) {
            const commonHandlers = tcp.makeServerHandlers(
                  onMessage,
                  onOpen,
                  onClose,
                  onDrain,
                  onError,
            );
            return {
                  ...commonHandlers,
                  ...{
                        connectError: onConnectError, // connection failed
                        end: onEnd, // connection closed by server
                        timeout: onTimeout, // connection timed out
                  },
            } as SocketHandler<SocketData, "buffer">;
      }
      static getWriter(socket: tcpSocket) {
            return (message: string) => socket.write(`${message}${messageSeparator}`);
      }
      private static dataParser(data: Buffer) {
            const messageStrings = data.toString().split(messageSeparator);
            return messageStrings;
      }
}

const messageSeparator = "*";
function blankHandler(socket: handlerSocket, errorOrEvent?: Error | CloseEvent) {}

export const libSockets = {
      write(socket: handlerSocket, message: string) {
            if ("send" in socket) {
                  return socket.send(message);
            }
            if ("write" in socket) {
                  return tcp.getWriter(socket)(message);
            }
            throw Error("Unknown socket type encountered.");
      },
      close(socket?: handlerSocket, reason = "shutting down", code?: number) {
            if (!socket) {
                  const warning = `Trying to close a socket that does not exist.`;
                  return logger.warning(Error(warning)) as void;
            }

            if ("close" in socket) return socket.close(code, reason);
            if ("end" in socket) return socket.end(reason);
      },
};
export const libTcpSockets = {
      makeClient: tcp.makeClient,
      makeServer: tcp.makeServer,
      makeHandlers: {
            client: tcp.makeClientHandlers,
            server: tcp.makeServerHandlers,
      },
};
export const libWebSockets = {
      makeClient: web.makeClient,
      makeServer: web.makeServer,
      makeHandlers: {
            client: web.makeClientHandlers,
            server: web.makeServerHandlers,
      },
};

export function makeSocketData(
      port: number,
      rootTopic: SocketData["rootTopic"],
      targetTopic: SocketData["targetTopic"],
      context: SocketData["context"],
      kind: SocketData["kind"],
) {
      return {
            port,
            rootTopic,
            targetTopic,
            context,
            kind,
      } as SocketData;
}
