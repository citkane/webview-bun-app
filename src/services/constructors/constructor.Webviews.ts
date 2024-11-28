import {
      type callbackFnc,
      type Topic,
      type Ports,
      getOpenPort,
      toError,
      paths,
      SocketInterface,
      Service,
} from "..";
import { SocketServer } from "./constructor.SocketServer";

const serviceFilePath = paths.getAbsolutePath("src/services/service.Webview.ts");

export class Webviews extends SocketServer {
      private handles = 0;

      constructor(ports: Ports, rootTopic: Topic) {
            super(ports, rootTopic);
      }

      protected createWebviewInstance = (rootTopic: Topic) => {
            type publicApi = InstanceType<typeof PublicApi>;

            return new Promise<publicApi>(async (resolve) => {
                  const serviceTcp = await getOpenPort();
                  const ports: Ports = { ...this.ports, ...{ serviceTcp } };
                  const service = new Service<"childProcess">(
                        serviceFilePath,
                        "childProcess",
                        ports,
                        rootTopic,
                  );
                  let publicApi: InstanceType<typeof PublicApi>;

                  service.ipc?.listen("ready", (handle) => {
                        this.handles++;
                        publicApi = new PublicApi(
                              service,
                              handle,
                              rootTopic,
                              this.request,
                              //this.closeSockets,
                        );
                        resolve(publicApi);
                  });
                  service.ipc?.listen("ended", (id) => {
                        this.handles--;
                        if (!this.handles) this.publish("wba/webviews/allClosed");
                        publicApi.close();
                  });
            });
      };
}

class PublicApi {
      private oncloseCallback?: callbackFnc;
      constructor(
            private service: Service<"childProcess">,
            public handle: number,
            private webviewRootTopic: Topic,
            private request: InstanceType<typeof SocketInterface>["request"],
            //private closeSocket: InstanceType<typeof SocketServer>["closeSockets"],
      ) {}

      onclose = (callback: callbackFnc<typeof this.service>) => {
            this.oncloseCallback = callback;
      };
      navigate = (url?: string) => {
            //@ts-expect-error
            return this.request<void, void, void>(this.webviewRootTopic, "navigate", []);
      };
      setTitle = (title: string) => {
            //@ts-expect-error
            return this.request<void, void, void>(this.webviewRootTopic, "setTitle", [
                  title,
            ]);
      };
      run = () => {
            //@ts-expect-error
            return this.request<void, void, void>(this.webviewRootTopic, "run", []);
      };
      close = (exitCode?: number | NodeJS.Signals) => {
            if (this.oncloseCallback)
                  try {
                        this.oncloseCallback(this.service);
                  } catch (error) {
                        this.oncloseCallback(null, toError(error));
                  }
            //this.service.ipc?.send("end");
            this.service.end(exitCode);
      };
}
