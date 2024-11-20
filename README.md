# webview-bun-app


WBA (webview-bun-app) is **ALPHA SOFTWARE**

WBA is a lightweight framework for building cross-platform desktop applications that:
- have a HTML5 graphic user interface (GUI),
- may use modern browser frontend technologies,
- may be multi-process / multi-threaded

WBA runs on [Bun](https://bun.sh/) JS and wraps the binary [webview](https://github.com/webview/webview) browser library.<br>
WBA is opinionated to a [service-oriented](https://en.wikipedia.org/wiki/Service-oriented_architecture) application architecture.<br>
WBA provides an ubiquitous, easy to use [common service interface](#common-service-interface).<br>

**Index:**<br>
[Installation](#installation)<br>
[Quick Start Example](#quick-start-example)<br>
[Multi-Process](#multi-process)<br>
[Common Service Interface](#common-service-interface)<br>
[Topic Architecture](#topic-architecture)<br>
[Service Template](#service-template)<br>
[Why Bun?](#why-bun)<br>
[Credits](#credits)

## Installation:
First, [install Bun](https://bun.sh/docs/installation) for your OS.<br>
Then:
```bash
bun i https://github.com/citkane/webview-bun-app.git

# Run the example application
bun run example
```

## Quick Start Example
```ts
import WebviewBunApp, { Service } from "webview-bun-app";

const wba = await new WebviewBunApp().ready();
const pong = await wba.server.ping();
console.log(pong);

/**
 *  Create webview instances each with an unique root topic.
 *  Each will be running in it's own process
 */
const webview1 = await wba.webview.create("window/1");
const webview2 = await wba.webview.create("window/2");

/** 
 * Set up your webviews
 */
webview1.navigate("your/html1/rootDirectory");
webview2.navigate("your/html2/rootDirectory");
webview1.title("webview 1");
webview2.title("webview 2");

/** 
 * In this example, we want to shut down the whole application if webview1 is closed
 */
webview1.onclose(wba.server.close);

/** 
 * Create a service for your backend business logic
 */
const filePath = "path/to/your/BackendService.ts";
const backendService = new Service(filePath, "childProcess", [
      wba.port,
      ...yourServiceParameters,
]);

/** 
 * Wait for the ready signal from your backend service before running the webviews
 */
backendService.ipc?.listen("ready", () => {
      webview1.run();
      webview2.run();
});

/** 
 * Perform custom logic before your application shuts down,
 *  ie. the common interface server is closing,
 */
wba.subscribe("wba/server/beforeExit", () => {
      webview2.terminate();
      backendService.ipc?.send("end")
});
```

## Multi-Process

When you create a service with the WBA [service template](#service-template), you can choose:
- a "childWorker" (Bun `Worker` thread)
- a "childProcess" (Bun `Spawn` process).  

## Common Service Interface
WBA has an ubiquitous common service interface, regardless of the running scope being in a browser window or the backend. All services can communicate between each other with a normalised interface.

Interface calls are type safe (except for IPC).

Shared process memory is not used, but this possibility is not excluded from future evolutions of WBA.

``` ts
{
    /**
     * Request / Response pattern
     */
    request: (topic: string, parameters: [...Parameters]) => Promise<ReturnType>,

    /**
     * Publish / Subscribe pattern
     */
    publish: (topic: string, value: any),
    subscribe: (topic: string, callback: (value: ReturnType) => void),
    unsubscribe: //the inverse of subscribe

    /**
     * Point to Point pattern
     */
    once: //same as subscribe, but automatically unsubscribes after event consumption.

    /**
     * utilities
     */
    ping: () => Promise<pong>
    ipc?: { //This is a normalised abstraction of the native Bun `Worker | Spawn` ipc.
            //It is useful for bootstrapping services.

        /**
         * type ipcKey = "message" | "error" | "ready" |"ended" |"end",
         */
        listen: (key: ipcKey, callbackFnc: callbackFnc) => void,
        send: (key: ipcKey, value: any)
    }
}
```
## Topic Architecture

WBA topics are:
- type-safe, so your IDE will help you to sift through them and provide you with the return type.
- based on the [MQTT](https://www.hivemq.com/blog/mqtt-essentials-part-5-mqtt-topics-best-practices/) topic architecture.

WBA does not impose a messaging schema, but it is recommended that your topics mirror your service domain schema. Each of your services must have a unique root topic.


Subscribing to a topic can implement the MQTT [wildcard](https://www.hivemq.com/blog/mqtt-essentials-part-5-mqtt-topics-best-practices/#heading-what-are-mqtt-wildcards-and-how-to-use-them-with-topic-subscriptions) logic.

**Example:**

```ts
/**
 * wba = an instance of a WBA webview browser `window` scope with a rootTopic of "window/1"
 * We are interacting with the WBA backend service `contacts`.
 */

import type { SocketInterface } from "webview-bun-app";
declare const wba: InstanceType<SocketInterface>

declare global {
    interface eventTopics: {
        "window/1/contact/updated": contactDetail
    }
}

const contacts = await wba.request("contacts/getContacts", ["all"]) // request all contact details

wba.subscribe("contacts/partners/changed/phoneNumber", (changed) => {
    //a changed partner phone number.
})

wba.subscribe("contacts/+/changed/email", (changed) => {
    //a changed partner, client, employee, etc email.
})

wba.subscribe("contacts/clients/changed/#", (changed) => {
    //a changed client contact detail of any type.
})


form.addEventListener("submit", (e: Event) => {
    e.preventDefault();
    const detail = makeContactDetailFromForm(form);
    wba.publish("window/1/contact/updated", detail);
})
```
 Only one single level wildcard `+` is allowed, and it may not be at the end.<br>
 A multi level wildcard `#` must be at the end, and it may not be combined with a single level wildcard.

 ## Service Template
 As a consumer of WBA, you can create a new service for your application like this:
 ```ts
import WebviewBunApp, { Service } from "webview-bun-app";

const wba = await new WebviewBunApp().ready();

const filePath = "path/to/your/AppService.ts";
const serviceType: "childWorker" | "childProcess" = "childProcess"
const myService = new Service(filePath, serviceType, [wba.port, ...yourServiceParameters]);
 ```

 Your service declaration file, ie. the `"path/to/your/AppService.ts"` file must conform to a specific template format;
 ```ts
 import { SocketInterface, type Topics } from "webview-bun-app";
 declare var self: Worker; //only required if you are creating a "childWorker", ie, a Bun `Worker` scope. 

/**
 * NB!
 * The naming of interfaces `requestTopics` and `eventTopics` must not be changed.
 * `rootTopic` must be declared at the top level, else explicitly passed as `typeof "myApp/phoneBook"` to `Topics`
 */
declare global {
    /**
     * type `Topics` will automatically convert your `socketApi` function to topic types.
     */
    interface requestTopics extends Topics<typeof rootTopic, typeof socketApi> {} 
    interface eventTopics {
        "contacts/partners/changed/phoneNumber" : contactDetail;
        //...etc. as required for your business logic 
    }
}

const rootTopic = "contacts"; //this must be a unique name in your application service stack

/**
 * `socketApi` defines the `request` interface of this service in your application.
 * It must be declared in the exact type form as below.
 */
function socketApi(this: InstanceType<typeof Main>) { 
      return {
            getContacts: (scope: "all" | "clients" | "employees") => {
                  return this.getContacts(scope);
            },
      };
}

/** 
 * The class must be named `Main`, and exported exactly as below
 */
export class Main extends SocketInterface {
    
    constructor(port: number, ...params) {     //The `port` parameter is required
        super(port, rootTopic, process)        //pass either `self` or `process` to `super` depending on 
                                               //if the scope is a "childWorker" or "childProcess" respectively.
        this.startApiSocket(socketApi, this)
            .then(() => {
                this.ipc?.send("ready");       //signal back to the parent process that you are ready.
                this.ipc?.listen("end", ()=>{
                    ...                        //cleanly shut down your service when ended.
                })
                this.init();                   //Initiate your business logic.
            });
    }

    getContacts = (scope: "all" | "clients" | "employees") => {
        return this.request("database/contacts", ["read", scope])
    }

    /**
     * Create the business logic for your service 
     */
    private init(){
        this.subscribe("database/contacts/updated/#", this.changedOnDB)
        this.subscribe("window/+/contacts/updated", this.changedOnFrontend)
    }

    private changedOnDB(detail: contactDetail) {
        this.publish(`contacts/${detail.category}/changed/${detail.type}`, detail);
    }
    private changedOnFrontend(detail: contactDetail) {
        this.request("database/contacts", ["update", detail]).then(()=>{
            this.changedOnDB(detail)
        }).catch((err) => {
            //handle the error
        })
    }
}
 ```
## Why Bun?

I want a simple experience to develop and consume this framework.<br>
Thus I am holding the frontend / backend interface environment to a common language, ie. Typescript.

[Bun](https://bun.sh/) provides the following:
- natively run typescript with jit compilation,
- in-script Ts to ES6 compilation functionality,
- a cross-platform bash interface,
- tools for cross platform binary compilation,
- native HTML server with websocket and native client,
- native backend `Worker` threads and `Spawn` processes with native IPC.  

## Credits:
[webview](https://github.com/webview/webview): Provides the C/C++ webview library<br>
[webview-bun](https://github.com/tr1ckydev/webview-bun): From which I took the Bun JS ffi interface for webview
