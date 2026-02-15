declare module "ws" {
  import { EventEmitter } from "events";

  class WebSocket extends EventEmitter {
    constructor(address: string | URL, options?: any);
    on(event: "close", listener: (code: number, reason: Buffer) => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: "upgrade", listener: (request: any) => void): this;
    on(event: "message", listener: (data: any) => void): this;
    on(event: "open", listener: () => void): this;
    on(event: "ping" | "pong", listener: (data: Buffer) => void): this;

    ping(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
    pong(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
    send(data: any, cb?: (err?: Error) => void): void;
    terminate(): void;
    close(code?: number, data?: string | Buffer): void;
    readonly readyState: number;
    static readonly CONNECTING: number;
    static readonly OPEN: number;
    static readonly CLOSING: number;
    static readonly CLOSED: number;
  }
  export default WebSocket;
}
