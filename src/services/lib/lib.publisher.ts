import type { topic, subscriptionTopic, ws } from ".";

import { logger } from ".";

const subscriptions = new Map<ws, Set<subscriptionTopic>>();
const subscribers = new Map<subscriptionTopic, Set<ws>>();
const rootTopics = new Set<string>();

export const wildcardPlaceholder = "+WILDCARDTOPIC#";
export function onSubscribe(ws: ws, topic: topic) {
      if (!isMqttTopic(topic)) return ws.subscribe(topic);

      const { subscriber, subscription, _topic } = getSubs(
            ws,
            topic as subscriptionTopic,
      );
      subscription ? subscription.add(_topic) : subscriptions.set(ws, new Set([_topic]));
      subscriber
            ? subscriber.add(ws)
            : subscribers.set(topic as subscriptionTopic, new Set([ws]));
}
export function onUnsubscribe(ws: ws, topic: topic) {
      if (!isMqttTopic(topic)) return ws.unsubscribe(topic);
      const { subscriber, subscription, _topic } = getSubs(
            ws,
            topic as subscriptionTopic,
      );
      subscription?.delete(_topic);
      subscriber?.delete(ws);
      if (!subscriber?.size) subscribers.delete(_topic);
}
export function onCloseSocket(ws: ws, code: number, reason: string) {
      if (code >= 1009) logger.error(Error(`Websocket error ${code}: ${reason}`));
      subscriptions.get(ws)?.forEach((topic) => {
            subscribers.get(topic)?.delete(ws);
            if (!subscribers.get(topic)?.size) subscribers.delete(topic);
      });
      subscriptions.delete(ws);
      rootTopics.delete(ws.data.rootTopic);
      logger.info(`Socket for ${ws.data.rootTopic} has closed`);
}
export function onOpenSocket(ws: ws) {
      const { rootTopic } = ws.data;
      rootTopics.forEach((exTopic) => {
            if (exTopic.startsWith(rootTopic))
                  ws.close(
                        4000,
                        `Inappropriate root topic ${rootTopic} conflicts with ${exTopic}`,
                  );
      });
}
export function fanPublish(topic: topic, message: string) {
      const subscriptionTopics = [...subscribers.keys()];
      const mqttTopics = matchesMqttTopics(subscriptionTopics, topic);
      if (!mqttTopics) return;
      mqttTopics.forEach((mqttTopic, i) => {
            if (i === 0 || matchesMqttTopic(mqttTopic, topic)) {
                  message = message.replace(wildcardPlaceholder, mqttTopic);
                  subscribers.get(mqttTopic)?.forEach((ws) => ws.send(message));
            }
      });
}
export function isMqttTopic(topic: topic) {
      return topic.endsWith("/#") || topic.indexOf("+/") > -1;
}

function matchesMqttTopics(
      mqttTopics: subscriptionTopic[],
      topic: topic,
): false | subscriptionTopic[] {
      const mqttTopic = mqttTopics.shift();
      if (mqttTopic === undefined) return false;
      return matchesMqttTopic(mqttTopic, topic)
            ? [mqttTopic, ...mqttTopics]
            : matchesMqttTopics(mqttTopics, topic);
}
function matchesMqttTopic(mqttTopic: subscriptionTopic, topic: topic) {
      const wildMulti = mqttTopic.replace("#", "");
      if (topic.startsWith(wildMulti)) return true;
      const wildSingle = mqttTopic.split("+");
      if (
            (wildSingle[0] === "" || topic.startsWith(wildSingle[0])) &&
            topic.endsWith(wildSingle[1])
      )
            return true;
      return false;
}
function getSubs(ws: ws, topic: subscriptionTopic) {
      const subscription = subscriptions.get(ws);
      const subscriber = subscribers.get(topic as subscriptionTopic);
      return { subscription, subscriber, _topic: topic };
}
