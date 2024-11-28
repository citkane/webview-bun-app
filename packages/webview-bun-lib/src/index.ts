import { CString, JSCallback, type Pointer } from "bun:ffi";
import { getLibWebviewSymbols as libWebviewSymbols } from "./ffi";
import { libFileName, toCstring } from "./utils";
import { native_handle_kind, size_hint } from "./types";

const bindCallbacks = new Map<string, JSCallback>();

export { native_handle_kind, size_hint };
export class Webview {
      private lib = libWebviewSymbols(libFileName);
      private handle: Pointer | null;

      /**
       * Creates a new {@link https://github.com/webview/webview | webview} instance.
       *
       * @param debug Enable developer tools if supported by the backend.
       */
      constructor(
            debug: boolean = false,
            private logger = console,
      ) {
            const handle = this.create(debug);
            if (!handle || typeof handle !== "number") {
                  throw Error(handle ? String(handle) : "Webview creation failed");
            }

            this.handle = handle;
            this.setSize(900, 600, size_hint.WEBVIEW_HINT_NONE);
      }

      get id() {
            return this.getWindow();
      }

      /**
       * Get a native handle of choice.
       *
       * @param kind The kind of handle to retrieve.
       * @returns The native handle or NULL.
       */
      getNativeHandle = (
            kind = native_handle_kind.WEBVIEW_NATIVE_HANDLE_KIND_UI_WINDOW,
      ) => {
            return this.lib.webview_get_native_handle(this.handle, kind);
      };

      /**
       * Returns the native handle of the window associated with the webview instance.
       * The handle can be a GtkWindow pointer (GTK), NSWindow pointer (Cocoa) or HWND (Win32).
       * @returns The handle of the native window.
       */
      getWindow = () => {
            return this.lib.webview_get_window(this.handle)!;
      };

      /**
       * Runs the main loop until it's terminated.
       */
      run = () => {
            this.lib.webview_run(this.handle);
            this.destroy();
      };

      /**
       * Updates the size of the native window.
       *
       * Using WEBVIEW_HINT_MAX for setting the maximum window size is not supported with GTK 4
       * because X11-specific functions such as gtk_window_set_geometry_hints were removed.
       * This option has no effect when using GTK 4.
       *
       * @param width
       * @param height
       * @param hint
       */
      setSize = (width: number, height: number, hint: size_hint) => {
            this.lib.webview_set_size(this.handle, width, height, hint);
      };

      /**
       * Updates the title of the native window.
       * @param title
       */
      setTitle = (title: string) => {
            this.lib.webview_set_title(this.handle, toCstring(title));
      };

      /**
       * Navigates webview to the given URL. URL may be a properly encoded data URI.
       *
       * @example
       * webview_navigate("https://github.com/webview/webview");
       * webview_navigate("data:text/html,%3Ch1%3EHello%3C%2Fh1%3E");
       * webview_navigate("data:text/html;base64,PGgxPkhlbGxvPC9oMT4=");
       *
       * @param url
       */
      navigate = (url: string) => {
            this.lib.webview_navigate(this.handle, toCstring(url));
      };

      /**
       * Load HTML content into the webview.
       * @param html
       */
      setHtml = (html: string) => {
            this.lib.webview_set_html(this.handle, toCstring(html));
      };

      /**
       * Injects JavaScript code to be executed immediately upon loading a page.
       * The code will be executed before window.onload.
       *
       * @param js JS content.
       */
      init = (js: string) => {
            this.lib.webview_init(this.handle, toCstring(js));
      };
      /**
       * Binds a function pointer to a new global JavaScript function.
       *
       * Internally, JS glue code is injected to create the JS function by the given name.
       * The callback function is passed a request identifier, a request string and a user-provided argument.
       * The request string is a JSON array of the arguments passed to the JS function.
       *
       * @param name The unique name of the function as it will be named in the browser `window` context
       * @param callBack The function that will be called on the service side.
       * @param userArg An optional C/C++ user argument
       */
      bind = (name: string, callBack: (...args: any) => any, userArg?: string) => {
            if (bindCallbacks.has(name)) {
                  const errMessage = `"${name}" is already a registered bind callback`;
                  return this.logger.error(Error(errMessage));
            }

            const _callBack = async (
                  id: Pointer,
                  argValuesString: string,
            ): Promise<any> => {
                  const argValues: Parameters<typeof callBack> =
                        JSON.parse(argValuesString);
                  try {
                        const result = callBack(...argValues);
                        if (result instanceof Promise) {
                              result.then((result) =>
                                    this.return(id, 0, JSON.stringify(result)),
                              );
                        } else {
                              this.return(id, 0, JSON.stringify(result));
                        }
                  } catch (err) {
                        const result =
                              err instanceof Error ? err : Error(err?.toString());
                        return this.return(id, 1, JSON.stringify(result));
                  }
            };
            const bindCallback = new JSCallback(
                  (_id: Pointer, _argsString: Pointer) => {
                        const argValuesString = _argsString
                              ? new CString(_argsString)
                              : "";
                        _callBack(_id, argValuesString.toString());
                  },
                  {
                        args: ["pointer", "pointer", "pointer"],
                        returns: "void",
                  },
            );
            bindCallbacks.set(name, bindCallback);

            this.lib.webview_bind(
                  this.handle,
                  toCstring(name),
                  bindCallback,
                  userArg ? toCstring(userArg) : null,
            );
      };
      /**
       * Removes a binding created with {@link bind}.
       * @param name
       */
      unbind(name: string) {
            this.lib.webview_unbind(this.handle, toCstring(name));
            bindCallbacks.get(name)?.close();
            bindCallbacks.delete(name);
      }
      private destroy = () => {
            bindCallbacks.forEach((bindId) => this.unbind);
            this.lib.webview_terminate(this.handle);
            this.lib.webview_destroy(this.handle);
            this.handle = null;
      };
      private create = (debug: boolean = false, window?: number) => {
            return this.lib.webview_create(debug ? 1 : 0, window || null);
      };
      private return = (id: Pointer, status: number, result?: string) => {
            this.lib.webview_return(
                  this.handle,
                  id,
                  status,
                  result ? toCstring(result) : null,
            );
      };
}
