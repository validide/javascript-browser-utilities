import { generateUniqueId } from '../document/generateIds';
import { appendDataToForm } from '../form/appendDataToForm';

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

  private static DEFAULT_OPTIONS: IframeHttpRequestOptions = {
    timeout: 30 * 1000,
    redirectTimeout: -1
  }

  constructor(
    window: Window,
    url: string,
    data: object | null = null,
    method: string = 'GET',
    options: IframeHttpRequestOptions | null = null
  ) {
    // TODO: validate input
    this.window = window;
    this.url = url || 'about:blank'; // empty url is not allowed for src on iFrames and this is where this will endup
    this.data = data;
    this.method = method;
    this.options = <IframeHttpRequestOptions>Object.assign({}, options, IframeHttpRequest.DEFAULT_OPTIONS);
    this.resolvePromise = null;
    this.rejectPromise = null;
    this.loadHandlerRef = (e: Event) => this.loadHandler(e);
    this.wrapperId = generateUniqueId(this.getDocument(), 'IframeHttpRequest_wrapper_');
    this.timeoutRef = 0;

    this.init();
  }

  public sendAsync(): Promise<IframeHttpResponse> {
    return new Promise<IframeHttpResponse>((resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;

      const wrapper = <HTMLDivElement>this.getDocument().getElementById(this.wrapperId);
      (<HTMLFormElement>wrapper.querySelector('form')).submit();

      this.timeoutRef = this.getWindow().setTimeout(() => { this.timeouRequest(); }, this.options.timeout);
    });
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

  private loadHandler(e: Event): void {
    /*
    try {

      if (this.checkForRedirect) {
        var currentUrl = evt.target.contentWindow.location.href;
        if (getUrlFullPath(currentUrl).toLowerCase() !== getUrlFullPath(this.url).toLowerCase()) {
          //console.log('Ignoring response since it\'s not the expected URL:\n\t- actual: ' + currentUrl + '\n\t- expected: ' + this.url);
          return;
        }
      }

      var data = evt.target.contentWindow.document.querySelector('body').innerText;
      this.resolvePromise({
        status: 'OK',
        data: data,
        ex: null
      });
      this.cleanup();
    } catch (e) {
      if (this.attemptCrossOrigin) {
        //this might be cross domain but we do not know
        console.log('Failed to read iframe content. Expected URL: ' + this.url);
        console.log(e);
      } else {
        this.rejectPromise({
          status: 'EXCEPTION',
          data: null,
          ex: e
        });
        this.cleanup();
      }
    }
     */
  }

  private timeouRequest(): void {
    (<RejectPromiseFunctionType>this.rejectPromise)({ data: '', error: new Error('TIMEOUT') });
    this.cleanup();
  }

  private getWindow(): Window { return <Window>this.window; }

  private getDocument(): Document { return this.getWindow().document; }

  private cleanup(): void {
    this.getWindow().clearTimeout(this.timeoutRef);
    this.timeoutRef = 0;
    const wrapper = <HTMLDivElement>this.getDocument().getElementById(this.wrapperId);

    (<HTMLIFrameElement>wrapper.querySelector('iframe')).removeEventListener('load', <LoadHandlerFunctionType>this.loadHandlerRef, false);
    (<HTMLElement>wrapper.parentElement).removeChild(wrapper);
    this.loadHandlerRef = null;
    this.resolvePromise = null;
    this.rejectPromise = null;
    this.window = null;
    this.url = '';
    this.method = '';
    this.wrapperId = '';
  }
}
