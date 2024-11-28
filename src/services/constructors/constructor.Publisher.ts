import {
      type subscriptionTopic,
      type handlerSocket,
      type Topic,
      type Message,
      factoryDebug,
      libSockets,
      logger,
      libApi,
} from "..";

const subscriptions = new Map<handlerSocket, Set<subscriptionTopic>>();
const subscribers = new Map<subscriptionTopic, Set<handlerSocket>>();

const topicRgx = /"topic":"([^"]+)"/;
const replaceTopicRgx = /"topic":"[^"]+"/;
const wildcardPlaceholder = "+WILDCARDTOPIC#";

let debug: ReturnType<typeof factoryDebug>["publisher"];

export class Publisher {
      constructor(protected rootTopic: Topic) {
            debug = factoryDebug.bind(this)(__filename).publisher;
      }

      protected get publisher() {
            return {
                  publish: this.publisherPublish,
                  subscribe: this.publisherSubscribe,
                  unsubscribe: this.publisherUnsubscribe,
                  //socketClosed: this.socketClosed,
                  //registerSocket: this.registerSocket,
            };
      }
      private publisherSubscribe = (socket: handlerSocket, topic: subscriptionTopic) => {
            const subscriptions = getSubscriptions(socket);
            subscriptions.add(topic);

            const subscribers = getSubscribers(topic);
            subscribers.add(socket);
      };
      private publisherUnsubscribe = (
            socket: handlerSocket,
            topic: subscriptionTopic,
      ) => {
            //if (!isWildcardTopic(topic)) return ws.unsubscribe(topic);

            deleteSubscription(socket, topic);
      };
      private socketClosed = (socket: handlerSocket, code: number, reason: string) => {
            if (code >= 1009) logger.error(Error(`Websocket error ${code}: ${reason}`));
            subscriptions.get(socket)?.forEach((topic) => {
                  subscribers.get(topic)?.delete(socket);
                  if (!subscribers.get(topic)?.size) subscribers.delete(topic);
            });
            subscriptions.delete(socket);
            //rootTopics.delete(ws.data.rootTopic);
            //logger.info(`Socket for ${ws.data.rootTopic} has closed`);
      };

      private publisherPublish = (
            message: string | Message<"event">,
            socketToServer?: handlerSocket,
      ) => {
            if (typeof message !== "string") message = JSON.stringify(message);
            if (socketToServer) return libSockets.write(socketToServer, message);

            const topic = message.match(topicRgx)![1] as subscriptionTopic;

            if (!isWildcardTopic(topic)) {
                  const _subscribers = subscribers.get(topic);
                  const size = _subscribers?.size || 0;

                  debug.publish(message, size);
                  return _subscribers?.forEach((socket) => {
                        libSockets.write(socket, message as string);
                  });
            }

            const subscriptionTopics = [...subscribers.keys()];
            const wildcardTopics = getWildcardTopics(subscriptionTopics, topic);

            const wildcardMessage = message.replace(
                  replaceTopicRgx,
                  `"topic":"${wildcardPlaceholder}"`,
            );

            wildcardTopics.forEach((wildcardTopic, i) => {
                  if (i === 0 || matchesWildcardTopic(wildcardTopic, topic)) {
                        message = wildcardMessage.replace(
                              wildcardPlaceholder,
                              wildcardTopic,
                        );
                        subscribers
                              .get(wildcardTopic)
                              ?.forEach((socket) =>
                                    libSockets.write(socket, message as string),
                              );
                  }
            });
      };
}

function getSubscriptions(socket: handlerSocket) {
      return subscriptions.has(socket)
            ? subscriptions.get(socket)!
            : subscriptions.set(socket, new Set()).get(socket)!;
}
function getSubscribers(topic: subscriptionTopic) {
      return subscribers.has(topic)
            ? subscribers.get(topic)!
            : subscribers.set(topic, new Set()).get(topic)!;
}
function deleteSubscription(socket: handlerSocket, topic: subscriptionTopic) {
      const _subscriptions = subscriptions.get(socket);
      const _subscribers = subscribers.get(topic);
      _subscriptions?.delete(topic);
      _subscribers?.delete(socket);
      if (!_subscriptions?.size) subscriptions.delete(socket);
      if (!_subscribers?.size) subscribers.delete(topic);
}

function isWildcardTopic(topic: subscriptionTopic) {
      return topic.endsWith("/#") || topic.indexOf("+/") > -1;
}

function getWildcardTopics(
      wildcardTopics: subscriptionTopic[],
      topic: subscriptionTopic,
): subscriptionTopic[] {
      const wildcardTopic = wildcardTopics.shift();
      if (wildcardTopic === undefined) return [];

      return matchesWildcardTopic(wildcardTopic, topic)
            ? [wildcardTopic, ...wildcardTopics]
            : getWildcardTopics(wildcardTopics, topic);
}
function matchesWildcardTopic(
      wildcardTopic: subscriptionTopic,
      topic: subscriptionTopic,
) {
      const wildMulti = wildcardTopic.replace("#", "");
      if (topic.startsWith(wildMulti)) return true;

      const wildSinglePair = wildcardTopic.split("+");
      const isWildSingle =
            (wildSinglePair[0] === "" || topic.startsWith(wildSinglePair[0])) &&
            topic.endsWith(wildSinglePair[1]);

      return isWildSingle ? true : false;
}
