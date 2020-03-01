import 'mocha';
import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import { IframeHttpRequest, IframeHttpRequestOptions, IframeHttpResponse } from '../../src/iframe/iframeHttpRequest';
import { falsies } from '../utils';

function overrideFormSubmit(win: Window, req: IframeHttpRequest, overrideFunc: () => void) {
  //JSDOM does not implement HTMLFormElement.prototype.submit - Not implemented: HTMLFormElement.prototype.submit
  const sendAsyncCoreOriginal: Function = (<any>req).sendAsyncCore;
  (<any>req).sendAsyncCore = function () {
    (<HTMLFormElement>win.document.querySelector('form')).submit = overrideFunc;
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
    })
  })

  describe('IframeHttpResponse', () => {
    it('should have public getters and setters', () => {
      const options: IframeHttpResponse = {
        data: '',
        error: null
      };
      expect(options.data).to.eq('');
      expect(options.error).to.be.null;
    })
  })

  describe('IframeHttpRequest', () => {
    let _win: Window;

    beforeEach(() => {
      const win = new JSDOM().window.document.defaultView;
      if (!win)
        throw new Error('Setup failure!');
      _win = win;
    });

    afterEach(() => {
    })


    it('should have a default timeout of 30s', () => {
      expect(IframeHttpRequest.DEFAULT_OPTIONS.timeout).to.eq(30_000);
    })

    it('should have a default redirect timeout of 3s', () => {
      expect(IframeHttpRequest.DEFAULT_OPTIONS.redirectTimeout).to.eq(3_000);
    })

    it('should have a valid window reference', () => {
      expect(
        () => new IframeHttpRequest(<Window>(<unknown>null), '', null, '')
      ).throws(Error, 'Missing "window" reference.');
    })

    it('should have a valid url reference', () => {
      expect(
        () => new IframeHttpRequest(_win, <string>(<unknown>null), null, '')
      ).throws(Error, 'Missing "url" reference.');
    })

    it('should have a valid url reference', () => {
      expect(
        () => new IframeHttpRequest(_win, 'http://localhost/', null, '')
      ).throws(Error, 'Method not supported ""');
    })

    it('should have a the load hander configured', () => {
      const req = <any>(new IframeHttpRequest(_win, 'http://localhost/segment-1'));
      expect(req.loadHandlerRef).to.not.be.null;
    })

    it('calling send multiple times does throw an error', () => {
      expect(
        () => {

          const req = new IframeHttpRequest(_win, 'http://localhost/', null);
          overrideFormSubmit(_win, req, () => { });

          req.sendAsync().catch(() => { /* ignore error for this case */ });
          req.sendAsync().catch(() => { /* ignore error for this case */ });
        }
      ).throws(Error, 'The "send" method was already called!')
    })

    it('override default options', () => {
      const req = new IframeHttpRequest(_win, 'http://localhost/', null, 'GET', {
        redirectTimeout: 12,
        timeout: 23
      });

      const opts: IframeHttpRequestOptions = (<any>req).options;
      expect(opts.redirectTimeout).to.eq(12);
      expect(opts.timeout).to.eq(23);
      req.dispose();
    })

    it('calling dispose multiple times does not throw an error', () => {
      expect(
        () => {
          const req = new IframeHttpRequest(_win, 'http://localhost/');
          req.dispose();
          req.dispose();
        }
      ).not.throws();
    })

    it('calling send with falsie data does not throw', () => {
      falsies.forEach(falsie => {
        expect(
          () => {

            const req = new IframeHttpRequest(_win, 'http://localhost/', <object>(<unknown>falsie));
            overrideFormSubmit(_win, req, () => { });

            req.sendAsync().catch(() => { /* ignore error for this case */ });
            req.dispose();
          }
        ).not.throws()
      });
    })

    it('calling dispose after calling send works', () => {
      expect(
        () => {
          const req = new IframeHttpRequest(_win, 'http://localhost/');
          overrideFormSubmit(_win, req, () => { });

          req.sendAsync().catch(e => { /* ignore error for this case */ });
          req.dispose();
        }
      ).not.throws();
    })

    it('rejects with error in case of submit error', (done) => {
      const req = new IframeHttpRequest(_win, 'http://localhost/');
      overrideFormSubmit(_win, req, () => { throw new Error('submit error') });
      req.sendAsync()
        .catch((response: IframeHttpResponse) => {
          expect(response.data).to.eq('');
          expect(response.error).to.not.be.null;
          expect((<Error>response.error).message).to.eq('submit error');
        })
        .finally(() => {
          req.dispose();
          done();
        })
    })

    it('calling send rejects with timeout', (done) => {
      const req = new IframeHttpRequest(_win, 'http://localhost/', null, 'GET', {
        redirectTimeout: 0,
        timeout: 5
      });
      overrideFormSubmit(_win, req, () => { });
      req.sendAsync()
        .catch((response: IframeHttpResponse) => {
          expect(response.data).to.eq('');
          expect(response.error).to.not.be.null;
          expect((<Error>response.error).message).to.eq('TIMEOUT');
        })
        .finally(() => {
          req.dispose();
          done();
        })
    })

    it('calling send rejects on CORS error - no redirect', (done) => {
      const req = new IframeHttpRequest(_win, 'http://localhost/', null, 'GET', {
        redirectTimeout: 0,
        timeout: 10
      });
      overrideFormSubmit(_win, req, function() {
        const ifrmaeRequest: any = <any>req;
        ifrmaeRequest.loadHandler(<any>{
          target: {
            get contentWindow(): Window { throw new Error('SIMULATED X-Frame-Options Error') }
          },
        });
      });
      req.sendAsync()
        .catch((response: IframeHttpResponse) => {
          expect(response.data).to.eq('');
          expect(response.error).to.not.be.null;
          expect((<Error>response.error).message).to.eq('SIMULATED X-Frame-Options Error');
        })
        .finally(() => {
          req.dispose();
          done();
        })
    })

    it('calling send rejects on CORS error - with redirect', (done) => {
      const req = new IframeHttpRequest(_win, 'http://localhost/', null, 'GET', {
        redirectTimeout: 5,
        timeout: 15
      });
      overrideFormSubmit(_win, req, function() {
        const ifrmaeRequest: any = <any>req;

        ifrmaeRequest.loadHandler(<any>{
          target: {
            get contentWindow(): Window { throw new Error('SIMULATED X-Frame-Options Error (1)') }
          },
        });

        ifrmaeRequest.loadHandler(<any>{
          target: {
            get contentWindow(): Window { throw new Error('SIMULATED X-Frame-Options Error (2)') }
          },
        });
      });
      req.sendAsync()
        .catch((response: IframeHttpResponse) => {
          expect(response.data).to.eq('');
          expect(response.error).to.not.be.null;
          expect((<Error>response.error).message).to.eq('SIMULATED X-Frame-Options Error (2)');
        })
        .finally(() => {
          req.dispose();
          done();
        })
    })

    it('calling send resolves with result - no redirect', (done) => {
      const req = new IframeHttpRequest(_win, 'http://localhost/segment-1', null, 'GET', {
        redirectTimeout: 0,
        timeout: 10
      });
      overrideFormSubmit(_win, req, function() {
        const ifrmaeRequest: any = <any>req;
        const iframe = <HTMLIFrameElement>ifrmaeRequest.getDocument().querySelector('iframe');
        iframe.src = 'http://localhost/segment-1';

        const cWin = <Window>iframe.contentWindow;

        cWin.document.write('TEST_RESULT');


        ifrmaeRequest.loadHandler(<any>{
          target: iframe,
        });
      });
      req.sendAsync()
        .then((response: IframeHttpResponse) => {
          expect(response.data).to.eq('TEST_RESULT');
          expect(response.error).to.be.null;
        })
        .finally(() => {
          req.dispose();
          done();
        })
    })

    it('calling send resolves with result - with redirect', (done) => {
      const req = new IframeHttpRequest(_win, 'http://localhost/segment-1', null, 'GET', {
        redirectTimeout: 3,
        timeout: 10
      });
      overrideFormSubmit(_win, req, function() {
        const ifrmaeRequest: any = <any>req;
        const iframe = <HTMLIFrameElement>ifrmaeRequest.getDocument().querySelector('iframe');
        let cWin:Window;

        iframe.src = 'http://localhost/segment-2';
        cWin = <Window>iframe.contentWindow;
        cWin.document.write('TEST_RESULT_1');
        ifrmaeRequest.loadHandler(<any>{
          target: iframe,
        });

        iframe.src = 'http://localhost/segment-1';
        cWin = <Window>iframe.contentWindow;
        cWin.document.write('TEST_RESULT_2');
        ifrmaeRequest.loadHandler(<any>{
          target: iframe,
        });
      });
      req.sendAsync()
        .then((response: IframeHttpResponse) => {
          expect(response.data).to.eq('TEST_RESULT_2');
          expect(response.error).to.be.null;
        })
        .catch(console.log)
        .finally(() => {
          req.dispose();
          done();
        })
    })

    it('calling send resolves with result - no redirect & different path', (done) => {
      const req = new IframeHttpRequest(_win, 'http://localhost/segment-1', null, 'GET', {
        redirectTimeout: 0,
        timeout: 10
      });
      overrideFormSubmit(_win, req, function() {
        const ifrmaeRequest: any = <any>req;
        const iframe = <HTMLIFrameElement>ifrmaeRequest.getDocument().querySelector('iframe');
        iframe.src = 'http://localhost/segment-2';

        const cWin = <Window>iframe.contentWindow;

        cWin.document.write('TEST_RESULT');


        ifrmaeRequest.loadHandler(<any>{
          target: iframe,
        });
      });
      req.sendAsync()
        .then((response: IframeHttpResponse) => {
          expect(response.data).to.eq('TEST_RESULT');
          expect(response.error).to.be.null;
        })
        .finally(() => {
          req.dispose();
          done();
        })
    })

    it('calling send resolves with result - no redirect & different path & loadHandlerRef', (done) => {
      const req = new IframeHttpRequest(_win, 'http://localhost/segment-1', null, 'GET', {
        redirectTimeout: 0,
        timeout: 10
      });
      overrideFormSubmit(_win, req, function() {
        const ifrmaeRequest: any = <any>req;
        const iframe = <HTMLIFrameElement>ifrmaeRequest.getDocument().querySelector('iframe');
        iframe.src = 'http://localhost/segment-2';

        const cWin = <Window>iframe.contentWindow;

        cWin.document.write('TEST_RESULT');


        ifrmaeRequest.loadHandlerRef(<any>{
          target: iframe,
        });
      });
      req.sendAsync()
        .then((response: IframeHttpResponse) => {
          expect(response.data).to.eq('TEST_RESULT');
          expect(response.error).to.be.null;
        })
        .finally(() => {
          req.dispose();
          done();
        })
    })

  })
}
