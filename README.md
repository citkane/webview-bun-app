# webview-bun-app

xxxxxxx **ALPHA SOFTWARE** xxxxxxxxx

WBA (webview-bun-app) is a wrapper for [webview](https://github.com/webview/webview) that enables the building of [Bun](https://bun.sh/) based desktop applications which:
- are cross-platform,
- use HTML5 for their graphic user interface (GUI),
- can leverage modern browser frontend technologies.
- can leverage multi core processes
- have a common service interface between processes

## Installation:
```bash
bun i https://github.com/citkane/webview-bun-app.git

# Run the example application
bun run example
```
This ALPHA software requires some OS dependencies for the webview binary to run. This will not always be so.<br>
Please install the dependencies described in the installation instructions for [webview-bun](https://github.com/tr1ckydev/webview-bun/tree/1db3d04?tab=readme-ov-file#installation). 

**Index:**<br>
[Quick Start Example](#quick-start-example)<br>
[Multi-Process](#multi-process)<br>
[Common Service Interface](#common-service-interface)<br>
[Topic Architecture](#topic-architecture)<br>
[Service Template](#service-template)<br>
[Credits](#credits)

## Quick Start Example
```ts
import WebviewBunApp, { Service } from "webview-bun-app";

const wba = await new WebviewBunApp().ready();
const pong = await wba.server.ping();
console.log(pong);

/** Create a service for your backend business logic
 */
const filePath = "path/to/your/BackendService.ts";
const backendService = new Service(filePath, "childProcess", [
      wba.port,
      ...yourServiceParameters,
]);

/** Create webview instances each with an unique root topic.
 *  Each will be running in it's own process (not a worker thread)
 */
const webview1 = await wba.webview.create("window/1");
const webview2 = await wba.webview.create("window/2");

/** In this example, we want to shut down the whole application if webview1 is closed
 */
webview1.onclose(wba.server.close);

/** Set up your webviews
 */
webview1.navigate(/* your html root dir path*/);
webview1.title("webview 1");
webview2.navigate(/* your html root dir path*/);
webview2.title("webview 2");

/** Wait for the ready signal from your backend service before running the webviews
 */
backendService.ipc?.listen("ready", () => {
      webview1.run();
      webview2.run();
});

/** Perform custom logic before your application shuts down,
 *  ie. the common interface server is closing,
 */
wba.subscribe("wba/server/beforeExit", () => {
      webview2.terminate();
      backendService.terminate();
});
```

## Multi-Process
WBA implements a micro-service architecture on localhost. This inherently enables multiprocessing and multithreading.

When you create a service with the WBA [Service template](#service-template), you can choose to create:
- a "childWorker" (Bun `Worker` thread)
- a "childProcess" (Bun `Spawn` process).  

## Common Service Interface
WBA has an ubiquitous common service interface, regardless of a service scope being in a browser window or the backend. All services can communicate between each other with a normalised interface.

Shared process memory is not used, but this possibility is not excluded from future evolutions of WBA.

``` ts
{
    /** Request / Response pattern
     */
    request: (topic: string, parameters: [Parameters<topic>]) => Promise<ReturnType<topic>>,

    /** Publish / Subscribe pattern
     */
    publish: (topic: string, value: any),
    subscribe: (topic: string, callback: (value: ReturnType<topic>) => void),
    unsubscribe: //the inverse of subscribe

    /** Point to Point pattern
     */
    once: //same as subscribe, but automatically unsubscribes after event consumption.

    /** utilities
     */
    ping: () => Promise<pong>
    ipc?: { // normalised abstraction of the native Bun `Worker | Spawn` ipc - useful for bootstrapping 
        type ipcKey = "message" | "error" | "ready" |"ended" |"end",
        listen: (key: ipcKey, callback: (value: any) => void) => void,
        send: (key: ipcKey, value: any)
    }
}
```
## Topic Architecture

WBA topics are:
- type-safe, so your IDE will help you to sift through them, and provide the return type. 
- based on the [MQTT](https://www.hivemq.com/blog/mqtt-essentials-part-5-mqtt-topics-best-practices/) topic architecture, so multi and single-level subscriptions are possible.

WBA does not impose a messaging schema, but it it is recommended that topics mirror your service domain schema. Each of your services must have a unique root topic.


Subscribing to a topic may implement the MQTT [wildcard](https://www.hivemq.com/blog/mqtt-essentials-part-5-mqtt-topics-best-practices/#heading-what-are-mqtt-wildcards-and-how-to-use-them-with-topic-subscriptions) logic:

**Example:**

```ts
/**
 * wba = your instance of a WBA Service, in a frontend window scope with a rootTopic of "window/1"
 * We are interacting with the `contacts` backend service
 */

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
 As a consumer of WBA, you will create a new service for your application like this:
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
 * `socketApi` defines the `request` interface for this service in your application.
 * It must be declared in the exact type form as below, ie. (this: InstanceType<Constructor>) => Record<string, Function>
 */
function socketApi(this: InstanceType<typeof Main>) { 
      return {
            getContacts: (scope: "all" | "clients" | "employees") => {
                  return this.getContacts(scope);
            },
      };
}

/** 
 * The class must be called `Main`, and exported exactly as below
 */
export class Main extends SocketInterface {
    
    constructor(port: number, ...params) {   //The `port` parameter is required
        super(port, rootTopic, process)      //pass either `self` or `process` to `super` depending on 
                                             //if the scope is a "childWorker" or "childProcess" respectively.
        this.startApiSocket(socketApi, this)
            .then(() => {
                this.ipc?.send("ready");     //signal back to the parent process that you are ready.
                this.init();                 //Your service is now ready for business
            });
    }

    /**
     * Create the business logic for your service 
     */
    private init(){
        this.subscribe("database/contacts/updated/#", this.changedOnDB)
        this.subscribe("window/+/contacts/updated", this.changedOnFrontend)
    }
    getContacts = (scope: "all" | "clients" | "employees") => {
        return this.request("database/contacts", ["read", scope])
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

## Credits:
[webview](https://github.com/webview/webview): Provides the C/C++ webview library<br>
[webview-bun](https://github.com/tr1ckydev/webview-bun): Provides the Bun JS API interface for webview
