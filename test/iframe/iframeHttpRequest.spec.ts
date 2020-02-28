import 'mocha';
import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import { IframeHttpRequest, IframeHttpRequestOptions, IframeHttpResponse } from '../../src/iframe/iframeHttpRequest';
import { falsies } from '../utils';

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
          (<any>req).sendAsyncCore = function(){ return Promise.resolve(''); }; //JSDOM does not implement HTMLFormElement.prototype.submit - Not implemented: HTMLFormElement.prototype.submit


          req.sendAsync().catch(e => { /* ignore error for this case */ });
          req.sendAsync().catch(e => { /* ignore error for this case */ });
        }
      ).throws(Error, 'The "send" method was already called!')
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
            (<any>req).sendAsyncCore = function(){ return Promise.resolve(''); }; //JSDOM does not implement HTMLFormElement.prototype.submit - Not implemented: HTMLFormElement.prototype.submit


            req.sendAsync().catch(e => { /* ignore error for this case */ });
          }
        ).not.throws()
      });
    })

    it('calling dispose after calling send works', () => {
      expect(
        () => {
          const req = new IframeHttpRequest(_win, 'http://www.google.com/');
          (<any>req).sendAsyncCore = function(){ return Promise.resolve(''); }; //JSDOM does not implement HTMLFormElement.prototype.submit - Not implemented: HTMLFormElement.prototype.submit


            req.sendAsync().catch(e => { /* ignore error for this case */ });
            req.dispose();
        }
      ).not.throws();
    })
  })
}
