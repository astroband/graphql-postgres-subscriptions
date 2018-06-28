import { PubSubEngine } from "graphql-subscriptions";
import { Client } from "pg";
import PostgresIPC from "./PostgresIPC";
import PubSubAsyncIterator from "./PubSubAsyncIterator";

export default class PostgresPubSub implements PubSubEngine {
  public eventEmitter: PostgresIPC;
  private subscriptions: {
    [index: number]: [string, (payload: any) => void];
  };
  private subIdCounter: number;

  constructor(pgClient: Client, reviver?: any) {
    this.eventEmitter = new PostgresIPC(pgClient, reviver);
    this.subscriptions = {};
    this.subIdCounter = 0;
  }

  public publish(triggerName: string, payload: any) {
    this.eventEmitter.notify(triggerName, payload);
    return true;
  }

  public subscribe(triggerName: string, onMessage: (...args: any[]) => void) {
    const cb = (payload: any) => onMessage(payload);
    this.eventEmitter.on(triggerName, cb);
    this.subIdCounter += 1;
    this.subscriptions[this.subIdCounter] = [triggerName, cb];
    return Promise.resolve(this.subIdCounter);
  }

  public unsubscribe(subId: number) {
    const [triggerName, onMessage] = this.subscriptions[subId];
    delete this.subscriptions[subId];
    this.eventEmitter.removeListener(triggerName, onMessage);
  }

  public asyncIterator<T>(triggers: string | string[]): AsyncIterator<T> {
    return new PubSubAsyncIterator(this, triggers);
  }
}
