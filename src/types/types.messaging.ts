import type { ServerWebSocket } from "bun";
import type { UUID } from "crypto";

export type { UUID } from "crypto";
export type message = string | Buffer;
export interface topicMessage {
      topic: requestTopic;
      parameters?: any[];
      returnType?: unknown;
}

export interface Message<T = topic> extends Omit<topicMessage, "topic"> {
      topic: T;
      uuid: UUID;
      payload?: any;
      error?: Error;
}

export type callback<T = any> = (payload?: T, err?: Error) => void;
export interface ws extends ServerWebSocket<unknown> {
      data: { rootTopic: string };
}

/**
 * Subscribing implements the {@link https://www.hivemq.com/blog/mqtt-essentials-part-5-mqtt-topics-best-practices/ | MQTT topic } architecture.
 *
 * A single level wildcard `+`cannot be at the end: `"potential/+/phoneNumbers"`
 *
 * A multi level wildcard `#` must be at the end: `"established/clients/#"`
 *
 * @example ```
 * "potential/partners/phoneNumbers"
 * "potential/+/phoneNumbers"
 * "+/clients/phoneNumbers"
 * "established/clients/#"
 * ```
 */
export type subscriptionTopic = MQTTTopic<eventTopic>;
export type eventTopic = keyof eventTopics;
//| `wba/window/${number}`
//| `wba/window/${number}/${string}`;
export type requestTopic = keyof requestTopics;
export type topic = subscriptionTopic | requestTopic;

type MQTTTopic<T extends string> = T | multiLevelHash<T> | singleLevelPlus<T>;
type getLast<T extends string> = T extends `${string}/${infer Last}` ? getLast<Last> : T;
type getRest<T extends string> = T extends `${string}/${infer Rest}` ? `${Rest}` : never;
type singleLevelPlus<T extends string> = T extends `${infer First}/${infer Rest}`
      ? `${First}/+/${getRest<Rest>}` | `${First}/${singleLevelPlus<Rest>}` | `+/${Rest}`
      : never;
type multiLevelHash<T extends string> = T extends `${infer First}/${getLast<T>}`
      ? `${First}/#` | multiLevelHash<First>
      : never;
