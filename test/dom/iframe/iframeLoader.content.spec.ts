import 'mocha';
import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import { IframeContent, IframeMessage, IframeMessageState } from '../../../src/dom/iframe/iframeLoader';
import { falsies } from '../../utils';

export function test_iframeLoader_content() {
  describe('IframeContent - Standalone', () => {
    let _win: Window;

    beforeEach(() => {
      const win = new JSDOM(undefined, { url: 'http://localhost:81/' }).window.document.defaultView;
      if (!win)
        throw new Error('Setup failure!');
      _win = win;
      Object.defineProperty(_win, 'parent', { value: win });
    });

    afterEach(() => {
      _win.close();
    })

    it('should have a valid window reference', () => {
      expect(
        () => new IframeContent(<Window>(<unknown>null), '')
      ).throws(Error, 'Missing "window" reference.');
    })

    it('should have a valid origin string', () => {
      expect(
        () => new IframeContent(_win, '')
      ).throws(Error, 'Parent origin("parentOrigin") should be a non-empty string.');
    })

    it('calling dispose multiple times does not throw an error', () => {
      expect(
        () => {
          const content = new IframeContent(_win, 'http://localhost:81');
          content.dispose();
          content.dispose();
        }
      ).not.throws();
    })



    it('should not post any messages when current window === window.parent', (done) => {
      const messages = new Array<any>();

      _win.addEventListener('message', (e) => {
        if (e.data === 'end-the-unit-test') {
          expect(messages.length).to.be.eq(0);
          done();
          return;
        }

        messages.push(e.data);
      })

      const content = new IframeContent(_win, 'http://localhost:81');
      content.signalBusyState(false);

      _win.postMessage('end-the-unit-test', '*')
    })
  })

  describe('IframeContent - Not Standalone', () => {
    let _win: Window;
    let _parent: Window;


    beforeEach(() => {
      const win = new JSDOM(undefined, { url: 'http://localhost:91/' }).window.document.defaultView;
      if (!win)
        throw new Error('Setup failure!');
      _win = win;

      const prnt = new JSDOM(undefined, { url: 'http://localhost:81/' }).window.document.defaultView;
      if (!prnt)
        throw new Error('Setup failure!');
      _parent = prnt;

      Object.defineProperty(_win, 'parent', { value: prnt });
    });

    afterEach(() => {
      _win.close();
    })

    it('should have a valid window reference', () => {
      expect(
        () => new IframeContent(<Window>(<unknown>null), '')
      ).throws(Error, 'Missing "window" reference.');
    })

    it('should have a valid origin string', () => {
      expect(
        () => new IframeContent(_win, '')
      ).throws(Error, 'Parent origin("parentOrigin") should be a non-empty string.');
    })

    it('calling dispose multiple times does not throw an error', () => {
      expect(
        () => {
          const content = new IframeContent(_win, 'http://localhost:81');
          content.dispose();
          content.dispose();
        }
      ).not.throws();
    })

    it('should have only 1 event as handshake did not happen', (done) => {
      const messages = new Array<any>();

      _parent.addEventListener('message', (e) => {
        if (e.data === 'end-the-unit-test') {
          expect(messages.length).to.be.eq(1);
          expect(messages[0].id).to.be.eq('');


          done();
          return;
        }

        messages.push(e.data);
      })

      const content = new IframeContent(_win, 'http://localhost:81');
      content.signalBusyState(false);
      _parent.postMessage('end-the-unit-test', 'http://localhost:81')
    })

    it('should have all messages after handshake', (done) => {
      const messages = new Array<IframeMessage>();
      const content = new IframeContent(_win, 'http://localhost:81');
      const idValue = 'id-value';

      // DIRTY HACK to bypass message sending and play with the origin.
      function postMessage(data: IframeMessage, origin: string) {
        (<any>content).windowMessageHandler(<unknown>{ data: data, origin: origin })
      }

      _parent.addEventListener('message', (e) => {
        if (e.data === 'end-the-unit-test') {
          try {
            //console.log(JSON.stringify(messages, undefined, 2))
            //expect(messages.length).to.be.eq(2);
            let idx = 0;
            // Handshake init event
            expect(messages[idx].id).to.be.eq('');

            falsies.forEach(f => {
              idx++;
              expect(messages[idx].id).to.be.eq('');
              expect(messages[idx].state).to.be.eq(IframeMessageState.Mounted);
              expect(messages[idx].data).to.be.eq(f);
            });

            idx++;
            // Handshake reply event
            expect(messages[idx].id).to.be.eq('');
            expect(messages[idx].state).to.be.eq(IframeMessageState.Mounted);
            expect(messages[idx].data).to.be.eq('id-hash');

            idx++;
            // Signal MOUNTED from INIT
            expect(messages[idx].id).to.be.eq(idValue);
            expect(messages[idx].state).to.be.eq(IframeMessageState.Mounted);
            expect(messages[idx].data).to.be.eq(undefined);

            idx++;
            //Busy from EVT_PRE_HS
            expect(messages[idx].id).to.be.eq(idValue);
            expect(messages[idx].state).to.be.eq(IframeMessageState.BeforeUpdate);
            expect(messages[idx].data).to.be.eq(undefined);

            idx++;
            // Signal busy from call
            expect(messages[idx].id).to.be.eq(idValue);
            expect(messages[idx].state).to.be.eq(IframeMessageState.BeforeUpdate);
            expect(messages[idx].data).to.be.eq(undefined);

            idx++;
            // Signal not busy from call
            expect(messages[idx].id).to.be.eq(idValue);
            expect(messages[idx].state).to.be.eq(IframeMessageState.Updated);
            expect(messages[idx].data).to.be.eq(undefined);

            idx++;
            // Signal busy from dispose
            expect(messages[idx].id).to.be.eq(idValue, `ID: ${idx}`);
            expect(messages[idx].state).to.be.eq(IframeMessageState.BeforeUpdate);
            expect(messages[idx].data).to.be.eq(undefined, `DATA: ${idx}`);

            idx++;
            // Signal dispose
            expect(messages[idx].id).to.be.eq(idValue, `ID: ${idx}`);
            expect(messages[idx].state).to.be.eq(IframeMessageState.Destroyed);
            expect(messages[idx].data).to.be.eq(undefined, `DATA: ${idx}`);

          } catch (err) {
            messages.forEach(f => console.log(JSON.stringify(f, undefined, 0)));
            throw err;
          }
          finally {
            done();
          }

          return;
        }

        if (e.data === 'pre-end-the-unit-test') {
          content.dispose();
          _parent.postMessage('end-the-unit-test', 'http://localhost:81');
          return;
        }

        messages.push(e.data);
      })

      // this should be ignored by "content" due to origin
      _win.postMessage(undefined, 'http://localhost:91');

      falsies.forEach(f => {
        postMessage(<any><unknown>f, 'http://localhost:81');
        postMessage({ id: '', state: IframeMessageState.Mounted, data: <any><unknown>f }, 'http://localhost:81');
      });

      //EVT_PRE_HS Scheduled to be delivered after handshake
      content.signalBusyState(true);


      // Phase 1 handshake -> parent sends hash
      postMessage({ id: '', state: IframeMessageState.Mounted, data: 'id-hash' }, 'http://localhost:81');
      // Phase 2 handshake -> parent sends id
      postMessage({ id: idValue, state: IframeMessageState.Mounted }, 'http://localhost:81');

      // Check we bypas handshake
      postMessage({ id: idValue, state: IframeMessageState.BeforeUpdate }, 'http://localhost:81');

      content.signalBusyState(true);
      content.signalBusyState(false);
      _parent.postMessage('pre-end-the-unit-test', 'http://localhost:81');
    })
  })
}
