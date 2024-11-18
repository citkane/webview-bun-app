import { SocketInterface } from "../constructors/SocketInterface";

//let rootTopic = conf.windowRootTopic;
function socketApi(this: InstanceType<typeof Main>) {
      return {};
}

class Main extends SocketInterface {
      constructor(port: number, rootTopic: string) {
            super(port, rootTopic);
            console.log(rootTopic);
            this.startApiSocket(socketApi, window).then(() => {
                  //this.subscribe("wba/#", () => {});
                  //this.ping().then(console.log);
            });
      }
}

//@ts-expect-error
const wba = new Main(ARG0, ARG1);

export { type Main };
