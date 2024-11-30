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
export function toTypedArray(object: object) {
      const buffer = Buffer.from(JSON.stringify(object));
      const typedArray = new Uint8Array(buffer);
      return typedArray;
}

// @todo parsing and passing binary numbers is complicated...
// ATM, I am just passing them as strings fot the user to convert to what their logic expects.
/*
export function toPointer(number: number | bigint) {
      if (isBigInt(number)) {
            return toCstring(number.toString());
      }
      if (isInteger(number)) {
            return toCstring(number.toString());
      }
      if (isFloat32(number)) {
            return toCstring(number.toString());
      }
      if (isFloat64(number)) {
            return toCstring(number.toString());
      }
      return null;
}
function isBigInt(value: number | bigint) {
      return typeof value === "bigint";
}
function isInteger(value: number) {
      return Number.isInteger(value);
}
function isFloat32(value: number) {
      const float32 = new Float32Array(1);
      float32[0] = value;
      return float32[0] === value && !Number.isInteger(value);
}
function isFloat64(value: number) {
      return typeof value === "number" && !Number.isInteger(value);
}
*/
