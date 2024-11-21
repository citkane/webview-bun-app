import type {
      topic,
      callback,
      eventTopic,
      Message,
      requestTopic,
      subscriptionTopic,
      UUID,
      Constructor,
      pong,
} from ".";

import { LibIpc, libInterface, libSocketClient, logger, toError } from "./index.es";

const subscriptionCallbacks: Map<subscriptionTopic, Set<callback>> = new Map();
const onceCallbacks: Map<topic, Set<callback>> = new Map();
const requestDeBouncer: Set<UUID> = new Set();

export class SocketInterface {
      private api!: Record<requestTopic, Function>;
      protected ipc?: InstanceType<typeof LibIpc>;
      constructor(
            private port: number,
            private rootTopic: string,
            child?: Worker | NodeJS.Process,
            private isTheRootServer = false,
      ) {
            this.ipc = !!child ? new LibIpc(child) : undefined;
      }

      /**
       * Makes an async API request and awaits the response.
       *
       * @example service.request("serviceRootPath/apiCall": requestTopic, [...[]: requestTopicParameters])
       *  .then((payload: requestTopicReturnType) => {
       *     // ...
       *  })
       *  .catch((err: Error) => throw(err))
       *
       * @returns Promise<requestTopicReturnType | Error>
       *
       */
      request = <topic extends requestTopic>(
            topic: topic,
            parameters: requestTopics[topic]["parameters"],
      ) => {
            type rt = Exclude<requestTopics[topic]["returnType"], undefined>;
            const uuid = crypto.randomUUID();
            const message: Message = { topic, parameters, uuid };

            libSocketClient.postMessage(message);
            logger.debug({ requester: this.rootTopic, message });

            return new Promise<rt>((resolve, reject) => {
                  const callback = (value: any, err?: Error) => {
                        const uniqueFunctionTag = uuid;
                        !!err ? reject(err) : resolve(value);
                  };
                  this._once(topic, callback);
            });
      };

      once = <event extends eventTopic>(topic: event, callback: callback) => {
            const callbacks =
                  onceCallbacks.get(topic) ||
                  onceCallbacks.set(topic, new Set()).get(topic);
            callbacks?.add(callback);
            this.subscribe(topic, callback);
      };
      private _once = this.once as (topic: requestTopic, callback: callback) => void;

      subscribe = <event extends subscriptionTopic>(topic: event, callback: callback) => {
            const callBacks =
                  subscriptionCallbacks.get(topic) ||
                  subscriptionCallbacks.set(topic, new Set()).get(topic);
            callBacks?.add(callback);
            libSocketClient.send(`$subscribe.${this.rootTopic}.${topic}`);
      };

      unsubscribe = <event extends subscriptionTopic>(
            topic: event,
            callback: callback,
      ) => {
            const callBacks = subscriptionCallbacks.get(topic);
            callBacks?.delete(callback);
            if (!callBacks?.size) subscriptionCallbacks.delete(topic);
            libSocketClient.send(`$unsubscribe.${this.rootTopic}.${topic}`);
      };

      publish = <topic extends eventTopic>(
            topic: topic,
            payload?: any,
            //localScope = false,
            //rootTopic = this.rootTopic,
      ) => {
            console.log(this.rootTopic);
            const uuid = crypto.randomUUID();
            const message = { topic, uuid, payload } as Message;
            logger.debug({ publisher: this.rootTopic, message });
            libSocketClient.postMessage!(message);
      };
      ping = (rootTopic = this.rootTopic) => {
            const timeStamp = Date.now();
            return this.request("wba/server/ping", [rootTopic]).then((pong: pong) => {
                  pong.ms = pong.ms - timeStamp;
                  return pong;
            });
      };

      protected startApiSocket(
            apiFactory: (this: InstanceType<Constructor>) => Record<string, Function>,
            serviceThis: InstanceType<Constructor>,
      ) {
            const injectedApi = apiFactory.call(serviceThis);
            libInterface.validateApiObject(this.rootTopic, injectedApi);
            this.api = libInterface.convertToTopicApi(this.rootTopic, injectedApi);
            return libSocketClient
                  .initSocketClient(this.port, this.rootTopic, this.onMessage)
                  .then(this.subscribeTheApi)
                  .catch((err: Error) => {
                        return logger.error(err);
                  });
      }

      private onMessage = (message: Message) => {
            const { topic, uuid, parameters } = message;

            if (this.isTheRootServer && requestDeBouncer.has(uuid))
                  return requestDeBouncer.delete(uuid);
            if (this.isTheRootServer) requestDeBouncer.add(uuid);

            const subscriptionFunctions = subscriptionCallbacks.get(
                  topic as subscriptionTopic,
            );
            switch (true) {
                  case !!this.api[topic as requestTopic]:
                        logger.debug({ receiver: this.rootTopic, apiCall: topic });

                        this.callApiFunction(
                              topic as requestTopic,
                              parameters || [],
                              uuid,
                        );
                        break;
                  case !!subscriptionFunctions:
                        logger.debug({
                              receiver: this.rootTopic,
                              subscriptionsFunctions: topic,
                        });

                        subscriptionFunctions.forEach((callback) =>
                              this.callSubscription(
                                    callback,
                                    message as Message<subscriptionTopic>,
                              ),
                        );
                        break;
            }
      };
      private callSubscription = async (
            callback: callback,
            message: Message<subscriptionTopic>,
      ) => {
            const { topic, payload, error } = message;
            const _onceCallbacks = onceCallbacks.get(topic);
            const once = _onceCallbacks?.has(callback);
            if (once) {
                  this.unsubscribe(topic, callback);
                  _onceCallbacks?.delete(callback);
                  if (!_onceCallbacks?.size) onceCallbacks.delete(topic);
            }
            callback(payload, error);
      };
      private subscribeTheApi = () => {
            Object.keys(this.api).forEach((topic) => {
                  libSocketClient.send(`$subscribe.${this.rootTopic}.${topic}`);
            });
      };
      private callApiFunction = async (
            topic: requestTopic,
            parameters: any[],
            uuid: UUID,
      ) => {
            const apiFunc = this.api![topic];
            let payload: any;
            let message: Message;
            try {
                  payload = apiFunc(...parameters);

                  payload = payload instanceof Promise ? await payload : payload;
                  message = { topic, payload, uuid };
            } catch (error) {
                  message = { topic, error: toError(error), uuid };
            }

            logger.debug({ apiResponder: this.rootTopic, message });
            libSocketClient.postMessage!(message);
      };
}
