/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import 'mocha';
import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import { IframeHttpRequest, IframeHttpRequestOptions, IframeHttpResponse } from '../../../src/dom/iframe/iframeHttpRequest';
import { falsies } from '../../utils';

function overrideFormSubmit(win: Window, req: IframeHttpRequest, overrideFunc: () => void) {
  // JSDOM does not implement HTMLFormElement.prototype.submit - Not implemented: HTMLFormElement.prototype.submit
  const sendAsyncCoreOriginal: Function = (req as any).sendAsyncCore;
  (req as any).sendAsyncCore = function () {
    (win.document.querySelector('form') as HTMLFormElement).submit = overrideFunc;
    return sendAsyncCoreOriginal.call(this);
  };
}

export function test_iframeHttpRequest() {
  describe('IframeHttpRequestOptions', () => {
    it('should have public getters and setters', () => {
      const options: IframeHttpRequestOptions = {
        timeout: 30,
        redirectTimeout: 3
      };
      expect(options.timeout).to.eq(30);
      expect(options.redirectTimeout).to.eq(3);
    });
  });

  describe('IframeHttpResponse', () => {
    it('should have public getters and setters', () => {
      const options: IframeHttpResponse = {
        data: '',
        error: null
      };
      expect(options.data).to.eq('');
      expect(options.error).to.be.null;
    });
  });

  describe('IframeHttpRequest', () => {
    let _win: Window;

    beforeEach(() => {
      const win = new JSDOM().window.document.defaultView;
      if (!win)
        throw new Error('Setup failure!');
      _win = win;
    });

    afterEach(() => {
      _win.close();
    });


    it('should have a default timeout of 30s', () => {
      expect(IframeHttpRequest.DEFAULT_OPTIONS.timeout).to.eq(30_000);
    });

    it('should have a default redirect timeout of 3s', () => {
      expect(IframeHttpRequest.DEFAULT_OPTIONS.redirectTimeout).to.eq(3_000);
    });

    it('should have a valid window reference', () => {
      expect(
        () => new IframeHttpRequest((null as unknown) as Window, '', null, '')
      ).throws(Error, 'Missing "window" reference.');
    });

    it('should have a valid url reference', () => {
      expect(
        () => new IframeHttpRequest(_win, (null as unknown) as string, null, '')
      ).throws(Error, 'Missing "url" reference.');
    });

    it('should have a valid url reference', () => {
      expect(
        () => new IframeHttpRequest(_win, 'http://localhost/', null, '')
      ).throws(Error, 'Method not supported ""');
    });

    it('should have a the load handler configured', () => {
      const req = (new IframeHttpRequest(_win, 'http://localhost/segment-1')) as any;
      expect(req.loadHandlerRef).to.not.be.null;
    });

    it('calling send multiple times does throw an error', () => {
      expect(
        () => {

          const req = new IframeHttpRequest(_win, 'http://localhost/', null);
          overrideFormSubmit(_win, req, () => { /* NOOP */ });

          req.sendAsync().catch(() => { /* ignore error for this case */ });
          req.sendAsync().catch(() => { /* ignore error for this case */ });
        }
      ).throws(Error, 'The "send" method was already called!');
    });

    it('override default options', () => {
      const req = new IframeHttpRequest(_win, 'http://localhost/', null, 'GET', {
        redirectTimeout: 2,
        timeout: 3
      });

      const opts: IframeHttpRequestOptions = (req as any).options;
      expect(opts.redirectTimeout).to.eq(2);
      expect(opts.timeout).to.eq(3);
      req.dispose();
    });

    it('calling dispose multiple times does not throw an error', () => {
      expect(
        () => {
          const req = new IframeHttpRequest(_win, 'http://localhost/');
          req.dispose();
          req.dispose();
        }
      ).not.throws();
    });

    falsies.forEach(falsie => {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      it(`calling send with falsie(${falsie}) data does not throw`, () => {
        expect(
          () => {
            const req = new IframeHttpRequest(_win, 'http://localhost/', (falsie as unknown) as object);
            overrideFormSubmit(_win, req, () => { /* NOOP */});

            req.sendAsync().catch(() => { /* ignore error for this case */ });
            req.dispose();
          }
        ).not.throws();
      });
    });


    it('calling dispose after calling send works', () => {
      expect(
        () => {
          const req = new IframeHttpRequest(_win, 'http://localhost/');
          overrideFormSubmit(_win, req, () => { /* NOOP */});

          req.sendAsync().catch(() => { /* ignore error for this case */ });
          req.dispose();
        }
      ).not.throws();
    });

    it('rejects with error in case of submit error', () => {
      const req = new IframeHttpRequest(_win, 'http://localhost/');
      overrideFormSubmit(_win, req, () => { throw new Error('submit error'); });
      return req.sendAsync()
        .catch((response: IframeHttpResponse) => {
          expect(response.data).to.eq('');
          expect(response.error).to.not.be.null;
          expect((response.error as Error).message).to.eq('submit error');
        })
        .finally(() => {
          req.dispose();
        });
    });

    it('calling send rejects with timeout', () => {
      const req = new IframeHttpRequest(_win, 'http://localhost/', null, 'GET', {
        redirectTimeout: 0,
        timeout: 3
      });
      overrideFormSubmit(_win, req, () => { /* NOOP */});
      return req.sendAsync()
        .catch((response: IframeHttpResponse) => {
          expect(response.data).to.eq('');
          expect(response.error).to.not.be.null;
          expect((response.error as Error).message).to.eq('TIMEOUT');
        })
        .finally(() => {
          req.dispose();
        });
    });

    it('calling send rejects on CORS error - no redirect', () => {
      const req = new IframeHttpRequest(_win, 'http://localhost/', null, 'GET', {
        redirectTimeout: 0,
        timeout: 3
      });
      overrideFormSubmit(_win, req, () => {
        const iframeRequest: any = req as any;
        iframeRequest.loadHandler({
          target: {
            get contentWindow(): Window { throw new Error('SIMULATED X-Frame-Options Error'); }
          }
        } as any);
      });
      return req.sendAsync()
        .catch((response: IframeHttpResponse) => {
          expect(response.data).to.eq('');
          expect(response.error).to.not.be.null;
          expect((response.error as Error).message).to.eq('SIMULATED X-Frame-Options Error');
        })
        .finally(() => {
          req.dispose();
        });
    });

    it('calling send rejects on CORS error - with redirect', () => {
      const req = new IframeHttpRequest(_win, 'http://localhost/', null, 'GET', {
        redirectTimeout: 3,
        timeout: 8
      });
      overrideFormSubmit(_win, req, () => {
        const iframeRequest: any = req as any;

        iframeRequest.loadHandler({
          target: {
            get contentWindow(): Window { throw new Error('SIMULATED X-Frame-Options Error (1)'); }
          }
        } as any);

        iframeRequest.loadHandler({
          target: {
            get contentWindow(): Window { throw new Error('SIMULATED X-Frame-Options Error (2)'); }
          }
        } as any);
      });
      return req.sendAsync()
        .catch((response: IframeHttpResponse) => {
          expect(response.data).to.eq('');
          expect(response.error).to.not.be.null;
          expect((response.error as Error).message).to.eq('SIMULATED X-Frame-Options Error (2)');
        })
        .finally(() => {
          req.dispose();
        });
    });

    it('calling send resolves with result - no redirect', () => {
      const req = new IframeHttpRequest(_win, 'http://localhost/segment-1', null, 'GET', {
        redirectTimeout: 0,
        timeout: 3
      });
      overrideFormSubmit(_win, req, () => {
        const iframeRequest: any = req as any;
        const iframe = iframeRequest.getDocument().querySelector('iframe') as HTMLIFrameElement;
        iframe.src = 'http://localhost/segment-1';

        const cWin = iframe.contentWindow as Window;

        cWin.document.write('TEST_RESULT');


        iframeRequest.loadHandler({
          target: iframe
        } as any);
      });
      return req.sendAsync()
        .then((response: IframeHttpResponse) => {
          expect(response.data).to.eq('TEST_RESULT');
          expect(response.error).to.be.null;
        })
        .finally(() => {
          req.dispose();
        });
    });

    it('calling send resolves with result - with redirect', () => {
      const req = new IframeHttpRequest(_win, 'http://localhost/segment-1', null, 'GET', {
        redirectTimeout: 3,
        timeout: 8
      });
      overrideFormSubmit(_win, req, () => {
        const iframeRequest: any = req as any;
        const iframe = iframeRequest.getDocument().querySelector('iframe') as HTMLIFrameElement;
        let cWin:Window;

        iframe.src = 'http://localhost/segment-2';
        cWin = (iframe.contentWindow as Window);
        cWin.document.write('TEST_RESULT_1');
        iframeRequest.loadHandler({
          target: iframe
        } as any);

        iframe.src = 'http://localhost/segment-1';
        cWin = (iframe.contentWindow as Window);
        cWin.document.write('TEST_RESULT_2');
        iframeRequest.loadHandler({
          target: iframe
        } as any);
      });
      return req.sendAsync()
        .then((response: IframeHttpResponse) => {
          expect(response.data).to.eq('TEST_RESULT_2');
          expect(response.error).to.be.null;
        })
        .finally(() => {
          req.dispose();
        });
    });

    it('calling send resolves with result - no redirect & different path', () => {
      const req = new IframeHttpRequest(_win, 'http://localhost/segment-1', null, 'GET', {
        redirectTimeout: 0,
        timeout: 3
      });
      overrideFormSubmit(_win, req, () => {
        const iframeRequest: any = req as any;
        const iframe = iframeRequest.getDocument().querySelector('iframe') as HTMLIFrameElement;
        iframe.src = 'http://localhost/segment-2';

        const cWin = iframe.contentWindow as Window;

        cWin.document.write('TEST_RESULT');


        iframeRequest.loadHandler({
          target: iframe
        } as any);
      });
      return req.sendAsync()
        .then((response: IframeHttpResponse) => {
          expect(response.data).to.eq('TEST_RESULT');
          expect(response.error).to.be.null;
        })
        .finally(() => {
          req.dispose();
        });
    });

    it('calling send resolves with result - no redirect & different path & loadHandlerRef', () => {
      const req = new IframeHttpRequest(_win, 'http://localhost/segment-1', null, 'GET', {
        redirectTimeout: 0,
        timeout: 3
      });
      overrideFormSubmit(_win, req, () => {
        const iframeRequest: any = req as any;
        const iframe = iframeRequest.getDocument().querySelector('iframe') as HTMLIFrameElement;
        iframe.src = 'http://localhost/segment-2';

        const cWin = iframe.contentWindow as Window;

        cWin.document.write('TEST_RESULT');


        iframeRequest.loadHandlerRef({
          target: iframe
        } as any);
      });
      return req.sendAsync()
        .then((response: IframeHttpResponse) => {
          expect(response.data).to.eq('TEST_RESULT');
          expect(response.error).to.be.null;
        })
        .finally(() => {
          req.dispose();
        });
    });

  });
}
