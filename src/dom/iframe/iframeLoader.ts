import { BaseComponent } from "../../contracts";
import { generateUniqueId, getUrlOrigin } from "../document";

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
  BeforeMount = 'beforeMount',
  Mounted = 'mounted',
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
  [EventType.BeforeMount]?: EventHandlerFunctionType;
  [EventType.Mounted]?: EventHandlerFunctionType;
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
    this.getWindow().addEventListener('message', this.onMessageRecieved);
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

    if (this.onMessageRecieved) {
      window.removeEventListener('message', this.onMessageRecieved);
    }

    this.triggerEvent(EventType.Destroyed);
    this.options = null;
    super.dispose();
  }

  private init(): void {
    this.createRootElement();
    this.mountIframe();
  }

  private mountIframe(): void {
    if (this.getIframe())
      return;

    this.triggerEvent(EventType.BeforeMount);

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

    this.triggerEvent(EventType.Mounted);
  }

  private createRootElement(): void {
    if (this.rootElement)
      return;

    this.triggerEvent(EventType.BeforeCreate);

    const parent = this.getParentElement();
    this.rootElement = this.getDocument().createElement('div');
    parent.appendChild(this.rootElement);

    this.triggerEvent(EventType.Created);
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

    if (messageData.id) {
      // Child did not send an ID so let's end it again
      const message: IframeMessage = {
        id: this.iframeId
      }
      this.getIframe()?.contentWindow?.postMessage(message, this.getIframeOrigin());
    }

    this.triggerEvent(messageData.busy ? EventType.BeforeUpdate : EventType.Updated);

    if (messageData.destroyed) {
      this.dispose();
    }
  }

  private getIframeOrigin(): string {
    return getUrlOrigin(this.getDocument(), (<IframeLoaderOptions>this.options).url);
  }
}

export class IframeContent extends BaseComponent {
  private iframeId: string;
  private parentOrigin: string;
  private onMessageRecieved: null | MessageEventHandlerFunctionType;
  private disposed: boolean;

  constructor(window: Window, parentOrigin: string) {
    super(window);
    if (typeof parentOrigin !== 'string' || parentOrigin.length === 0)
      throw new Error(`Parent origin should be a non-empty string.`);

    this.parentOrigin = parentOrigin;
    this.iframeId = '';
    this.disposed = false;
    this.onMessageRecieved = this.windowMessageHandler.bind(this);
    this.getWindow().addEventListener('message', this.onMessageRecieved);

    this.init();
  }

  public dispose(): void {
    if (this.disposed)
      return;

    this.disposed = true;
    this.sendMessage({ id: this.iframeId, busy: true });

    if (this.onMessageRecieved) {
      window.removeEventListener('message', this.onMessageRecieved);
    }

    this.sendMessage({ id: this.iframeId, destroyed: true });
    super.dispose();
  }

  private init(): void {
    this.sendMessage({ id: this.iframeId, busy: true });
  }

  private windowMessageHandler(event: MessageEvent): void {
    const win = this.getWindow();
    if (win === win.parent)
      return;

    if (event.origin !== this.parentOrigin)
      return;

    const messageData = event.data
      ? event.data as IframeMessage
      : null;

    if (!messageData) {
      return;
    }

    if (!this.iframeId && messageData.id) {
      this.iframeId = messageData.id;
    }
  }

  private sendMessage(message: IframeMessage): void {
    const win = this.getWindow();
    if (win === win.parent)
      return;

    win.parent.postMessage(message, this.parentOrigin)
  }
}
