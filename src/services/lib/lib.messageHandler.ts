type handlerContext = InstanceType<typeof SocketClient>;

import {
      type _SYS,
      type handlerSocket,
      type rootTopic,
      type SocketServer,
      type subscriptionTopic,
      $SYS,
      factoryDebug,
      libApi,
      SocketClient,
} from "..";

export function factoryMessageHandler(
      this: handlerContext,
      socket: handlerSocket,
      data: string,
) {
      const debug = factoryDebug.bind(this)(__filename);
      const kind = libApi.getMessageKind(data) as keyof typeof handlers;
      const handlers = {
            request: () => {
                  const reqMessage = libApi.parseMessage<"request">(data);
                  const { params, targ, src, command, uuid } = reqMessage;

                  debug.client.onRequest(command, uuid, src, targ);
                  this.callApiFunction(command, params, src, uuid, socket);
            },
            response: () => {
                  const resMessage = libApi.parseMessage<"response">(data);
                  const { err, res } = resMessage;
                  const resolver = this.mapResolvers.get(resMessage.uuid);

                  this.mapResolvers.delete(resMessage.uuid);
                  !err ? resolver?.resolve(res) : resolver?.reject(err);
            },
            event: () => {
                  const eventMessage = libApi.parseMessage<"event">(data);
                  const { topic } = eventMessage;
                  const callBacks = this.mapCallbacks.get(topic);
                  const size = callBacks?.size || 0;

                  debug.client.onEvent(topic, size);
                  callBacks?.forEach((cb) => this.callCallBack(cb, eventMessage));
            },
            system: () => factorySystemMessage.bind(this)(socket, data, debug),
      };
      return { kind, fn: handlers };
}
function factorySystemMessage(
      this: handlerContext,
      socket: handlerSocket,
      data: string,
      debug: ReturnType<typeof factoryDebug>,
) {
      const sysMessage = libApi.parseMessageSys(data);
      const {
            instruction,
            rootTopic: clientRoot,
            topic: _newTopic,
            port: clientPort,
      } = sysMessage;
      const newTopic = _newTopic as subscriptionTopic;

      const handlers = {
            announce: () => {
                  this.makeTcpSocketClient!(clientRoot as rootTopic, clientPort).catch(
                        (err) => {
                              throw err;
                        },
                  );
            },
            subscribe: () => {
                  debug.server.subscription(clientRoot, newTopic);

                  this.publisher.subscribe(socket, newTopic);
            },
            unsubscribe: () => {
                  debug.server.unSubscription(clientRoot, newTopic);

                  this.publisher.unsubscribe(socket, newTopic);
            },
            register: () => {
                  if (this.debounceRegistration(clientRoot)) return;
                  debug.server.register(clientRoot, clientPort);

                  const newRoot = clientRoot;
                  const newPort = clientPort;

                  this.mapSockets.forEach((registeredSocket, registeredRoot) => {
                        const registeredPort = this.mapPorts.get(registeredRoot)!;

                        this.postString(
                              makeAnnounceString(registeredRoot, registeredPort),
                              socket,
                        );
                        this.postString(
                              makeAnnounceString(newRoot, newPort),
                              registeredSocket,
                        );
                  });

                  this.mapSockets.set(newRoot, socket);
                  this.mapPorts.set(newRoot, newPort);
            },
      };
      return { instruction, fn: handlers };
}

function makeAnnounceString(root: string, port: number) {
      return `${$SYS}.announce.${root}..${port}` as _SYS;
}
