
import 'mocha';
import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import { IframeLoaderOptions, IframeLoaderEvent, IframeLoaderEvents, IframeLoader, IframeContent, IframeLoaderEventType, IframeMessageState, IframeMessage } from '../../../src/dom/iframe'
import { falsies } from '../../utils';
import { getHashCode } from '../../../src/infrastructure';


export function test_iframeLoader_loader() {
  describe('IframeLoaderOptions', () => {
    it('should have public getters and setters', () => {
      const options: IframeLoaderOptions = {
        url: 'http://foo.bar',
        parent: '#aaa',
        events: {
          beforeUpdate: (e: IframeLoaderEvent) => { console.log(e); }
        },
        iframeAttributes: {
          'allowtransparency': 'true'
        }
      };

      expect(options.url).to.eq('http://foo.bar');
      expect(options.parent).to.eq('#aaa');
      expect(options.events).to.not.eq(undefined);
      expect((<IframeLoaderEvents>options.events).beforeUpdate).to.not.eq(undefined);
    })
  })

  describe('IframeLoader', () => {
    let _jsDom: JSDOM;
    let _events = new Array<IframeLoaderEvent>();
    let evtHandler = (e: IframeLoaderEvent) => { _events.push(e); };
    let _options: IframeLoaderOptions = {
      url: 'http://localhost:81/child',
      parent: 'body',
      events: {
        beforeCreate: evtHandler,
        beforeMount: evtHandler,
        beforeUpdate: evtHandler,
        beforeDestroy: evtHandler,
        created: evtHandler,
        mounted: evtHandler,
        destroyed: evtHandler,
        updated: evtHandler
      },
      iframeAttributes: {
        'allowtransparency': 'true'
      }
    }
    let _win: Window;
    let _testLoader: IframeLoader;

    beforeEach(() => {
      _jsDom = new JSDOM(undefined, { url: 'http://localhost:81/' });
      if (!_jsDom.window?.document?.defaultView)
        throw new Error('Setup failure!');
      _win = _jsDom.window.document.defaultView;
      _testLoader = new IframeLoader(_win, _options);
    });

    afterEach(() => {
      _testLoader.dispose();
      _events.length = 0;
      _win.close();
      _jsDom.window.close();
    })

    it('should have a valid window reference', () => {
      expect(
        () => new IframeLoader(<Window>(<unknown>null), { url: '' })
      ).throws(Error, 'Missing "window" reference.');
    })

    falsies.forEach(f => {
      it(`should have a valid option parameter: ${f}`, () => {
        expect(
          () => new IframeLoader(_win, <IframeLoaderOptions><unknown>f)
        ).throws(Error, 'The "options.url" value should be a non-empty string.');
      })
    });

    it('should have a valid url option', () => {
      expect(
        () => new IframeLoader(_win, { url: '' })
      ).throws(Error, 'The "options.url" value should be a non-empty string.');
    })

    it('should have a valid parent option', () => {
      let parent: any = undefined;
      expect(
        () => new IframeLoader(_win, { url: 'http://localhost:81/child', parent })
      ).throws(Error, `Failed to find parent "${parent}".`);

      parent = '';
      expect(
        () => new IframeLoader(_win, { url: 'http://localhost:81/child', parent })
      ).throws(Error, `Failed to find parent "${parent}".`);

      parent = '#some-random-id';
      expect(
        () => new IframeLoader(_win, { url: 'http://localhost:81/child', parent })
      ).throws(Error, `Failed to find parent "${parent}".`);
    })

    it('failing event handlers should not fail the operation', () => {
      let errorMessage = '';
      var originalConsoleError = console.error;
      console.error = function(message?: any, ...optionalParams: any[]) {
        errorMessage = message;
      }

      const loader = new IframeLoader(
        _win, {
          url: 'http://localhost:81/child',
          parent: _win.document.body,
          events: {
            beforeDestroy: function(e) {
              throw new Error('test');
            }
          }
        }
      );
      expect(() => { loader.dispose(); }).not.throws();
      expect(errorMessage).to.eq(`Calling the "${IframeLoaderEventType.BeforeDestroy}" handler failed.`);
      console.error = originalConsoleError;
    })

    it('failing event handlers should not fail the operation if console is missing method', () => {
      var originalConsoleError = console.error;
      (<any>console).error = undefined;

      const loader = new IframeLoader(
        _win, {
          url: 'http://localhost:81/child',
          parent: _win.document.body,
          events: {
            beforeDestroy: function(e) {
              throw new Error('test');
            }
          }
        }
      );
      expect(() => { loader.dispose(); }).not.throws();
      console.error = originalConsoleError;
    })

    it('calling dispose multiple times does not throw an error', () => {
      expect(
        () => {
          const loader = new IframeLoader(_win, { url: 'http://localhost:81/child', parent: _win.document.body })
          loader.dispose();
          loader.dispose();
        }
      ).not.throws();
    })

    // should not throw error
    falsies.forEach(f => {
      it(`calling dispose does not throw an error if iframe load event handler is missing(${f})`, () => {
        expect(
          () => {
            const loader = new IframeLoader(_win, { url: 'http://localhost:81/child', parent: _win.document.body });
            (<any>loader).onIframeLoaded = f;
            loader.dispose();
          }
        ).not.throws();
      })
    });



    it('calling init multiple times(hacky) does not add extra elements', () => {
      (<any>_testLoader).init();
      (<any>_testLoader).init();
      (<any>_testLoader).init();
      expect(_win.document.body.children.length).to.eq(1);
    })

    it('message handling', (done) => {
      const winMessages = new Array<IframeMessage>();
      const idValue = (<any>_testLoader).iframeId;
      const origin = 'http://localhost:81';

      // DIRTY HACK to bypass message sending and play with the origin.
      function postMessage(data: IframeMessage, origin: string) {
        // add it to the queue
        _win.postMessage(data, origin);

        // trigger hander to "test it"
        (<any>_testLoader).windowMessageHandler(<unknown>{ data: data, origin: origin })
      }


      _win.addEventListener('message', (e) => {
        if (e.data === 'end-the-unit-test') {
          try{
            assertMessageQueue();
            assertEventsQueue();
          }
          finally {
            done();
          }
          return;
        }

        if (e.data === 'pre-end-the-unit-test') {
          preTestEnd();
          return;
        }

        winMessages.push(e.data);
      })

      let contentIframeId = '';
      const childWin = <Window>(<HTMLIFrameElement>_win.document.querySelector('iframe')).contentWindow;
      childWin.addEventListener('message', function (event: MessageEvent) {
          //console.log('CHILD: ' + JSON.stringify(event.data));
          const messageData = event.data
            ? event.data as any
            : null;

          if (!messageData) {
            return;
          }

          // In case we do not have the iframeId it means handshake did not happen.
          if (!contentIframeId) {
            if (!messageData.id) {
              // Phase 1 of the handshake - we got the hash so send it back.
              // EVT3
              postMessage(
                { id: contentIframeId, state: IframeMessageState.Mounted, data: messageData.data },
                origin
              );
            }
            else {
              // Phase 2 of the handshake - we got the id.
              contentIframeId = messageData.id;
              postMessage(
                { id: contentIframeId, state: IframeMessageState.Mounted, data: messageData.data },
                origin
              );
              afterHandshake(contentIframeId);
            }
          }
        });

        // EVT BEFORE LOAD
        postMessage(<any>undefined, origin);
        const event = _win.document.createEvent('Event');
        event.initEvent('load', true, true);
        (<HTMLIFrameElement>_win.document.querySelector('iframe')).dispatchEvent(event);
        (<HTMLIFrameElement>_win.document.querySelector('iframe')).dispatchEvent(event);

      // should not throw error
      falsies.forEach(f => {
        expect(() => {
          postMessage(<any>f, origin);
        }).not.throws();
      });

      // Should be ignored due origin stuff
      // EVT0
      _win.postMessage({ id: '123456' }, origin);

      // Should be ignored due to WRONG id
      // EVT1
      postMessage({ id: '123456', state: IframeMessageState.Mounted }, origin);


      // Trigger handshake
      // EVT2
      postMessage({ id: '', state: IframeMessageState.Mounted }, origin);


      function afterHandshake(id: string) {

        // EVT4
        postMessage({ id: '', state: IframeMessageState.Mounted }, origin);
        // EVT5
        postMessage({ id: id, state: IframeMessageState.Updated }, origin);

        // EVT6
        postMessage({ id: id, state: IframeMessageState.BeforeUpdate }, origin);
        // EVT7
        postMessage({ id: id, state: IframeMessageState.Updated }, origin);
        // EVT_MOUNTED
        postMessage({ id: id, state: IframeMessageState.Mounted }, origin);
        // EVT_DEFAULT
        postMessage({ id: id, state: <IframeMessageState>-1 }, origin);
        // EVT8
        postMessage({ id: id, state: IframeMessageState.Destroyed }, origin);
      }

      setTimeout(function() {
        _win.postMessage('pre-end-the-unit-test', origin);
      }, 1);

      function preTestEnd() {
        _testLoader.dispose();
        _win.postMessage('end-the-unit-test', origin);
      }

      function assertMessageQueue() {
        try {
          expect(contentIframeId).to.eq(idValue);
          let idx = -1;

          // EVT BEFORE LOAD
          idx++;
          expect(winMessages[idx]).to.be.eq(undefined, `EVT_BEFORE_LOAD`);

          falsies.forEach(f => {
            // ignore due to "mising" data
            idx++;
            expect(winMessages[idx]).to.be.eq(f, `FALSIE_${f}`);
          });

          // ignore test - EVT0
          idx++;
          expect(winMessages[idx].id).to.be.eq('123456', `ID_EVT0(${idx})`);
          expect(winMessages[idx].state).to.be.eq(undefined, `STATE_EVT0(${idx})`);
          expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT0(${idx})`);

          // ignore test - EVT1
          idx++;
          expect(winMessages[idx].id).to.be.eq('123456', `ID_EVT1(${idx})`);
          expect(winMessages[idx].state).to.be.eq(IframeMessageState.Mounted, `STATE_EVT1(${idx})`);
          expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT1(${idx})`);

          // Handshake init event - EVT2
          idx++;
          expect(winMessages[idx].id).to.be.eq('', `ID_EVT2(${idx})`);
          expect(winMessages[idx].state).to.be.eq(IframeMessageState.Mounted, `STATE_EVT2(${idx})`);
          expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT2(${idx})`);

          // Handshake init event - EVT3
          idx++;
          expect(winMessages[idx].id).to.be.eq('', `ID_EVT3(${idx})`);
          expect(winMessages[idx].state).to.be.eq(IframeMessageState.Mounted, `STATE_EVT3(${idx})`);
          expect(winMessages[idx].data).to.be.eq(getHashCode(idValue).toString(10), `DATA_EVT3(${idx})`);

          // Handshake Mounted
          idx++;
          expect(winMessages[idx].id).to.be.eq(idValue, `ID_EVT3(${idx})`);
          expect(winMessages[idx].state).to.be.eq(IframeMessageState.Mounted, `STATE_EVT3(${idx})`);
          expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT3(${idx})`);

          // ignore test - EVT4
          idx++;
          expect(winMessages[idx].id).to.be.eq('', `ID_EVT4(${idx})`);
          expect(winMessages[idx].state).to.be.eq(IframeMessageState.Mounted, `STATE_EVT4(${idx})`);
          expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT4(${idx})`);

          // ignore test - EVT5
          idx++;
          expect(winMessages[idx].id).to.be.eq(idValue, `ID_EVT5(${idx})`);
          expect(winMessages[idx].state).to.be.eq(IframeMessageState.Updated, `STATE_EVT5(${idx})`);
          expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT5(${idx})`);

          // set busy - EVT6
          idx++;
          expect(winMessages[idx].id).to.be.eq(idValue, `ID_EVT6(${idx})`);
          expect(winMessages[idx].state).to.be.eq(IframeMessageState.BeforeUpdate, `STATE_EVT6(${idx})`);
          expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT6(${idx})`);

          // set not busy - EVT7
          idx++;
          expect(winMessages[idx].id).to.be.eq(idValue, `ID_EVT7(${idx})`);
          expect(winMessages[idx].state).to.be.eq(IframeMessageState.Updated, `STATE_EVT7(${idx})`);
          expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT7(${idx})`);

          // EVT_MOUNTED

          idx++;
          expect(winMessages[idx].id).to.be.eq(idValue, `ID_EVT_DEFAULT(${idx})`);
          expect(winMessages[idx].state).to.be.eq(IframeMessageState.Mounted, `STATE_EVT_DEFAULT(${idx})`);
          expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT_DEFAULT(${idx})`);

          // EVT_DEFAULT
          idx++;
          expect(winMessages[idx].id).to.be.eq(idValue, `ID_EVT_DEFAULT(${idx})`);
          expect(winMessages[idx].state).to.be.eq(<IframeMessageState>-1, `STATE_EVT_DEFAULT(${idx})`);
          expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT_DEFAULT(${idx})`);

          // destroy - EVT8
          idx++;
          expect(winMessages[idx].id).to.be.eq(idValue, `ID_EVT8(${idx})`);
          expect(winMessages[idx].state).to.be.eq(IframeMessageState.Destroyed, `STATE_EVT8(${idx})`);
          expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT8(${idx})`);

          expect(winMessages.length).to.be.eq(idx + 1);
        } catch (err) {
          //console.log(JSON.stringify(winMessages, undefined, 2))
          winMessages.forEach(f => console.log(JSON.stringify(f, undefined, 0)));

          throw err;
        }
      }

      function assertEventsQueue() {
        try {
          let idx = -1;

          // CTOR - beforeCreate
          idx++;
          expect(_events[idx].type).to.eq(IframeLoaderEventType.BeforeCreate, `TYPE_CTOR_b(${idx})`);
          expect(_events[idx].el).to.eq(null, `EL_CTOR_b(${idx})`);
          expect(_events[idx].parentEl).not.to.eq(null, `EL_CTOR_b(${idx})`);

          // CTOR - created
          idx++;
          expect(_events[idx].type).to.eq(IframeLoaderEventType.Created, `TYPE_CTOR_c(${idx})`);
          expect(_events[idx].el).to.not.eq(null, `EL_CTOR_c(${idx})`);
          expect(_events[idx].parentEl).not.to.eq(null, `EL_CTOR_c(${idx})`);

          // CTOR - before mount
          idx++;
          expect(_events[idx].type).to.eq(IframeLoaderEventType.BeforeMount, `TYPE_CTOR_c(${idx})`);
          expect(_events[idx].el).to.not.eq(null, `EL_CTOR_c(${idx})`);
          expect(_events[idx].parentEl).not.to.eq(null, `EL_CTOR_c(${idx})`);


          // CTOR - mounted
          idx++;
          expect(_events[idx].type).to.eq(IframeLoaderEventType.Mounted, `TYPE_CTOR_c(${idx})`);
          expect(_events[idx].el).to.not.eq(null, `EL_CTOR_c(${idx})`);
          expect(_events[idx].parentEl).not.to.eq(null, `EL_CTOR_c(${idx})`);


          // EVT5 - not busy
          idx++;
          expect(_events[idx].type).to.eq(IframeLoaderEventType.Updated, `TYPE_EVT5(${idx})`);
          expect(_events[idx].el).to.not.eq(null, `EL_EVT5(${idx})`);
          expect(_events[idx].parentEl).not.to.eq(null, `EL_EVT5(${idx})`);

          // EVT6 - busy
          idx++;
          expect(_events[idx].type).to.eq(IframeLoaderEventType.BeforeUpdate, `TYPE_EVT6(${idx})`);
          expect(_events[idx].el).to.not.eq(null, `EL_EVT6(${idx})`);
          expect(_events[idx].parentEl).not.to.eq(null, `EL_EVT6(${idx})`);

          // EVT7 - not busy
          idx++;
          expect(_events[idx].type).to.eq(IframeLoaderEventType.Updated, `TYPE_EVT7(${idx})`);
          expect(_events[idx].el).to.not.eq(null, `EL_EVT7(${idx})`);
          expect(_events[idx].parentEl).not.to.eq(null, `EL_EVT7(${idx})`);

          // EVT_MOUNTED

          idx++;
          expect(_events[idx].type).to.eq(IframeLoaderEventType.Mounted, `TYPE_EVT_MOUNTED(${idx})`);
          expect(_events[idx].el).to.not.eq(null, `EL_EVT_MOUNTED(${idx})`);
          expect(_events[idx].parentEl).not.to.eq(null, `EL_EVT_MOUNTED(${idx})`);

          // EVT_DEFAULT
          // <IframeMessageState>-1 -> this shall be ignored


          // EVT8.1 - beforeDestroy
          idx++;
          expect(_events[idx].type).to.eq(IframeLoaderEventType.BeforeDestroy, `TYPE_EVT8.1(${idx})`);
          expect(_events[idx].el).to.not.eq(null, `EL_EVT8.1(${idx})`);
          expect(_events[idx].parentEl).not.to.eq(null, `EL_EVT8.1(${idx})`);

          // EVT8.2 - destroyed
          idx++;
          expect(_events[idx].type).to.eq(IframeLoaderEventType.Destroyed, `TYPE_EVT8.2(${idx})`);
          expect(_events[idx].el).to.eq(null, `EL_EVT8.2(${idx})`);
          expect(_events[idx].parentEl).not.to.eq(null, `EL_EVT8.2(${idx})`);

          expect(_events.length).to.be.eq(idx + 1);
        } catch (err) {
          _events.forEach(f => console.log(JSON.stringify(f, undefined, 0)));

          throw err;
        }
      }
    })
  });
}
