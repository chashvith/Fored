declare module "pdf-parse" {
  const pdfParse: (data: Buffer | ArrayBuffer | Uint8Array) => Promise<{ text?: string }>;

  export default pdfParse;
}

declare module "unzipper" {
  export interface UnzipperEntry {
    path: string;
    buffer(): Promise<Buffer>;
  }

  export interface UnzipperArchive {
    files: UnzipperEntry[];
  }

  export const Open: {
    buffer(data: Buffer | ArrayBuffer | Uint8Array): Promise<UnzipperArchive>;
  };

  const unzipper: {
    Open: typeof Open;
  };

  export default unzipper;
}

declare module "jsdom" {
  export class JSDOM {
    constructor(html: string);
    window: Window & typeof globalThis;
  }
}