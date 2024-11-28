export const $SYS = "$SYS";

import type { SocketInterface } from "../services";
import type { makeMessage, parseMessageSys } from "../services/lib/lib.api";
import type { apiFactory, Constructor } from "./types.api";
export type { UUID } from "crypto";

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
export type rootTopic = keyof requestTopics;
export type rawMessage = string | Buffer;
export type Message<T extends messageTypes> = ReturnType<(typeof makeMessage)[T]>;
export type sysMessage = Exclude<ReturnType<typeof parseMessageSys>, undefined>;
export type SYS = [
      SYS: typeof $SYS,
      instruction: "subscribe" | "unsubscribe" | "register" | "announce",
      rootTopic: string,
      topic: string,
      port: number,
      net: Record<rootTopic, number>,
];

/** `$SYS.instruction.rootTopic.topic.port` */
export type _SYS<T extends SYS = SYS> = `${T[0]}.${T[1]}.${T[2]}.${T[3]}.${T[4]}`;

//      `$SYS.${"subscribe" | "unsubscribe" | "register" | "announce"}.${rootTopic}.${topic}.${port}`;

export type Topic = string & {
      __brand: "Topic";
};

export type Topics<
      rootTopic extends string,
      factory extends apiFactory = emptyApiFactory,
> = Record<
      rootTopic,
      { [K in keyof ReturnType<factory>]: FunctionToTuple<ReturnType<factory>[K]> }
>;

export type subscribeFn = InstanceType<typeof SocketInterface>["subscribe"];
export type unsubscribeFn = InstanceType<typeof SocketInterface>["unsubscribe"];
export type postString = InstanceType<typeof SocketInterface>["postString"];
export type postMessage = InstanceType<typeof SocketInterface>["postMessage"];

type messageTypes = keyof typeof makeMessage;
type emptyApiFactory = (this: Constructor) => {
      _never: () => void;
};
type MQTTTopic<T extends string> = T | multiLevelHash<T> | singleLevelPlus<T>;
type getLast<T extends string> = T extends `${string}/${infer Last}` ? getLast<Last> : T;
type getRest<T extends string> = T extends `${string}/${infer Rest}` ? `${Rest}` : never;
type singleLevelPlus<T extends string> = T extends `${infer First}/${infer Rest}`
      ? `${First}/+/${getRest<Rest>}` | `${First}/${singleLevelPlus<Rest>}` | `+/${Rest}`
      : never;

type multiLevelHash<T extends string> = T extends `${infer First}/${getLast<T>}`
      ? `${First}/#` | multiLevelHash<First>
      : never;

type FunctionToTuple<func extends Function> = func extends (
      ...args: infer params
) => infer returnType
      ? {
              parameters: params;
              returnType: returnType;
        }
      : {
              parameters: null;
              returnType: null;
        };

//type JoinedTopic<A extends string, K extends string> = `${AddSlashIfNeeded<A>}${K}`;
//type AddSlashIfNeeded<A extends string> = A extends `${string}/` ? A : `${A}/`;
