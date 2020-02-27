import { generateUniqueId } from '../../src/index';
import { expect } from 'chai';
import 'mocha';
import { JSDOM } from 'jsdom';

function getNewDocument(): Document {return new JSDOM(`<!DOCTYPE html>`).window.document};

export function test_generateUniqueId() {
  describe('generateUniqueId', () => {
    let doc = getNewDocument();
    beforeEach(() => { doc = getNewDocument(); });

    it('should return an id that is unique within the DOM', () => {
      const id = generateUniqueId(doc);

      expect(id.indexOf('prefix_')).to.eq(-1);
      expect(doc.getElementById(id)).to.be.null;
    })

    it('should return an id that is unique within the DOM and starts with a prefix', () => {
      const id = generateUniqueId(doc, 'prefix_');

      expect(id.indexOf('prefix_')).to.eq(0);
      expect(doc.getElementById(id)).to.be.null;
    })

    it('should not fail for unreasonable values', () => {
      const ids = [
        generateUniqueId(doc, <string>(<unknown>undefined)),
        generateUniqueId(doc, <string>(<unknown>null)),
        generateUniqueId(doc, <string>(<unknown>false)),
        generateUniqueId(doc, <string>(<unknown>'')),
        generateUniqueId(doc, <string>(<unknown>[]))
      ];

      ids.forEach((id, idx) => {
        expect(id.length).to.be.greaterThan(0);
        expect(ids.indexOf(id)).to.eq(idx);
        expect(ids.lastIndexOf(id)).to.eq(idx);
      });
    })

    it('should return an id that is unique', () => {
      let called = 0;
      const unreasonable = [undefined, null, false, '', []];
      const fake = {
        getElementById: function(elementId: string): HTMLElement | null {
          if (called >= unreasonable.length ) {
            return doc.createElement('div');
          }
          called++;
          return <HTMLElement>(<unknown>unreasonable[called-1]);
        }
      };
      const id = generateUniqueId(<Document>(<unknown>fake), '');

      expect(id.length).to.be.greaterThan(0);
      expect(doc.getElementById(id)).to.be.null;
    })
  })
}
