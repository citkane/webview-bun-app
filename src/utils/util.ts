import conf from "../conf";

let existsSync: any;

export async function getOpenPort(serverPort?: number) {
      const server = Bun.serve({
            port: serverPort,
            fetch() {
                  return new Response();
            },
      });
      const port = server.port;
      await server.stop(true);
      return port;
}

export function makeHttpUrl(
      port: number,
      protocol = conf.httpProtocol,
      hostname = conf.hostname,
) {
      return new URL(`${protocol}://${hostname}:${port}`);
}
export function makeSocketUrl(
      port: number,
      protocol = conf.socketProtocol,
      hostname = conf.hostname,
) {
      return new URL(`${protocol}://${hostname}:${port}`);
}
export function auditFilepath(filePath: string) {
      existsSync = existsSync || require("node:fs").existsSync;
      if (existsSync(filePath)) return;
      throw Error(
            `${filePath} : File does not exist. Have you provided an absolute path?`,
      );
}
export function toError(error: any) {
      if (typeof error === "object" && !!error.name && !!error.message) return error;
      return Error(error);
}
