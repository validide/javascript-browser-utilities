import { BaseComponent } from '../../contracts/index';
import { generateUniqueId } from '../document/generateIds';
import { getUrlFullPath } from '../document/getUrlFullPath';
import { appendDataToForm } from '../form/appendDataToForm';

type LoadHandlerFunctionType = (this: IframeHttpRequest, e: Event) => void;
type ResolvePromiseFunctionType<T> = (value: T | PromiseLike<T>) => void;
type RejectPromiseFunctionType = (reason: IframeHttpResponse) => void;

/**
 * Configure the request options
 *
 * @property timeout The maximum request timeout (in milliseconds). The request will be reject as TIMEOUT error if nothing happens in this interval.
 * @property redirectTimeout The maximum delay (in milliseconds) between consecutive redirect. If set to zero or less the first response is returned.
 */
export interface IframeHttpRequestOptions {
  timeout: number;
  redirectTimeout: number;
}

/**
 * The response
 *
 * @property data The body innerHTML in case of success or an empty string in case of error.
 * @property error The error in case of the promise beeing rejected or the null in case of success.
 */
export interface IframeHttpResponse {
  data: string;
  error: Error | null;
}

/**
 * Make a HTTP request using an iframe
 */
export class IframeHttpRequest extends BaseComponent {
  private url: string;
  private data: Record<string, unknown> | null = null;
  private method = 'GET';
  private options: IframeHttpRequestOptions;

  private resolvePromise: ResolvePromiseFunctionType<IframeHttpResponse> | null;
  private rejectPromise: RejectPromiseFunctionType | null;
  private loadHandlerRef: LoadHandlerFunctionType | null;
  private wrapperId: string;
  private timeoutRef: number;
  private redirectTimeoutRef: number;
  private called: boolean;
  private disposed: boolean;

  /**
   * Default options IframeHttpRequestOptions
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static DEFAULT_OPTIONS: IframeHttpRequestOptions = {
    timeout: 30 * 1000,
    redirectTimeout: 3 * 1000
  };

  /**
   * Object constructor
   *
   * @param window A reference to the window object
   * @param url The url to make the request to
   * @param data The data to send. Default NULL
   * @param method The HTTP method. GET(default) or POST
   * @param options The request options IframeHttpRequestOptions. Default null and will use the IframeHttpRequest.DEFAULT_OPTIONS
   */
  constructor(
    window: Window,
    url: string,
    data: Record<string, unknown> | null = null,
    method = 'GET',
    options: IframeHttpRequestOptions | null = null
  ) {
    super(window);

    this.validateInput(url, method);
    this.url = url; // might consider defaulting to 'about:blank' as empty url is not allowed for src on iFrames and this is where this will end-up
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.data = data;
    this.method = method;
    this.options = (Object.assign({}, IframeHttpRequest.DEFAULT_OPTIONS, options) );
    this.resolvePromise = null;
    this.rejectPromise = null;
    this.loadHandlerRef = (e: Event) => this.loadHandler(e);
    this.wrapperId = generateUniqueId(this.getDocument(), 'IframeHttpRequest_wrapper_');
    this.timeoutRef = 0;
    this.redirectTimeoutRef = 0;
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
    const wrapper = this.getDocument().getElementById(this.wrapperId);

    if (wrapper) {
      (wrapper.querySelector('iframe') as HTMLIFrameElement).removeEventListener('load', this.loadHandlerRef as LoadHandlerFunctionType, false);
      (wrapper.parentElement as HTMLElement).removeChild(wrapper);
    }

    this.loadHandlerRef = null;
    this.resolvePromise = null;
    this.rejectPromise = null;
    this.url = '';
    this.method = '';
    this.wrapperId = '';
    super.dispose();
  }

  private validateInput(url: string, method: string): void {
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

    const form = wrapper.querySelector('form') as HTMLFormElement;
    form.action = this.url;
    form.method = this.method;
    form.target = iframeId;
    if (this.data !== null) {
      appendDataToForm(this.data, form);
    }

    fragment.appendChild(wrapper);
    this.getDocument().body.appendChild(fragment);

    const iframe = wrapper.querySelector('iframe') as HTMLIFrameElement;

    iframe.addEventListener('load', this.loadHandlerRef as LoadHandlerFunctionType, false);
  }

  private sendAsyncCore(): Promise<IframeHttpResponse> {
    return new Promise<IframeHttpResponse>((resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;

      const wrapper = this.getDocument().getElementById(this.wrapperId) as HTMLDivElement;
      try {
        (wrapper.querySelector('form') as HTMLFormElement).submit();
        this.timeoutRef = this.getWindow().setTimeout(() => {
          this.reject(new Error('TIMEOUT'));
        },
        this.options.timeout
        );
      } catch (error) {
        this.reject(error as Error);
      }
    });
  }

  private loadHandler(event: Event): void {
    this.getWindow().clearTimeout(this.redirectTimeoutRef);
    const allowRedirects = this.options.redirectTimeout > 0;

    try {
      const contentWindow = (event.target as HTMLIFrameElement).contentWindow as Window;
      // this should throw if iframe is not accessible due to 'X-Frame-Options'
      const targetPath = getUrlFullPath(contentWindow.document, contentWindow.location.href).toLowerCase();
      const desiredPath = getUrlFullPath(contentWindow.document, this.url).toLowerCase();
      const result:IframeHttpResponse = {
        data: contentWindow.document.body.textContent as string,
        error: null
      };

      if ((targetPath === desiredPath)) {
        this.resolve(result);
      } else {
        if (allowRedirects) {
          this.schedulePromiseResolve(result);
        } else {
          this.resolve(result);
        }
      }
    } catch (error) {
      if (allowRedirects) {
        this.schedulePromiseResolve({
          data: '',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          error: error as Error
        });
      } else {
        this.reject(error as Error);
      }
    }
  }

  private schedulePromiseResolve(result:IframeHttpResponse): void {
    const win = this.getWindow();
    win.clearTimeout(this.redirectTimeoutRef);
    this.redirectTimeoutRef = win.setTimeout(() => { this.resolve(result); }, this.options.redirectTimeout);
  }

  private resolve(value: IframeHttpResponse): void {
    (this.resolvePromise as ResolvePromiseFunctionType<IframeHttpResponse>)(value);
    this.dispose();
  }

  private reject(error: Error): void {
    (this.rejectPromise as RejectPromiseFunctionType)({ data: '', error: error });
    this.dispose();
  }
}
