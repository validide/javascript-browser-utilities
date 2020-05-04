import { BaseComponent } from '../../contracts/index';
import { generateUniqueId, getUrlOrigin } from '../document/index';
import { getHashCode } from '../../infrastructure/index';
// tslint:disable: interface-name

export enum IframeMessageState {
  Mounted = 0,
  BeforeUpdate = 1,
  Updated = 2,
  Destroyed = 3
}
/**
 * Messages set between the parent/child iframe compoents
 */
export interface IframeMessage {
  id: string;
  state: IframeMessageState;
  data?: string;
}
type MessageEventHandlerFunctionType = (e: MessageEvent) => void;
type GenericEventHandlerFunctionType = (e: Event) => void;

/**
 * IframeLoader event types.
 * The type of IframeLoaderEvent
 */
export enum IframeLoaderEventType {
  BeforeCreate = 'beforeCreate',
  Created = 'created',
  BeforeMount = 'beforeMount',
  Mounted = 'mounted',
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
  [IframeLoaderEventType.BeforeMount]?: EventHandlerFunctionType;
  [IframeLoaderEventType.Mounted]?: EventHandlerFunctionType;
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
  iframeAttributes?: { [key: string]: string };
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
  private onIframeLoaded: null | GenericEventHandlerFunctionType;
  private iframeLoaded: boolean;
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
    this.onIframeLoaded = this.iframeLoadedHandler.bind(this);
    this.iframeLoaded = false;
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

    if (this.onIframeLoaded) {
      (this.getIframe() as HTMLIFrameElement).removeEventListener('load', this.onIframeLoaded);
    }
    this.iframeLoaded = false;
    ((this.rootElement as HTMLDivElement).parentElement as HTMLElement).removeChild(this.rootElement as HTMLDivElement);
    this.rootElement = null;

    this.getWindow().removeEventListener('message', this.onMessageRecieved as MessageEventHandlerFunctionType);
    this.onMessageRecieved = null;

    this.triggerEvent(IframeLoaderEventType.Destroyed);
    this.options = null;
    super.dispose();
  }

  private init(): void {
    this.triggerEvent(IframeLoaderEventType.BeforeCreate);

    this.createRootElement();
    this.createIframe();

    this.triggerEvent(IframeLoaderEventType.Created);
  }

  private createIframe(): void {
    if (this.getIframe())
      return;

    const iframe = this.getDocument().createElement('iframe');
    const opt = this.getOptions();
    if (opt.iframeAttributes) {
      const keys = Object.keys(opt.iframeAttributes);
      // tslint:disable-next-line: prefer-for-of
      for (let index = 0; index < keys.length; index++) {
        const key = keys[index];
        iframe.setAttribute(key, opt.iframeAttributes[key]);
      }
    }

    iframe.addEventListener('load', this.onIframeLoaded as GenericEventHandlerFunctionType);
    iframe.setAttribute('src', opt.url);
    this.iframeId = generateUniqueId(this.getDocument(), 'ildr-');
    (this.rootElement as HTMLDivElement).appendChild(iframe);
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
        if (console && typeof console.error === 'function') {
          console.error(`Calling the "${eventType}" handler failed.`, error);
        }
      }
    }
  }

  private getIframe(): HTMLIFrameElement | null {
    return (this.rootElement as HTMLDivElement).querySelector('iframe');
  }

  private iframeLoadedHandler(event: Event): void {
    if (!this.iframeLoaded) {
      this.triggerEvent(IframeLoaderEventType.BeforeMount);
    }
    this.iframeLoaded = true;
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

    switch (messageData.state) {
      case IframeMessageState.Mounted:
        this.triggerEvent(IframeLoaderEventType.Mounted);
        break;
      case IframeMessageState.BeforeUpdate:
        this.triggerEvent(IframeLoaderEventType.BeforeUpdate);
        break;
      case IframeMessageState.Updated:
        this.triggerEvent(IframeLoaderEventType.Updated);
        break;
      case IframeMessageState.Destroyed:
        this.dispose();
        break;
      default:
        break;
    }
  }

  private getIframeOrigin(): string {
    return getUrlOrigin(this.getDocument(), this.getOptions().url);
  }

  private getOptions(): IframeLoaderOptions {
    return (this.options as IframeLoaderOptions);
  }

  private shouldShakeHands(message: IframeMessage): boolean {
    // Handshake did not take place
    if (!message.id && message.state === IframeMessageState.Mounted)
      return true;

    return false;
  }

  private shakeHands(requestMessage: IframeMessage): void {
    const hash = getHashCode(this.iframeId).toString(10);
    const responseMessage: IframeMessage = {
      id: '',
      state: IframeMessageState.Mounted
    };

    // We got a message back so if the data matches the hash we sent send the id
    if (requestMessage.data && requestMessage.data === hash) {
      responseMessage.id = this.iframeId;
    } else {
      responseMessage.data = hash;
    }

    ((this.getIframe() as HTMLIFrameElement).contentWindow as Window).postMessage(responseMessage, this.getIframeOrigin());
  }
}

/**
 * Content loaded by IframeLoader
 */
export class IframeContent extends BaseComponent {
  private iframeId: string;
  private parentOrigin: string;
  private onMessageRecieved: null | MessageEventHandlerFunctionType;
  private messageQueue: IframeMessage[];
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
      throw new Error('Parent origin("parentOrigin") should be a non-empty string.');

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
    this.sendMessage({
      id: this.iframeId,
      state: busy
        ? IframeMessageState.BeforeUpdate
        : IframeMessageState.Updated
    });
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

    this.sendMessage({ id: '', state: IframeMessageState.Destroyed });
    super.dispose();
  }

  private init(): void {
    // Bypass the queue and initiate the handshake.
    this.sendMessage({ id: this.iframeId, state: IframeMessageState.Mounted }, true);
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
    if (messageData.id) {
      // Phase 2 of the handshake - we got the id.
      this.iframeId = messageData.id;

      // Send it again to notify parent.
      this.sendMessage({ id: this.iframeId, state: IframeMessageState.Mounted });

      // Send the previously queued messages.
      this.flushMessages();
    }
    else {
      // Phase 1 of the handshake - we got the hash so send it back.
      this.sendMessage({ id: this.iframeId, state: IframeMessageState.Mounted, data: messageData.data }, true);
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

    // tslint:disable-next-line: prefer-for-of
    for (let index = 0; index < this.messageQueue.length; index++) {
      const msg = this.messageQueue[index];
      msg.id = this.iframeId;
      win.parent.postMessage(msg, this.parentOrigin);
    }
  }
}
