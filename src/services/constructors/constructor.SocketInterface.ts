import {
      type callbackFnc,
      type eventTopic,
      type Message,
      type subscriptionTopic,
      type pong,
      type Topic,
      type _SYS,
      socketReadystate,
      $SYS,
      factoryDebug,
      LibIpc,
      libApi,
      logger,
      type handlerSocket,
      type UUID,
      type resolver,
      libSockets,
      type Ports,
} from "..";
import { Publisher } from "./constructor.Publisher";

let debug: ReturnType<typeof factoryDebug>["client"];

export class SocketInterface extends Publisher {
      protected mapSockets: Map<string, handlerSocket> = new Map();
      protected mapPorts: Map<string, number> = new Map();
      protected mapCallbacks: Map<subscriptionTopic, Set<callbackFnc>> = new Map();
      protected mapOnceCallbacks: Map<subscriptionTopic, Set<callbackFnc>> = new Map();
      protected mapResolvers: Map<UUID, resolver> = new Map();

      protected socketToServer?: handlerSocket;
      protected ipc?: InstanceType<typeof LibIpc>;

      constructor(
            protected ports: Ports,
            rootTopic: Topic,
            child?: Worker | NodeJS.Process,
      ) {
            super(rootTopic);
            debug = factoryDebug.bind(this)(__filename).client;

            this.ipc = !!child ? new LibIpc(child) : undefined;
      }

      protected get readyState(): socketReadystate {
            /**
             * @todo Bun tcp readystate is ambiguous. This needs to be checked and normalised with websocket readystate.
             */
            return this.isCentralServer
                  ? socketReadystate.open
                  : (this.socketToServer?.readyState as unknown as socketReadystate);
      }
      protected get isCentralServer() {
            return this.ports.serverTcp === this.ports.serviceTcp;
      }

      request = <
            root extends keyof requestTopics,
            command extends keyof requestTopics[root],
            //@ts-expect-error
            returnType = requestTopics[root][command]["returnType"],
      >(
            targetRoot: root,
            command: command,
            //@ts-expect-error
            parameters: requestTopics[root][command]["parameters"],
      ) => {
            //if (this.isEnding) return new Promise<returnType>((r) => r("" as returnType));
            const uuid = crypto.randomUUID();
            const message: Message<"request"> = libApi.makeMessage.request(
                  this.rootTopic,
                  targetRoot as Topic,
                  command as string,
                  parameters as any[],
                  uuid,
            );

            return new Promise<returnType>((resolve, reject) => {
                  if (this.notReady) return reject(this.notReady);

                  this.mapResolvers.set(uuid, { resolve, reject });
                  const socket = this.mapSockets.get(targetRoot) || this.socketToServer;

                  debug.request(message);
                  this.postMessage(message, socket);
            });
      };

      once = <topic extends eventTopic>(topic: topic, callbackFnc: callbackFnc) => {
            if (this.notReady) return logger.error(this.notReady);

            this.getOnceCallbacks(topic).add(callbackFnc);
            this.subscribe(topic, callbackFnc, true);
      };
      subscribe = <topic extends subscriptionTopic>(
            topic: topic,
            callbackFnc: callbackFnc,
            _isOnce = false,
      ) => {
            //if (this.isEnding) return;
            if (this.notReady) return logger.error(this.notReady);

            this.getSubscriptionCallbacks(topic).add(callbackFnc);

            debug.subscribe(_isOnce, topic);
            const sysMessage: _SYS = `${$SYS}.subscribe.${this.rootTopic}.${topic}.0`;
            this.postString(sysMessage);
      };

      unsubscribe = <topic extends subscriptionTopic>(
            topic: topic,
            callbackFnc: callbackFnc,
      ) => {
            //if (this.isEnding) return;
            if (this.notReady) return logger.error(this.notReady);

            this.deleteSubscriptionCallback(topic, callbackFnc);
            const wasOnce = this.deleteOnceCallback(topic, callbackFnc);

            debug.unsubscribe(wasOnce, topic);
            const sysMessage: _SYS = `${$SYS}.unsubscribe.${this.rootTopic}.${topic}.0`;
            this.postString(sysMessage);
      };

      publish = <topic extends eventTopic>(topic: topic, payload?: any) => {
            //if (this.isEnding) return;
            if (this.notReady) return logger.error(this.notReady);

            const message = libApi.makeMessage.event(topic, payload);

            debug.publish(message);
            this.publisher.publish(message, this.socketToServer);
      };
      ping = (rootTopic = this.rootTopic) => {
            return new Promise<pong>((resolve, reject) => {
                  if (this.notReady) return reject(this.notReady);

                  const timeStamp = Date.now();
                  this.request("wba/server", "ping", [])
                        .then((pong) => {
                              pong.ms = pong.ms - timeStamp;
                              resolve(pong);
                        })
                        .catch((err) => reject(err));
            });
      };

      protected getSubscriptionCallbacks(topic: subscriptionTopic) {
            return (
                  this.mapCallbacks.get(topic) ||
                  this.mapCallbacks.set(topic, new Set()).get(topic)!
            );
      }
      protected getOnceCallbacks = (topic: subscriptionTopic) => {
            return (
                  this.mapOnceCallbacks.get(topic) ||
                  this.mapOnceCallbacks.set(topic, new Set()).get(topic)!
            );
      };
      protected deleteOnceCallback = (
            topic: subscriptionTopic,
            callbackFnc: callbackFnc,
      ) => {
            const callBacks = this.mapOnceCallbacks.get(topic);
            const existed = callBacks?.delete(callbackFnc) || false;
            if (!!callBacks && !callBacks.size) this.mapOnceCallbacks.delete(topic);
            return existed;
      };
      protected deleteSubscriptionCallback = (
            topic: subscriptionTopic,
            callbackFnc: callbackFnc,
      ) => {
            const callBacks = this.mapCallbacks.get(topic);
            const existed = callBacks?.delete(callbackFnc) || false;
            if (!!callBacks && !callBacks.size) this.mapCallbacks.delete(topic);
            return existed;
      };

      protected postString = (message: string, socket = this.socketToServer) => {
            return this._post(message, socket);
      };
      protected postMessage = (message: Message<any>, socket = this.socketToServer) => {
            return this.postString(JSON.stringify(message), socket);
      };

      private _post = (message: string, socket = this.socketToServer) => {
            if (!socket) {
                  const errorMessage = `${this.rootTopic}: called write without a socket`;
                  logger.error(Error(errorMessage));
                  return;
            }

            return libSockets.write(socket, message);
      };
      private get notReady() {
            /**
             * @todo Bun tcp readystate is ambiguous. This needs to be checked and normalised with websocket readystate.
             */
            const isReady = this.readyState === socketReadystate.open;
            return isReady
                  ? null
                  : Error(
                          `API was called during invalid socket state: ${socketReadystate[this.readyState]}. Ensure that you have first awaited 'initApiSocket'`,
                    );
      }
}
