import 'mocha';
import { testFromModule } from './form/index.spec';
import { testDocumentModule } from './document/index.spec';
import { testIframeModule } from './iframe/index.spec';

export function test_dom() {
  describe('DOM', () => {
    testDocumentModule();
    testFromModule();
    testIframeModule();
  })
}
