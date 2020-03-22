import { BaseComponent } from "../../contracts/index";
import { generateUniqueId, getUrlOrigin } from "../document/index";
import { getHashCode } from "../../infrastructure/index";

interface IframeMessage {
  id: string;
  busy?: boolean
  destroyed?: boolean
  data?: string
}
type MessageEventHandlerFunctionType = (e: MessageEvent) => void;

/**
 * IframeLoader event types.
 * The type of IframeLoaderEvent
 */
export enum IframeLoaderEventType {
  BeforeCreate = 'beforeCreate',
  Created = 'created',
  BeforeUpdate = 'beforeUpdate',
  Updated = 'updated',
  BeforeDestroy = 'beforeDestroy',
  Destroyed = 'destroyed'
}

/**
 * IframeLoader Event
 * These are triggered in different life-cycle phases
 */
export interface IframeLoaderEvent {
  type: IframeLoaderEventType;
  el: HTMLElement | null;
  parentEl: HTMLElement;
  id: string;
}

/**
 * Life-cycle event hander type
 */
export type EventHandlerFunctionType = (e: IframeLoaderEvent) => void;

/**
 * Life-cycle event hooks
 */
export interface IframeLoaderEvents {
  [IframeLoaderEventType.BeforeCreate]?: EventHandlerFunctionType;
  [IframeLoaderEventType.Created]?: EventHandlerFunctionType;
  [IframeLoaderEventType.BeforeUpdate]?: EventHandlerFunctionType;
  [IframeLoaderEventType.Updated]?: EventHandlerFunctionType;
  [IframeLoaderEventType.BeforeDestroy]?: EventHandlerFunctionType;
  [IframeLoaderEventType.Destroyed]?: EventHandlerFunctionType;
}

/**
 * IframeLoader options
 */
export interface IframeLoaderOptions {
  url: string;
  parent?: string | HTMLElement;
  events?: IframeLoaderEvents;
  iframeAttributes?: { [key: string]: string; }
}

/**
 * Iframe loader
 * Load remote content inside an IFRAME.
 */
export class IframeLoader extends BaseComponent {
  private options: IframeLoaderOptions | null;
  private rootElement: HTMLDivElement | null;
  private iframeId: string;
  private onMessageRecieved: null | MessageEventHandlerFunctionType;
  private disposed: boolean;

  /**
   * Constructor.
   * @param window Reference to the window object.
   * @param options Loader options.
   */
  constructor(window: Window, options: IframeLoaderOptions) {
    super(window);
    if (!options?.url)
      throw new Error('The "options.url" value should be a non-empty string.');

    this.options = options;
    this.rootElement = null;
    this.iframeId = '';
    this.disposed = false;
    this.onMessageRecieved = this.windowMessageHandler.bind(this);
    window.addEventListener('message', this.onMessageRecieved);
    this.init();
  }

  /**
   * Dispose the loader
   */
  public dispose(): void {
    if (this.disposed)
      return;

    this.disposed = true;
    this.triggerEvent(IframeLoaderEventType.BeforeDestroy);

    (<HTMLElement>(<HTMLDivElement>this.rootElement).parentElement).removeChild(<HTMLDivElement>this.rootElement);
    this.rootElement = null;

    this.getWindow().removeEventListener('message', <MessageEventHandlerFunctionType>this.onMessageRecieved);
    this.onMessageRecieved = null;

    this.triggerEvent(IframeLoaderEventType.Destroyed);
    this.options = null;
    super.dispose();
  }

  private init(): void {
    this.triggerEvent(IframeLoaderEventType.BeforeCreate);

    this.createRootElement();
    this.cerateIframe();

    this.triggerEvent(IframeLoaderEventType.Created);
  }

  private cerateIframe(): void {
    if (this.getIframe())
      return;

    const iframe = this.getDocument().createElement('iframe');
    const opt = this.getOptions();
    if (opt.iframeAttributes) {
      const keys = Object.keys(opt.iframeAttributes);
      for (let index = 0; index < keys.length; index++) {
        const key = keys[index];
        iframe.setAttribute(key, opt.iframeAttributes[key])
      }
    }

    iframe.setAttribute('src', opt.url);
    this.iframeId = generateUniqueId(this.getDocument(), 'ildr-');
    (<HTMLDivElement>this.rootElement).appendChild(iframe);
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

    const opt = this.getOptions();
    if (opt.parent) {
      if (typeof opt.parent === 'string') {
        parent = this.getDocument().querySelector(opt.parent);
      }
      else {
        parent = opt.parent;
      }
    }

    if (!parent)
      throw new Error(`Failed to find parent "${opt.parent}".`);

    return parent;
  }

  private triggerEvent(eventType: IframeLoaderEventType): void {
    const opt = this.getOptions();
    const handler = opt.events
      ? opt.events[eventType]
      : undefined;

    if (handler) {
      try {
        handler({
          type: eventType,
          el: this.rootElement,
          parentEl: this.getParentElement(),
          id: this.iframeId
        });
      } catch (error) {
        console.error(`Calling the "${eventType}" handler failed.`, error);
      }
    }
  }

  private getIframe(): HTMLIFrameElement | null {
    return (<HTMLDivElement>this.rootElement).querySelector('iframe');
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

    if (!messageData.id || messageData.id !== this.iframeId)
      return;

    if (messageData.destroyed) {
      this.dispose();
    } else {
      this.triggerEvent(messageData.busy ? IframeLoaderEventType.BeforeUpdate : IframeLoaderEventType.Updated);
    }
  }

  private getIframeOrigin(): string {
    return getUrlOrigin(this.getDocument(), this.getOptions().url);
  }

  private getOptions(): IframeLoaderOptions {
    return (<IframeLoaderOptions>this.options);
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

    (<Window>(<HTMLIFrameElement>this.getIframe()).contentWindow).postMessage(responseMessage, this.getIframeOrigin());
  }
}

/**
 * Content loaded by IframeLoader
 */
export class IframeContent extends BaseComponent {
  private iframeId: string;
  private parentOrigin: string;
  private onMessageRecieved: null | MessageEventHandlerFunctionType;
  private messageQueue: Array<IframeMessage>;
  private standalone: boolean;
  private disposed: boolean;

  /**
   * Constructor
   * @param window Reference to the window object
   * @param parentOrigin The origin that loaded the content
   */
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

  /**
   * Signal busy state
   * @param busy Is the component busy?
   */
  public signalBusyState(busy: boolean): void {
    this.sendMessage({ id: this.iframeId, busy: busy });
  }

  /**
   * Dispose the component
   */
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
