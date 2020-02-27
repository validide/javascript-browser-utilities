import { test_getUrlOrigin } from './getUrlOrigin.spec';
import { test_getUrlFullPath } from './getUrlFullPath.spec';
import 'mocha';

export function testDocumentModule() {
  describe('DOCUMENT MODULE', () => {
    test_getUrlOrigin();
    test_getUrlFullPath();
  })
}
