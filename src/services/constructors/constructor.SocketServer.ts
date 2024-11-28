import type { TCPSocketListener } from "bun";
import {
      type handlers,
      type SocketData,
      type handlerSocket,
      type Ports,
      type _SYS,
      type rootTopic,
      type Topic,
      socketReadystate,
      libTcpSockets,
      logger,
      makeSocketErrorString,
      factoryDebug,
      factoryMessageHandler,
      makeSocketData,
} from "..";
import { SocketClient } from "./constructor.SocketClient";

let debug: ReturnType<typeof factoryDebug>;

export class SocketServer extends SocketClient {
      protected serverTcp: TCPSocketListener<SocketData>;

      constructor(ports: Ports, rootTopic: Topic, child?: Worker | NodeJS.Process) {
            super(ports, rootTopic, child);
            debug = factoryDebug.bind(this)(__filename);

            const onOpen: handlers.open = (socket) => {
                  const port = this.ports.serviceTcp;
                  const root = this.rootTopic;
                  const data = makeSocketData(port, root, "unknown", "server", "tcp");
                  socket.data = data;
            };
            const onError: handlers.error = (socket, err) => {
                  // @todo `err` is resolving as [native code]. Check for bug in Bun
                  const errString = makeSocketErrorString(
                        this.rootTopic,
                        socket.readyState as number,
                        socket.data!,
                  );
                  logger.error(Error(errString));
            };
            const handlers = libTcpSockets.makeHandlers.server(
                  this.onMessageServer,
                  onOpen,
                  undefined,
                  undefined,
                  onError,
            );

            this.serverTcp = libTcpSockets.makeServer(handlers, ports.serviceTcp);

            debug.server.tcpCreated(this.serverTcp);

            this.ipc?.listen("end", (level) => {
                  if (this.isCentralServer && !level) return;
                  this.end();
            });
      }
      protected end = () => {
            this.mapSockets.forEach((socket) => socket.terminate());
            this.socketToServer?.terminate();
            this.serverTcp.stop(true);
            this.serverTcp.unref();

            debug.server.tcpEnded(this.serverTcp);
      };
      private onMessageServer: handlers.message = (socket, data) => {
            // The central server mainly relays pub/sub patterns,
            // but can also relay req/res during bootstrap till many to many relations are established
            const relaySocket = this.isCentralServer && this.getRelaySocket(data);
            if (!!relaySocket) return this.postString(data, relaySocket);

            const handler = factoryMessageHandler.bind(this)(socket, data);
            switch (handler.kind) {
                  case "request":
                        handler.fn.request();
                        break;
                  case "response":
                        handler.fn.response();
                        break;
                  case "event":
                        handler.fn.event();
                        break;
                  case "system":
                        const sys = handler.fn.system();
                        switch (sys.instruction) {
                              case "announce":
                                    sys.fn.announce();
                                    break;
                              case "register":
                                    sys.fn.register();
                                    break;
                              case "subscribe":
                                    sys.fn.subscribe();
                                    break;
                              case "unsubscribe":
                                    sys.fn.unsubscribe();
                        }
            }
      };

      private getRelaySocket(data: string) {
            const isRelay = data.includes(`"targ"`) && data.includes(`"uuid"`);

            if (!isRelay) return false;
            const rootRgx = /"targ":"([^"]+)"/;
            const rootTopic = data.match(rootRgx)![1];
            const socket = this.mapSockets.get(rootTopic);

            if (!!socket) return socket;

            const errorMessage = `no socket for ${rootTopic} found on server ${this.rootTopic}`;
            logger.error(Error(errorMessage));
      }
}

type makeTcpSocketClient = (
      targetTopic: rootTopic,
      port?: number,
) => Promise<void | handlerSocket>;
