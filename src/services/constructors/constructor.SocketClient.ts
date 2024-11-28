import {
      type handlers,
      type handlerSocket,
      type Ports,
      type _SYS,
      type rootTopic,
      type apiFactory,
      type Topic,
      type Message,
      type UUID,
      type Constructor,
      type callbackFnc,
      libTcpSockets,
      libWebSockets,
      conf,
      $SYS,
      factoryDebug,
      logger,
      factoryMessageHandler,
      makeSocketErrorString,
      makeSocketData,
      errorRejection,
      libApi,
} from "..";
import { SocketInterface } from "./constructor.SocketInterface";

let debug: ReturnType<typeof factoryDebug>["client"];

export class SocketClient extends SocketInterface {
      protected apiInternal?: Record<string, Function>;
      private isInitialised = false;

      constructor(
            ports: Ports,
            rootTopic: Topic,
            child?: Worker | NodeJS.Process,
            private hostname: string = conf.hostname,
            private protocol: string = conf.socketProtocol,
      ) {
            super(ports, rootTopic, child);
            debug = factoryDebug.bind(this)(__filename).client;
      }

      protected makeTcpSocketClient(targRoot: rootTopic, port = this.ports.serverTcp) {
            return new Promise<handlerSocket | void>(async (resolve, reject) => {
                  if (this.isCentralServer) return resolve(); // The central server does not need explicit clients

                  const onOpen: handlers.open = (socket) => {
                        if (!this.socketToServer) this.socketToServer = socket;

                        const p: args = [port, this.rootTopic, targRoot, "client", "tcp"];
                        const data = makeSocketData(...p);
                        socket.data = data;
                        resolve(socket);

                        const register: _SYS = `${$SYS}.register.${this.rootTopic}..${this.ports.serverTcp}`;
                        this.postString(register, socket);
                  };
                  const onClose: handlers.close = (socket) => {
                        debug.tcpClosed(socket.data!);
                  };
                  const onError: handlers.error = (socket, err) => {
                        logger.error(err);
                  };
                  const onConnectError: handlers.connectError = (socket, error) => {
                        socket.terminate();
                        reject(error);
                  };
                  const handlers = libTcpSockets.makeHandlers.client(
                        this.onMessageClient,
                        onOpen,
                        onClose,
                        undefined,
                        onError,
                        onConnectError,
                  );
                  libTcpSockets.makeClient(handlers, port).then((client) => {});
            });
      }
      protected makeWebsocketClient(targRoot: rootTopic, port = this.ports.serverHTTP) {
            return new Promise<void>(async (resolve, reject) => {
                  if (this.isCentralServer) return resolve(); // The central server does not need a client

                  const onOpen = (socket: handlerSocket) => {
                        const port = this.ports.serviceTcp;
                        const p: args = [port, this.rootTopic, targRoot, "client", "web"];
                        const data = makeSocketData(...p);

                        socket.data = data;

                        if (!this.socketToServer) this.socketToServer = socket;
                        resolve();
                  };
                  const onClose: handlers.close = (socket) => {};
                  const onError: handlers.error = (socket, err) => {
                        // @todo `err` is resolving as [native code]. Check for bug in Bun
                        const errString = makeSocketErrorString(
                              this.rootTopic,
                              socket.readyState as number,
                              socket.data!,
                        );
                        logger.error(Error(errString));
                  };
                  const handlers = libWebSockets.makeHandlers.client(
                        this.onMessageClient,
                        onOpen,
                        onClose,
                        onError,
                  );
                  this.socketToServer = await libWebSockets.makeClient(
                        handlers,
                        port,
                        this.hostname,
                        this.protocol,
                        this.rootTopic,
                  );
            });
      }
      protected debounceRegistration(clientRoot: string) {
            return this.rootTopic === clientRoot || this.mapSockets.has(clientRoot);
      }
      protected apiInit(
            serviceThis: InstanceType<Constructor>,
            apiFactory: apiFactory | false,
      ) {
            if (!!this.isInitialised) {
                  const errorMessage = `Should not initialise the API more than once: ${this.rootTopic}`;
                  return errorRejection(Error(errorMessage));
            }

            this.apiInternal = libApi.assertApiFactory(apiFactory).call(serviceThis);
            this.isInitialised = true;

            return this.makeTcpSocketClient!("wba/server").catch((err: any) => {
                  logger.error(Error(`${this.rootTopic}: ${err}`));
                  throw err;
            });
      }

      protected callCallBack = (callbackFnc: callbackFnc, message: Message<"event">) => {
            const { topic, payload, err } = message;

            if (this.getOnceCallbacks(topic).has(callbackFnc)) {
                  this.unsubscribe!(topic, callbackFnc);
            }
            callbackFnc(payload, err);
      };

      protected callApiFunction = async (
            command: string,
            parameters: any[],
            responseTarget: Topic,
            uuid: UUID,
            socket: handlerSocket,
      ) => {
            const apiFunc = this.apiInternal![command];

            let payload: any;
            let responseMessage: Message<"response">;
            try {
                  payload = apiFunc(...parameters);
                  payload = payload instanceof Promise ? await payload : payload;
                  responseMessage = libApi.makeMessage.response(
                        responseTarget,
                        payload,
                        uuid,
                  );
            } catch (error) {
                  responseMessage = libApi.makeMessage.response(
                        responseTarget,
                        payload,
                        uuid,
                        error,
                  );
            }

            this.postMessage(responseMessage, socket);
      };
      private onMessageClient: handlers.message = (socket, data) => {
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
}
type args = Parameters<typeof makeSocketData>;
