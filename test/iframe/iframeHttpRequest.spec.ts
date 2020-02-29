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
        () => new IframeHttpRequest(_win, 'http://www.google.com/', null, '')
      ).throws(Error, 'Method not supported ""');
    })

    it('calling send multiple times does throw an error', () => {
      expect(
        () => {

          const req = new IframeHttpRequest(_win, 'http://www.google.com/', null);
          overrideFormSubmit(_win, req, () => { });

          req.sendAsync().catch(e => { /* ignore error for this case */ });
          req.sendAsync().catch(e => { /* ignore error for this case */ });
        }
      ).throws(Error, 'The "send" method was already called!')
    })

    it('override default options', () => {
      const req = new IframeHttpRequest(_win, 'http://www.google.com/', null, 'GET', {
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
          const req = new IframeHttpRequest(_win, 'http://www.google.com/');
          req.dispose();
          req.dispose();
        }
      ).not.throws();
    })

    it('calling send with falsie data does not throw', () => {
      falsies.forEach(falsie => {
        expect(
          () => {

            const req = new IframeHttpRequest(_win, 'http://www.google.com/', <object>(<unknown>falsie));
            overrideFormSubmit(_win, req, () => { });

            req.sendAsync().catch(e => { /* ignore error for this case */ });
            req.dispose();
          }
        ).not.throws()
      });
    })

    it('calling dispose after calling send works', () => {
      expect(
        () => {
          const req = new IframeHttpRequest(_win, 'http://www.google.com/');
          overrideFormSubmit(_win, req, () => { });

          req.sendAsync().catch(e => { /* ignore error for this case */ });
          req.dispose();
        }
      ).not.throws();
    })

    it('rejects with error in case of submit error', (done) => {
      const req = new IframeHttpRequest(_win, 'http://www.google.com/');
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
      const req = new IframeHttpRequest(_win, 'http://www.google.com/', null, 'GET', {
        redirectTimeout: -1,
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

  })
}
