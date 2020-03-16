
import 'mocha';
import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import { IframeLoaderOptions, IframeLoaderEvent, IframeLoaderEvents, IframeLoader, IframeContent, IframeLoaderEventType } from '../../../src/dom/iframe'
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
    let _options: IframeLoaderOptions = {
      url: 'http://localhost:81/child',
      parent: 'body',
      events: {
        beforeCreate: (e: IframeLoaderEvent) => { _events.push(e); },
        beforeUpdate: (e: IframeLoaderEvent) => { _events.push(e); },
        beforeDestroy: (e: IframeLoaderEvent) => { _events.push(e); },
        created: (e: IframeLoaderEvent) => { _events.push(e); },
        destroyed: (e: IframeLoaderEvent) => { _events.push(e); },
        updated: (e: IframeLoaderEvent) => { _events.push(e); }
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

    it('calling dispose multiple times does not throw an error', () => {
      expect(
        () => {
          const loader = new IframeLoader(_win, { url: 'http://localhost:81/child', parent: _win.document.body })
          loader.dispose();
          loader.dispose();
        }
      ).not.throws();
    })

    it('calling init multiple times(hacky) does not add extra elements', () => {
      (<any>_testLoader).init();
      (<any>_testLoader).init();
      (<any>_testLoader).init();
      expect(_win.document.body.children.length).to.eq(1);
    })

    it('message handling', (done) => {
      // DIRTY HACK to bypass message sending and play with the origin.
      function postMessage(data: any, origin: string) {
        // add it to the queue
        _win.postMessage(data, origin);

        // trigger hander to "test it"
        (<any>_testLoader).windowMessageHandler(<unknown>{ data: data, origin: origin })
      }


      const winMessages = new Array<any>();
      const idValue = (<any>_testLoader).iframeId;
      const origin = 'http://localhost:81';

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
      (<Window>(<HTMLIFrameElement>_win.document.querySelector('iframe')).contentWindow)
        .addEventListener('message', function (event: MessageEvent) {
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
                { id: contentIframeId, busy: true, data: messageData.data },
                origin
              );
            }
            else {
              // Phase 2 of the handshake - we got the id.
              contentIframeId = messageData.id;
              afterHandshake(contentIframeId);
            }
          }
        });


      // should not throw error
      falsies.forEach(f => {
        expect(() => {
          postMessage(f, origin);
        }).not.throws();
      });

      // Should be ignored due origin stuff
      // EVT0
      _win.postMessage({ id: '123456' }, origin);

      // Should be ignored due to WRONG id
      // EVT1
      postMessage({ id: '123456' }, origin);


      // Trigger handshake
      // EVT2
      postMessage({ id: '' }, origin);


      function afterHandshake(id: string) {

        // EVT4
        postMessage({ id: '' }, origin);
        // EVT5
        postMessage({ id: id }, origin);

        // EVT6
        postMessage({ id: id, busy: true }, origin);
        // EVT7
        postMessage({ id: id, busy: false }, origin);
        // EVT8
        postMessage({ id: id, destroyed: true }, origin);
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

          falsies.forEach(f => {
            // ignore due to "mising" data
            idx++;
            expect(winMessages[idx]).to.be.eq(f, `FALSIE_${f}`);
          });

          // ignore test - EVT0
          idx++;
          expect(winMessages[idx].id).to.be.eq('123456', `ID_EVT0(${idx})`);
          expect(winMessages[idx].busy).to.be.eq(undefined, `BUSY_EVT0(${idx})`);
          expect(winMessages[idx].destroyed).to.be.eq(undefined, `DEST_EVT0(${idx})`);
          expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT0(${idx})`);

          // ignore test - EVT1
          idx++;
          expect(winMessages[idx].id).to.be.eq('123456', `ID_EVT1(${idx})`);
          expect(winMessages[idx].busy).to.be.eq(undefined, `BUSY_EVT1(${idx})`);
          expect(winMessages[idx].destroyed).to.be.eq(undefined, `DEST_EVT1(${idx})`);
          expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT1(${idx})`);

          // Handshake init event - EVT2
          idx++;
          expect(winMessages[idx].id).to.be.eq('', `ID_EVT2(${idx})`);
          expect(winMessages[idx].busy).to.be.eq(undefined, `BUSY_EVT2(${idx})`);
          expect(winMessages[idx].destroyed).to.be.eq(undefined, `DEST_EVT2(${idx})`);
          expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT2(${idx})`);

          // Handshake init event - EVT3
          idx++;
          expect(winMessages[idx].id).to.be.eq('', `ID_EVT3(${idx})`);
          expect(winMessages[idx].busy).to.be.eq(true, `BUSY_EVT3(${idx})`);
          expect(winMessages[idx].destroyed).to.be.eq(undefined, `DEST_EVT3(${idx})`);
          expect(winMessages[idx].data).to.be.eq(getHashCode(idValue).toString(10), `DATA_EVT3(${idx})`);

          // ignore test - EVT4
          idx++;
          expect(winMessages[idx].id).to.be.eq('', `ID_EVT4(${idx})`);
          expect(winMessages[idx].busy).to.be.eq(undefined, `BUSY_EVT4(${idx})`);
          expect(winMessages[idx].destroyed).to.be.eq(undefined, `DEST_EVT4(${idx})`);
          expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT4(${idx})`);

          // ignore test - EVT5
          idx++;
          expect(winMessages[idx].id).to.be.eq(idValue, `ID_EVT5(${idx})`);
          expect(winMessages[idx].busy).to.be.eq(undefined, `BUSY_EVT5(${idx})`);
          expect(winMessages[idx].destroyed).to.be.eq(undefined, `DEST_EVT5(${idx})`);
          expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT5(${idx})`);

          // set busy - EVT6
          idx++;
          expect(winMessages[idx].id).to.be.eq(idValue, `ID_EVT6(${idx})`);
          expect(winMessages[idx].busy).to.be.eq(true, `BUSY_EVT6(${idx})`);
          expect(winMessages[idx].destroyed).to.be.eq(undefined, `DEST_EVT6(${idx})`);
          expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT6(${idx})`);

          // set not busy - EVT7
          idx++;
          expect(winMessages[idx].id).to.be.eq(idValue, `ID_EVT7(${idx})`);
          expect(winMessages[idx].busy).to.be.eq(false, `BUSY_EVT7(${idx})`);
          expect(winMessages[idx].destroyed).to.be.eq(undefined, `DEST_EVT7(${idx})`);
          expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT7(${idx})`);

          // destroy - EVT8
          idx++;
          expect(winMessages[idx].id).to.be.eq(idValue, `ID_EVT8(${idx})`);
          expect(winMessages[idx].busy).to.be.eq(undefined, `BUSY_EVT8(${idx})`);
          expect(winMessages[idx].destroyed).to.be.eq(true, `DEST_EVT8(${idx})`);
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

          // CTOR - created
          idx++;
          expect(_events[idx].type).to.eq(IframeLoaderEventType.Created, `TYPE_CTOR_c(${idx})`);
          expect(_events[idx].el).to.not.eq(null, `EL_CTOR_c(${idx})`);

          // EVT5 - not busy
          idx++;
          expect(_events[idx].type).to.eq(IframeLoaderEventType.Updated, `TYPE_EVT5(${idx})`);
          expect(_events[idx].el).to.not.eq(null, `EL_EVT5(${idx})`);

          // EVT6 - busy
          idx++;
          expect(_events[idx].type).to.eq(IframeLoaderEventType.BeforeUpdate, `TYPE_EVT6(${idx})`);
          expect(_events[idx].el).to.not.eq(null, `EL_EVT6(${idx})`);

          // EVT7 - not busy
          idx++;
          expect(_events[idx].type).to.eq(IframeLoaderEventType.Updated, `TYPE_EVT7(${idx})`);
          expect(_events[idx].el).to.not.eq(null, `EL_EVT7(${idx})`);

          // EVT8.1 - beforeDestroy
          idx++;
          expect(_events[idx].type).to.eq(IframeLoaderEventType.BeforeDestroy, `TYPE_EVT8.1(${idx})`);
          expect(_events[idx].el).to.not.eq(null, `EL_EVT8.1(${idx})`);

          // EVT8.2 - destroyed
          idx++;
          expect(_events[idx].type).to.eq(IframeLoaderEventType.Destroyed, `TYPE_EVT8.2(${idx})`);
          expect(_events[idx].el).to.eq(null, `EL_EVT8.2(${idx})`);

          expect(_events.length).to.be.eq(idx + 1);
        } catch (err) {
          _events.forEach(f => console.log(JSON.stringify(f, undefined, 0)));

          throw err;
        }
      }
    })
  });
}
