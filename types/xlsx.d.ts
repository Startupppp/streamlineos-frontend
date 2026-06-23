declare module "xlsx" {
  export function read(data: ArrayBuffer | Buffer | string, opts?: { type?: "array" | "buffer" | "binary" | "string" | "base64" }): WorkBook;
  export namespace utils {
    function sheet_to_json<T>(worksheet: WorkSheet, opts?: { defval?: unknown; header?: number }): T[];
  }
  export interface WorkBook {
    SheetNames: string[];
    Sheets: { [name: string]: WorkSheet };
  }
  export interface WorkSheet {
    [cell: string]: unknown;
  }
  const _default: { read: typeof read; utils: typeof utils };
  export default _default;
}
