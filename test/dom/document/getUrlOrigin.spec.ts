/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import 'mocha';
import { getUrlOrigin } from '../../../src/index';
import { expect } from 'chai';
import { JSDOM } from 'jsdom';

export function test_getUrlOrigin() {
  describe('getUrlOrigin', () => {
    let doc: Document;
    beforeEach(() => {
      doc = new JSDOM('<!DOCTYPE html>').window.document;
    });

    it('should return empty string if url is "undefined", "null" or empty string', () => {
      expect(getUrlOrigin(doc, (undefined as unknown) as string)).to.eq('');
      expect(getUrlOrigin(doc, (null as unknown) as string)).to.eq('');
      expect(getUrlOrigin(doc, '')).to.eq('');
    });

    it('should thow an error if document is "undefined"', () => {
      expect(
        () => getUrlOrigin((undefined as unknown) as Document, 'some value')
      ).throws(Error, 'Cannot read property \'createElement\' of undefined');
    });

    it('should thow an error if document is "null"', () => {
      expect(
        () => getUrlOrigin((null as unknown) as Document, 'some value')
      ).throws(Error, 'Cannot read property \'createElement\' of null');
    });

    it('should return origin', () => {
      expect(getUrlOrigin(doc, 'http://localhost')).to.eq('http://localhost');
      expect(getUrlOrigin(doc, 'http://localhost:81')).to.eq('http://localhost:81');
      expect(getUrlOrigin(doc, 'http://localhost/')).to.eq('http://localhost');
      expect(getUrlOrigin(doc, 'http://localhost:81/')).to.eq('http://localhost:81');
      expect(getUrlOrigin(doc, 'https://localhost:443/sasasasa')).to.eq('https://localhost');
      expect(getUrlOrigin(doc, 'https://localhost:444/sasasasa')).to.eq('https://localhost:444');
    });
  });
}
