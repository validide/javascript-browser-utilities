import 'mocha';
import { test_getUrlOrigin } from './getUrlOrigin.spec';
import { test_getUrlFullPath } from './getUrlFullPath.spec';
import { test_generateUniqueId } from './generateUniqueId.spec';

export function testDocumentModule() {
  describe('DOCUMENT MODULE', () => {
    test_getUrlOrigin();
    test_getUrlFullPath();
    test_generateUniqueId();
  });
}
