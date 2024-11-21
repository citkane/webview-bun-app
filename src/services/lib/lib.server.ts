type fileMeta = { filePath: string; fileType: string };
type fileMetaHeaders = {
      fileMeta: fileMeta;
      headers: Headers;
};

import { buildJsFileString, statusCode, stringToJsBytes, conf } from ".";
import * as path from "node:path";
import { existsSync } from "node:fs";

export function getFileMeta(req: Request, htmlRoots: string[], headers: Headers) {
      const fileMeta = makeFileMeta(new URL(req.url).pathname);
      const searchLocations = htmlRoots.map((dir) => path.join(dir, fileMeta.filePath));
      fileMeta.filePath = searchLocations.find((filePath) => existsSync(filePath)) || "";

      return new Promise<fileMetaHeaders>((respond, reject) => {
            !!fileMeta.filePath
                  ? respond({ fileMeta, headers })
                  : reject(makeErrorResponse(statusCode.NotFound, headers));
      });
}
export function makeResponse({ fileMeta, headers }: fileMetaHeaders) {
      const { filePath, fileType } = fileMeta;

      return new Promise<Response>(async (resolve, reject) => {
            const { typeHeaders, errorCode } = setMimeType(fileType, headers);
            if (errorCode) {
                  const response = makeErrorResponse(errorCode, headers);
                  return reject(response);
            }

            const file = await fetchFile(filePath, fileType);
            const response = new Response(file, { headers: typeHeaders });

            resolve(response);
      });
}

function setMimeType(fileType: string, headers: Headers) {
      const k = `.${fileType}` as keyof typeof conf.mimeTypes;
      const contentType = conf.mimeTypes[k];
      if (!contentType)
            return { typeHeaders: headers, errorCode: statusCode.NotImplemented };

      const typeHeaders = new Headers();
      typeHeaders.set("Content-Type", contentType);
      headers.forEach((value, key) => typeHeaders.set(key, value));

      return { typeHeaders, errorCode: null };
}
function makeErrorResponse(code: statusCode, headers: Headers) {
      return new Response("", {
            status: code,
            headers,
      });
}

function fetchFile(filePath: string, fileType: string) {
      const compileTheFile = conf.compileFileTypes.includes(fileType);
      return compileTheFile
            ? buildJsFileString(filePath).then(stringToJsBytes)
            : Bun.file(filePath).bytes();
}

function makeFileMeta(filePath: string): fileMeta {
      const pathArray = filePath.split(".");
      if (pathArray.length === 1) {
            filePath = `${filePath}index.html`;
            pathArray.push("html");
      }
      const fileType = pathArray[pathArray.length - 1];
      return { filePath, fileType };
}
