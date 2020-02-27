import 'mocha';
import { getUrlOrigin } from '../../src/index';
import { expect } from 'chai';
import { JSDOM } from 'jsdom';

export function test_getUrlOrigin() {
  describe('getUrlOrigin', () => {
    let doc: Document;
    beforeEach(() => {
      doc = new JSDOM(`<!DOCTYPE html>`).window.document;
    });

    it('should return empty string if url is "undefined", "null" or empty string', () => {
      expect(getUrlOrigin(doc, <string>(<unknown>undefined))).to.eq('');
      expect(getUrlOrigin(doc, <string>(<unknown>null))).to.eq('');
      expect(getUrlOrigin(doc, '')).to.eq('');
    })

    it('should thow an error if document is "undefined"', () => {
      expect(
        () => getUrlOrigin(<Document>(<unknown>undefined), 'some value')
      ).throws(Error, 'Cannot read property \'createElement\' of undefined');
    })

    it('should thow an error if document is "null"', () => {
      expect(
        () => getUrlOrigin(<Document>(<unknown>null), 'some value')
      ).throws(Error, 'Cannot read property \'createElement\' of null');
    })

    it('should return origin', () => {
      expect(getUrlOrigin(doc, 'http://localhost')).to.eq('http://localhost');
      expect(getUrlOrigin(doc, 'http://localhost:81')).to.eq('http://localhost:81');
      expect(getUrlOrigin(doc, 'http://localhost/')).to.eq('http://localhost');
      expect(getUrlOrigin(doc, 'http://localhost:81/')).to.eq('http://localhost:81');
      expect(getUrlOrigin(doc, 'https://localhost:443/sasasasa')).to.eq('https://localhost');
      expect(getUrlOrigin(doc, 'https://localhost:444/sasasasa')).to.eq('https://localhost:444');
    })
  })
}
