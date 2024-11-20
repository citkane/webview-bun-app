import { dlopen, FFIType } from "bun:ffi";
export function getLibWebviewSymbols(libFilePath: string) {
      const lib = dlopen(libFilePath, {
            webview_create: {
                  args: [FFIType.i32, FFIType.ptr],
                  returns: FFIType.ptr,
            },
            webview_destroy: {
                  args: [FFIType.ptr],
                  returns: FFIType.void,
            },
            webview_run: {
                  args: [FFIType.ptr],
                  returns: FFIType.void,
            },
            webview_terminate: {
                  args: [FFIType.ptr],
                  returns: FFIType.void,
            },
            webview_dispatch: {
                  args: [FFIType.ptr, FFIType.function, FFIType.ptr],
                  returns: FFIType.void,
            },
            webview_get_window: {
                  args: [FFIType.ptr],
                  returns: FFIType.ptr,
            },
            webview_get_native_handle: {
                  args: [FFIType.ptr, FFIType.i32],
                  returns: FFIType.ptr,
            },
            webview_set_title: {
                  args: [FFIType.ptr, FFIType.cstring],
                  returns: FFIType.void,
            },
            webview_set_size: {
                  args: [FFIType.ptr, FFIType.i32, FFIType.i32, FFIType.i32],
                  returns: FFIType.void,
            },
            webview_navigate: {
                  args: [FFIType.ptr, FFIType.cstring],
                  returns: FFIType.void,
            },
            webview_set_html: {
                  args: [FFIType.ptr, FFIType.cstring],
                  returns: FFIType.void,
            },
            webview_init: {
                  args: [FFIType.ptr, FFIType.ptr],
                  returns: FFIType.void,
            },
            webview_eval: {
                  args: [FFIType.ptr, FFIType.ptr],
                  returns: FFIType.void,
            },
            webview_bind: {
                  args: [FFIType.ptr, FFIType.cstring, FFIType.function, FFIType.cstring],
                  returns: FFIType.void,
            },
            webview_unbind: {
                  args: [FFIType.ptr, FFIType.ptr],
                  returns: FFIType.void,
            },
            webview_return: {
                  args: [FFIType.ptr, FFIType.cstring, FFIType.i32, FFIType.cstring],
                  returns: FFIType.void,
            },
      });
      return lib.symbols;
}
