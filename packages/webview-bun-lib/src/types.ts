enum native_handle_kind {
      /** Top-level window. GtkWindow pointer (GTK), NSWindow pointer (Cocoa) or HWND (Win32).  */
      WEBVIEW_NATIVE_HANDLE_KIND_UI_WINDOW,
      /** Browser widget. GtkWidget pointer (GTK), NSView pointer (Cocoa) or HWND (Win32).  */
      WEBVIEW_NATIVE_HANDLE_KIND_UI_WIDGET,
      //** Browser controller. WebKitWebView pointer (WebKitGTK), WKWebView pointer (Cocoa/WebKit) or ICoreWebView2Controller pointer (Win32/WebView2). */
      WEBVIEW_NATIVE_HANDLE_KIND_BROWSER_CONTROLLER,
}
enum size_hint {
      /** Width and height are default size.  */
      WEBVIEW_HINT_NONE,
      /** Width and height are minimum bounds. */
      WEBVIEW_HINT_MIN,
      /** Width and height are maximum bounds. */
      WEBVIEW_HINT_MAX,
      /** Window size can not be changed by a user. */
      WEBVIEW_HINT_FIXED,
}

export type callBackFn = (...args: any[]) => any;
export { native_handle_kind, size_hint };
