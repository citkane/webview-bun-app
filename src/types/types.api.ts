export type Constructor<T extends abstract new (...args: any) => any = any> = new (
      ...args: any
) => InstanceType<T>;
export type apiInternal = Record<string, Function>;
export type apiFactory = (this: InstanceType<Constructor<any>>) => apiInternal;
export type resolver = {
      resolve: (value: any | PromiseLike<any>) => void;
      reject: (err: any) => void;
};
export type callbackFnc<T = any> = (payload?: T, err?: Error) => void;

export type pong = {
      pong: string;
      ms: number;
};
