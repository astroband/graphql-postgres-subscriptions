import { EventEmitter } from "events";
import { Client } from "pg";

const RESERVED_CHANNELS = [
  "newListener",
  "removeListener",
  "notify",
  "unlisten",
  "listen",
  "error",
  "end"
];

export default class PostgresIPC extends EventEmitter {
  private pgClient: Client;
  private ending: boolean = false;

  constructor(client: Client, reviver?: any) {
    super();
    this.pgClient = client;

    this.on("newListener", (channel: string) => {
      if (
        RESERVED_CHANNELS.indexOf(channel) < 0 &&
        this.listenerCount(channel) === 0
      ) {
        this._dispatchListen(channel);
      }
    });

    this.on("removeListener", (channel: string) => {
      if (
        RESERVED_CHANNELS.indexOf(channel) < 0 &&
        this.listenerCount(channel) === 0
      ) {
        this._dispatchUnlisten(channel);
      }
    });

    this.pgClient.on("notification", msg => {
      try {
        msg.payload = msg.payload
          ? JSON.parse(msg.payload, reviver)
          : msg.payload;
      } catch (err) {
        // JSON may not always parse. This is OK.
      } finally {
        this.emit(msg.channel, msg.payload);
      }
    });
  }

  /**
   * Send a notification through Postgres Client IPC
   * @param channel Notification channel name identifier
   * @param payload some arbitrary object, should be <8000 bytes in size
   */
  public notify(channel: string, payload: any) {
    const encodedPayload = JSON.stringify(payload);
    const statement =
      `NOTIFY ${this.pgClient.escapeIdentifier(channel)}` +
      `, ${this.pgClient.escapeLiteral(encodedPayload)}`;
    this.pgClient.query(statement, (err, res) => {
      if (err) {
        this.emit("error", err);
      } else {
        this.emit("notify", channel, payload);
      }
    });
  }

  /**
   * End the notification IPC listeners
   */
  public end() {
    if (this.ending) {
      return;
    }
    this.ending = true;
    this.pgClient.query(`UNLISTEN *`, this._endCallback);
  }

  private _dispatchListen(channel: string) {
    this.pgClient.query(
      `LISTEN ${this.pgClient.escapeIdentifier(channel)}`,
      err => {
        if (err) {
          this.emit("error", err);
        } else {
          this.emit("listen", channel);
        }
      }
    );
  }

  private _dispatchUnlisten(channel: string) {
    this.pgClient.query(
      `UNLISTEN ${this.pgClient.escapeIdentifier(channel)}`,
      err => {
        if (err) {
          this.emit("error", err);
        } else {
          this.emit("unlisten", channel);
        }
      }
    );
  }

  private _endCallback(err: any) {
    if (err) {
      this.ending = false;
      this.emit("error", err);
    } else {
      this.emit("end");
      this.removeAllListeners();
    }
  }
}
