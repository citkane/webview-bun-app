import os from "node:os";
import { join, dirname } from "node:path";

const currentDir = dirname(import.meta.path);
const encoder = new TextEncoder();
const { platform, machine } = os;
let _libFileName = process.env.WEBVIEW_PATH;

switch (true) {
      case !_libFileName && platform() === "darwin":
            _libFileName = `libwebview-macos-${machine()}.dylib`;
            break;
      case !_libFileName && platform() === "linux":
            _libFileName = `libwebview-linux-${machine()}.so`;
            break;
      case !_libFileName && platform() === "win32":
            let _machine = machine();
            _machine = _machine === "x86_64" ? "AMD64" : _machine;
            _libFileName = `libwebview-windows-${_machine}.dll`;
            break;
      default:
            if (!_libFileName)
                  throw Error(`Unsupported platform ${platform} : ${machine()}`);
}

export const libFileName = join(currentDir, "../bin", _libFileName);

export function toCstring(value: string) {
      return encoder.encode(`${value}\0`);
}

export async function getLibWebviewFilePath() {
      const { platform, machine } = os;
      let fileName: string;
      switch (platform()) {
            case "darwin":
                  fileName = `libwebview-macos-${machine()}.dylib`;
                  break;
            case "linux":
                  fileName = `libwebview-linux-${machine()}.so`;
                  break;
            case "win32":
                  let _machine = machine();
                  _machine = _machine === "x86_64" ? "AMD64" : _machine;
                  fileName = `libwebview-windows-${_machine}.dll`;
                  break;
      }
}
