import { getUrlFullPath } from '../../src/index';
import { expect } from 'chai';
import 'mocha';
import { JSDOM } from 'jsdom';

function getNewDocument(): Document {return new JSDOM(`<!DOCTYPE html>`).window.document};

export function test_getUrlFullPath() {
  describe('getUrlFullPath', () => {
    let doc = getNewDocument();
    beforeEach(() => { doc = getNewDocument(); });

    it('should return empty string if url is "undefined", "null" or empty string', () => {
      expect(getUrlFullPath(doc, <string>(<unknown>undefined))).to.eq('');
      expect(getUrlFullPath(doc, <string>(<unknown>null))).to.eq('');
      expect(getUrlFullPath(doc, '')).to.eq('');
    })

    it('should thow an error if document is "undefined"', () => {
      expect(
        () => getUrlFullPath(<Document>(<unknown>undefined), 'some value')
      ).throws(Error, 'Cannot read property \'createElement\' of undefined');
    })

    it('should thow an error if document is "null"', () => {
      expect(
        () => getUrlFullPath(<Document>(<unknown>null), 'some value')
      ).throws(Error, 'Cannot read property \'createElement\' of null');
    })

    it('should return origin', () => {
      expect(getUrlFullPath(doc, 'http://localhost')).to.eq('http://localhost/');
      expect(getUrlFullPath(doc, 'http://localhost:81')).to.eq('http://localhost:81/');
      expect(getUrlFullPath(doc, 'http://localhost/')).to.eq('http://localhost/');
      expect(getUrlFullPath(doc, 'http://localhost:81/')).to.eq('http://localhost:81/');
      expect(getUrlFullPath(doc, 'https://localhost:443')).to.eq('https://localhost/');
      expect(getUrlFullPath(doc, 'https://localhost:443/')).to.eq('https://localhost/');
      expect(getUrlFullPath(doc, 'https://localhost:444/')).to.eq('https://localhost:444/');
      expect(getUrlFullPath(doc, 'https://localhost:444/sasasasa')).to.eq('https://localhost:444/sasasasa');
      expect(getUrlFullPath(doc, 'https://localhost:444/sasasasa/')).to.eq('https://localhost:444/sasasasa/');
      expect(getUrlFullPath(doc, 'http://localhost/seg-1/seg-2')).to.eq('http://localhost/seg-1/seg-2');
      expect(getUrlFullPath(doc, 'http://localhost/seg-1/seg-2?foo=1&bar=2#bzz')).to.eq('http://localhost/seg-1/seg-2');
    })
  })
}
