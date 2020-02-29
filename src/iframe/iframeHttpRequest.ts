import { generateUniqueId } from '../document/generateIds';
import { appendDataToForm } from '../form/appendDataToForm';
import { getUrlFullPath } from '../document/getUrlFullPath';

type LoadHandlerFunctionType = (this: IframeHttpRequest, e: Event) => void;
type ResolvePromiseFunctionType<T> = (value?: T | PromiseLike<T>) => void;
type RejectPromiseFunctionType = (reason: IframeHttpResponse) => void;

export interface IframeHttpRequestOptions {
  timeout: number;
  redirectTimeout: number;
}

export interface IframeHttpResponse {
  data: string,
  error: Error | null
}

export class IframeHttpRequest {
  private window: Window | null;
  private url: string;
  private data: object | null = null;
  private method: string = 'GET';
  private options: IframeHttpRequestOptions;

  private resolvePromise: ResolvePromiseFunctionType<IframeHttpResponse> | null;
  private rejectPromise: RejectPromiseFunctionType | null;
  private loadHandlerRef: LoadHandlerFunctionType | null;
  private wrapperId: string;
  private timeoutRef: number;
  private redirectTimeoutRef: number;
  private lastResult: IframeHttpResponse | null;
  private called: boolean;
  private disposed: boolean;

  public static DEFAULT_OPTIONS: IframeHttpRequestOptions = {
    timeout: 30 * 1000,
    redirectTimeout: 3 * 1000
  }

  constructor(
    window: Window,
    url: string,
    data: object | null = null,
    method: string = 'GET',
    options: IframeHttpRequestOptions | null = null
  ) {
    this.validateInput(window, url, method);
    this.window = window;
    this.url = url; // might consider defaulting to 'about:blank' as empty url is not allowed for src on iFrames and this is where this will end-up
    this.data = data;
    this.method = method;
    this.options = <IframeHttpRequestOptions>Object.assign({}, IframeHttpRequest.DEFAULT_OPTIONS, options);
    this.resolvePromise = null;
    this.rejectPromise = null;
    this.loadHandlerRef = (e: Event) => this.loadHandler(e);
    this.wrapperId = generateUniqueId(this.getDocument(), 'IframeHttpRequest_wrapper_');
    this.timeoutRef = 0;
    this.redirectTimeoutRef = 0;
    this.lastResult = null;
    this.called = false;
    this.disposed = false;
  }

  public sendAsync(): Promise<IframeHttpResponse> {
    if (this.called)
      throw new Error('The "send" method was already called!');

    this.called = true;
    this.init();

    return this.sendAsyncCore();
  }

  public dispose(): void {
    if (this.disposed)
      return;

    this.disposed = true;
    const win = this.getWindow();
    win.clearTimeout(this.timeoutRef);
    this.timeoutRef = 0;
    win.clearTimeout(this.redirectTimeoutRef);
    this.redirectTimeoutRef = 0;
    this.lastResult = null;
    const wrapper = this.getDocument().getElementById(this.wrapperId);

    if (wrapper) {
      (<HTMLIFrameElement>wrapper.querySelector('iframe')).removeEventListener('load', <LoadHandlerFunctionType>this.loadHandlerRef, false);
      (<HTMLElement>wrapper.parentElement).removeChild(wrapper);
    }

    this.loadHandlerRef = null;
    this.resolvePromise = null;
    this.rejectPromise = null;
    this.window = null;
    this.url = '';
    this.method = '';
    this.wrapperId = '';
  }

  private validateInput(window: Window, url: string, method: string): void {
    if (!window)
      throw new Error('Missing "window" reference.');

    if (!url)
      throw new Error('Missing "url" reference.');

    switch (method.toUpperCase()) {
      case 'GET':
      case 'POST':
        break;

      default:
        throw new Error(`Method not supported "${method}"`);
    }
  }

  private init(): void {
    const iframeId = this.wrapperId + '_iframe';
    const fragment = this.getDocument().createDocumentFragment();
    const wrapper = this.getDocument().createElement('div');

    wrapper.id = this.wrapperId;
    wrapper.style.display = 'none';
    wrapper.innerHTML = `<form target="${iframeId}"></form><iframe id="${iframeId}" name="${iframeId}" width="0" height="0" src="about:blank"></iframe>`;

    const form = <HTMLFormElement>wrapper.querySelector('form');
    form.action = this.url;
    form.method = this.method;
    form.target = iframeId;
    if (this.data !== null) {
      appendDataToForm(this.data, form);
    }

    fragment.appendChild(wrapper);
    this.getDocument().body.appendChild(fragment);

    const iframe = <HTMLIFrameElement>wrapper.querySelector('iframe');

    iframe.addEventListener('load', <LoadHandlerFunctionType>this.loadHandlerRef, false)
  }

  private sendAsyncCore(): Promise<IframeHttpResponse> {
    return new Promise<IframeHttpResponse>((resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;

      const wrapper = <HTMLDivElement>this.getDocument().getElementById(this.wrapperId);
      try {
        (<HTMLFormElement>wrapper.querySelector('form')).submit();
        this.timeoutRef = this.getWindow().setTimeout(() => {
            this.reject(new Error('TIMEOUT'));
          },
          2
        );
      } catch (error) {
        this.reject(error);
      }
    });
  }

  private loadHandler(event: Event): void {
    this.getWindow().clearTimeout(this.redirectTimeoutRef);
    const allowRedirects = this.options.redirectTimeout < 0;

    try {
      const contentWindow = <Window>(<HTMLIFrameElement>event.target).contentWindow;
      // this should throw if iframe is not accessible due to 'X-Frame-Options'
      const targetPath = getUrlFullPath(contentWindow.document, contentWindow.location.href).toLowerCase();
      const desiredPath = getUrlFullPath(contentWindow.document, this.url).toLowerCase()
      this.lastResult = {
        data: (<HTMLElement>contentWindow.document.querySelector('body')).innerText,
        error: null
      };

      if ((targetPath != desiredPath) && allowRedirects) {
        this.schedulePromieResolve();
      } else {
        this.resolve(this.lastResult);
      }
    } catch (error) {
      if (allowRedirects) {
        this.reject(error)
      } else {
        this.lastResult = {
          data: '',
          error: error
        };
        this.schedulePromieResolve();
      }
    }
  }

  private schedulePromieResolve(): void {
    const win = this.getWindow();
    win.clearTimeout(this.redirectTimeoutRef);
    this.redirectTimeoutRef = win.setTimeout(() => this.resolveLastRedirectResponse(), this.options.redirectTimeout);
  }

  private resolveLastRedirectResponse(): void {
    if (this.lastResult) {
      this.resolve(this.lastResult);
    } else {
      this.reject(new Error('NO_REDIRECT_RESULT'));
    }
  }

  private resolve(value: IframeHttpResponse): void {
    (<ResolvePromiseFunctionType<IframeHttpResponse>>this.resolvePromise)(value);
    this.dispose();
  }

  private reject(error: Error): void {
    (<RejectPromiseFunctionType>this.rejectPromise)({ data: '', error: error });
    this.dispose();
  }

  private getWindow(): Window { return <Window>this.window; }

  private getDocument(): Document { return this.getWindow().document; }
}
