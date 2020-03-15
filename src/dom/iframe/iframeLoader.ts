import { BaseComponent } from "../../contracts";
import { generateUniqueId, getUrlOrigin } from "../document";
import { getHashCode } from "../../infrastructure";

interface IframeMessage {
  id: string;
  busy?: boolean
  destroyed?: boolean
  data?: string
}
type MessageEventHandlerFunctionType = (e: MessageEvent) => void;

export enum EventType {
  BeforeCreate = 'beforeCreate',
  Created = 'created',
  BeforeUpdate = 'beforeUpdate',
  Updated = 'updated',
  BeforeDestroy = 'beforeDestroy',
  Destroyed = 'destroyed'
}

export interface IframeLoaderEvent {
  type: EventType,
  el: HTMLElement | null
}

export type EventHandlerFunctionType = (e: IframeLoaderEvent) => void;

export interface IframeLoaderEvents {
  [EventType.BeforeCreate]?: EventHandlerFunctionType;
  [EventType.Created]?: EventHandlerFunctionType;
  [EventType.BeforeUpdate]?: EventHandlerFunctionType;
  [EventType.Updated]?: EventHandlerFunctionType;
  [EventType.BeforeDestroy]?: EventHandlerFunctionType;
  [EventType.Destroyed]?: EventHandlerFunctionType;
}

export interface IframeLoaderOptions {
  url: string;
  parent?: string | HTMLElement;
  events?: IframeLoaderEvents;
  iframeAttributes?: { [name: string]: string; }
}

export class IframeLoader extends BaseComponent {
  private options: IframeLoaderOptions | null;
  private rootElement: HTMLDivElement | null;
  private iframeId: string;
  private onMessageRecieved: null | MessageEventHandlerFunctionType;
  private disposed: boolean;

  constructor(window: Window, options: IframeLoaderOptions) {
    super(window);
    this.options = options;
    this.rootElement = null;
    this.iframeId = '';
    this.disposed = false;
    this.onMessageRecieved = this.windowMessageHandler.bind(this);
    window.addEventListener('message', this.onMessageRecieved);
    this.init();
  }

  public dispose(): void {
    if (this.disposed)
      return;

    this.disposed = true;
    this.triggerEvent(EventType.BeforeDestroy);

    if (this.rootElement) {
      this.rootElement.parentElement?.removeChild(this.rootElement);
    }

    this.getWindow().removeEventListener('message', <MessageEventHandlerFunctionType>this.onMessageRecieved);
    this.onMessageRecieved = null;

    this.triggerEvent(EventType.Destroyed);
    this.options = null;
    super.dispose();
  }

  private init(): void {
    this.triggerEvent(EventType.BeforeCreate);

    this.createRootElement();
    this.cerateIframe();

    this.triggerEvent(EventType.Created);
  }

  private cerateIframe(): void {
    if (this.getIframe())
      return;

    const iframe = this.getDocument().createElement('iframe');
    if (this.options?.iframeAttributes) {
      for (const key in this.options.iframeAttributes) {
        if (this.options.iframeAttributes.hasOwnProperty(key)) {
          iframe.setAttribute(key, this.options.iframeAttributes[key])
        }
      }
    }

    if (this.options?.url) {
      iframe.setAttribute('src', this.options.url);
    }
    this.iframeId = generateUniqueId(this.getDocument(), 'ildr-');
    (<HTMLDivElement>this.rootElement).append(iframe);
  }

  private createRootElement(): void {
    if (this.rootElement)
      return;

    const parent = this.getParentElement();
    this.rootElement = this.getDocument().createElement('div');
    parent.appendChild(this.rootElement);

  }

  private getParentElement(): HTMLElement {
    let parent: HTMLElement | null = null;

    if (this.options?.parent) {
      if (typeof this.options.parent === 'string') {
        if (this.options.parent.length) {
          parent = this.getDocument().querySelector(this.options.parent);
        }
      }
      else {
        parent = this.options.parent;
      }
    }

    if (!parent)
      throw new Error(`Failed to find parent "${this.options?.parent}".`);

    return parent;
  }

  private triggerEvent(eventType: EventType): void {
    const handler = this.options?.events
      ? this.options.events[eventType]
      : undefined;

    if (handler) {
      handler({
        type: eventType,
        el: this.rootElement
      });
    }
  }

  private getIframe(): HTMLIFrameElement | null {
    if (this.rootElement) {
      return this.rootElement.querySelector('iframe');
    }

    return null;
  }

  private windowMessageHandler(event: MessageEvent): void {
    if (event.origin !== this.getIframeOrigin())
      return;

    const messageData = event.data
      ? event.data as IframeMessage
      : null;

    if (!messageData) {
      return;
    }

    if (this.shouldShakeHands(messageData)) {
      this.shakeHands(messageData);
      return;
    }

    if (!messageData.id)
      return;

    this.triggerEvent(messageData.busy ? EventType.BeforeUpdate : EventType.Updated);

    if (messageData.destroyed) {
      this.dispose();
    }
  }

  private getIframeOrigin(): string {
    return getUrlOrigin(this.getDocument(), (<IframeLoaderOptions>this.options).url);
  }

  private shouldShakeHands(message: IframeMessage): boolean {
    // Handshake did not take place
    if (!message.id)
      return true;

    return false;
  }

  private shakeHands(requestMessage: IframeMessage): void {
    const hash = getHashCode(this.iframeId).toString(10);
    const responseMessage: IframeMessage = {
      id: ''
    };

    // We got a message back so if the data matches the hash we sent send the id
    if (requestMessage.data && requestMessage.data === hash) {
      responseMessage.id = this.iframeId;
    } else {
      responseMessage.data = hash;
    }


    this.getIframe()?.contentWindow?.postMessage(responseMessage, this.getIframeOrigin());
  }
}

export class IframeContent extends BaseComponent {
  private iframeId: string;
  private parentOrigin: string;
  private onMessageRecieved: null | MessageEventHandlerFunctionType;
  private messageQueue: Array<IframeMessage>;
  private standalone: boolean;
  private disposed: boolean;

  constructor(window: Window, parentOrigin: string) {
    super(window);
    if (typeof parentOrigin !== 'string' || parentOrigin.length === 0)
      throw new Error(`Parent origin("parentOrigin") should be a non-empty string.`);

    this.standalone = window === window.parent;
    this.parentOrigin = parentOrigin;
    this.iframeId = '';
    this.messageQueue = new Array<IframeMessage>();
    this.disposed = false;
    if (this.standalone) {
      this.onMessageRecieved = null;
    } else {
      this.onMessageRecieved = this.windowMessageHandler.bind(this);
      window.addEventListener('message', this.onMessageRecieved);
    }

    this.init();
  }

  public signalBusyState(busy: boolean): void {
    this.sendMessage({ id: this.iframeId, busy: busy });
  }

  public dispose(): void {
    if (this.disposed)
      return;

    this.disposed = true;
    this.signalBusyState(true);

    if (this.onMessageRecieved) {
      this.getWindow().removeEventListener('message', this.onMessageRecieved);
      this.onMessageRecieved = null;
    }

    this.sendMessage({ id: '', destroyed: true });
    super.dispose();
  }

  private init(): void {
    // Bypass the queue and initiate the handshake.
    this.sendMessage({ id: this.iframeId }, true);
    this.signalBusyState(true);
  }

  private windowMessageHandler(event: MessageEvent): void {
    if (event.origin !== this.parentOrigin)
      return;

    const messageData = event.data
      ? event.data as IframeMessage
      : null;

    if (!messageData) {
      return;
    }

    // In case we do not have the iframeId it means handshake did not happen.
    if (!this.iframeId) {
      this.handShake(messageData);
    }
  }

  private handShake(messageData: IframeMessage) {
    if (!messageData.id) {
      // Phase 1 of the handshake - we got the hash so send it back.
      this.sendMessage({ id: this.iframeId, busy: true, data: messageData.data }, true);
    }
    else {
      // Phase 2 of the handshake - we got the id.
      this.iframeId = messageData.id;

      // Send the previously queued messages.
      this.flushMessages();
    }
  }

  private sendMessage(message: IframeMessage, bypassQueue: boolean = false): void {
    if (this.standalone)
      return;

    if (this.iframeId && !message.id) {
      // Override the message id in case we have iframeId
      message.id = this.iframeId;
    }

    if (bypassQueue || message.id) {
      this.getWindow().parent.postMessage(message, this.parentOrigin);
    } else {
      this.messageQueue.push(message);
    }
  }

  private flushMessages(): void {
    const win = this.getWindow();

    for (let index = 0; index < this.messageQueue.length; index++) {
      const msg = this.messageQueue[index];
      msg.id = this.iframeId;
      win.parent.postMessage(msg, this.parentOrigin);
    }
  }
}
