import { SocketInterface } from "./index.es";

function socketApi(this: InstanceType<typeof Main>) {
      return {};
}

class Main extends SocketInterface {
      constructor(port: number, rootTopic: string) {
            super(port, rootTopic);
            console.log(rootTopic);
            this.startApiSocket(socketApi, window).then(() => {});
      }
}

//@ts-expect-error
const wba = new Main(ARG0, ARG1);
