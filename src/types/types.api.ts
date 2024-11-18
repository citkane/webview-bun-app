export type Constructor<T extends abstract new (...args: any) => any = any> = new (
      ...args: any
) => InstanceType<T>;

export type apiFactory = (
      this: InstanceType<Constructor<any>>,
) => Record<string, Function>;

export type resolver = {
      resolve: (value: any | PromiseLike<any>) => void;
      reject: (err: any) => void;
};
export type Topics<R extends string, O extends apiFactory> = {
      [K in keyof ReturnType<O> as JoinedTopic<R, K & string>]: FunctionToTuple<
            JoinedTopic<R, K & string>,
            ReturnType<O>[K]
      >;
};

export type pong = {
      pong: string;
      ms: number;
};

type FunctionToTuple<requestTopics, func extends Function> = func extends (
      ...args: infer params
) => infer returnType
      ? { topic: requestTopics; parameters: params; returnType: returnType }
      : never;

type JoinedTopic<A extends string, K extends string> = `${AddSlashIfNeeded<A>}${K}`;
type AddSlashIfNeeded<A extends string> = A extends `${string}/` ? A : `${A}/`;
