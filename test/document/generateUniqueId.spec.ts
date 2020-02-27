import 'mocha';
import { generateUniqueId } from '../../src/index';
import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import { falsies } from '../utils';

function getNewDocument(): Document { return new JSDOM(`<!DOCTYPE html>`).window.document };

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

    it('should not fail for falsies', () => {
      const ids: Array<string> = falsies.map((f) => generateUniqueId(doc, <string>(<unknown>f)));

      ids.forEach((id: string, idx: number) => {
        expect(id.length).to.be.greaterThan(0);
        expect(ids.indexOf(id)).to.eq(idx);
        expect(ids.lastIndexOf(id)).to.eq(idx);
      });
    })

    it('should return an id that is unique', () => {
      let called = 0;
      const fake = {
        getElementById: function (elementId: string): HTMLElement | null {
          if (called >= falsies.length) {
            return doc.createElement('div');
          }
          called++;
          return <HTMLElement>(<unknown>falsies[called - 1]);
        }
      };
      const id = generateUniqueId(<Document>(<unknown>fake), '');

      expect(id.length).to.be.greaterThan(0);
      expect(doc.getElementById(id)).to.be.null;
    })
  })
}
