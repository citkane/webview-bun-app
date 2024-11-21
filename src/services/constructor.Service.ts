import type { child, Constructor, serviceTypes } from ".";

import { auditFilepath, buildJsFileString, logger, stringToTsBlob, LibIpc } from ".";
import { writeFileSync, mkdirSync } from "node:fs";
import * as path from "node:path";
import os from "os";

export class Service<T extends serviceTypes> {
      private serviceArgs: ConstructorParameters<Constructor<any>>;
      child!: child<T>;
      ipc?: InstanceType<typeof LibIpc>;

      constructor(
            private filePath: string,
            type: serviceTypes,
            ...serviceArgs: ConstructorParameters<Constructor<any>>
      ) {
            auditFilepath(filePath);
            this.serviceArgs = serviceArgs;
            this.route(type);
      }
      terminate = (exitCode?: number | NodeJS.Signals) => {
            if (typeof this.child === "string")
                  return logger.warning(Error(`Can't terminate a window process.`));
            switch (true) {
                  case "terminate" in this.child:
                        this.child.terminate();
                        break;

                  case "kill" in this.child:
                        this.child.kill(exitCode);
                        break;
            }
      };
      private route = (type: serviceTypes) => {
            switch (type) {
                  case "childWorker":
                        this.makeChildWorker();
                        break;
                  case "childProcess":
                        this.makeChildProcess();
                        break;
                  case "window":
                        this.makeWindow();
                        break;
            }
      };
      private makeChildProcess = async () => {
            const dir = path.join(os.tmpdir(), "webview-bun-app");
            const tmpFile = path.join(dir, "Main.ts");
            mkdirSync(dir, { recursive: true });
            writeFileSync(tmpFile, this.mainRunString);
            this.child = Bun.spawn(["bun", tmpFile], {
                  ipc: (data: any) => {
                        const { topic, message } = LibIpc.parseSystemMessage(data);
                        //@ts-expect-error
                        this.ipc._dispatchMessage(topic, message);
                  },
                  stdout: "inherit",
            }) as child<T>;
            this.ipc = new LibIpc(this.child as child<"childProcess">);
      };
      private makeChildWorker = () => {
            const runString = this.mainRunString;
            const blob = stringToTsBlob(runString);
            const url = URL.createObjectURL(blob);
            this.child = new Worker(url) as child<T>;
            this.ipc = new LibIpc(this.child as child<"childWorker">);
      };
      private makeWindow = async () => {
            const ARGS = this.args.reduce(
                  (_ARGS, value, i) => {
                        _ARGS[`ARG${i}`] =
                              typeof value === "string" ? value : JSON.stringify(value);
                        return _ARGS;
                  },
                  {} as { [key: string]: string | number },
            );
            this.child = buildJsFileString(
                  this.filePath,
                  true,
                  "inline",
                  ARGS,
            ) as child<T>;
      };

      private get args() {
            return this.serviceArgs.map((arg) => {
                  return arg instanceof String || arg instanceof Number
                        ? arg
                        : JSON.stringify(arg);
            });
      }

      private get mainRunString() {
            return `
		import {Main} from "${this.filePath}";
		const main = new Main(${this.args});
		`;
      }
}
