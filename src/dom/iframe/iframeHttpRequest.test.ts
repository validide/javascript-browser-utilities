import { expect } from "vitest";
import { falsies, getNewDocument } from "../../test/utils";
import { IframeHttpRequest, type IframeHttpRequestOptions, type IframeHttpResponse } from "./iframeHttpRequest";

// Helpers to access test-only/private members safely
function getPrivate<T = unknown>(obj: unknown, key: string): T {
  return (obj as unknown as Record<string, unknown>)[key] as T;
}

function setPrivate(obj: unknown, key: string, value: unknown): void {
  (obj as unknown as Record<string, unknown>)[key] = value;
}

function overrideFormSubmit(win: Window, req: IframeHttpRequest, overrideFunc: () => void) {
  const sendAsyncCoreOriginal = getPrivate<((...args: unknown[]) => unknown) | undefined>(req, "sendAsyncCore");
  setPrivate(req, "sendAsyncCore", function () {
    (win.document.querySelector("form") as HTMLFormElement).submit = overrideFunc;
    if (sendAsyncCoreOriginal) return sendAsyncCoreOriginal.call(this);
    return undefined;
  } as unknown as Function);
}

describe("IframeHttpRequestOptions", () => {
  it("should have public getters and setters", () => {
    const options: IframeHttpRequestOptions = {
      timeout: 30,
      redirectTimeout: 3,
    };
    expect(options.timeout).to.eq(30);
    expect(options.redirectTimeout).to.eq(3);
  });
});

describe("IframeHttpResponse", () => {
  it("should have public getters and setters", () => {
    const options: IframeHttpResponse = {
      data: "",
      error: null,
    };
    expect(options.data).to.eq("");
    expect(options.error).to.be.null;
  });
});

describe("IframeHttpRequest", () => {
  let win: Window;

  beforeEach(() => {
    const doc = getNewDocument();
    const w = doc.defaultView as Window | null;
    if (!w) throw new Error("Setup failure!");
    win = w;
  });

  afterEach(() => {
    win.close();
  });

  it("should have a default timeout of 30s", () => {
    expect(IframeHttpRequest.DEFAULT_OPTIONS.timeout).to.eq(30_000);
  });

  it("should have a default redirect timeout of 3s", () => {
    expect(IframeHttpRequest.DEFAULT_OPTIONS.redirectTimeout).to.eq(3_000);
  });

  it("should have a valid window reference", () => {
    expect(() => new IframeHttpRequest(null as unknown as Window, "", null, "")).throws(
      Error,
      'Missing "window" reference.',
    );
  });

  it("should have a valid url reference", () => {
    expect(() => new IframeHttpRequest(win, null as unknown as string, null, "")).throws(
      Error,
      'Missing "url" reference.',
    );
  });

  it("should have a valid url reference", () => {
    expect(() => new IframeHttpRequest(win, "http://localhost/", null, "")).throws(Error, 'Method not supported ""');
  });

  it("should have a the load handler configured", () => {
    const req = new IframeHttpRequest(win, "http://localhost/segment-1");
    expect(getPrivate<unknown>(req, "loadHandlerRef")).to.not.be.null;
  });

  it("calling send multiple times does throw an error", () => {
    expect(() => {
      const req = new IframeHttpRequest(win, "http://localhost/", null);
      overrideFormSubmit(win, req, () => {
        /* NOOP */
      });

      req.sendAsync().catch(() => {
        /* ignore error for this case */
      });
      req.sendAsync().catch(() => {
        /* ignore error for this case */
      });
    }).throws(Error, 'The "send" method was already called!');
  });

  it("override default options", () => {
    const req = new IframeHttpRequest(win, "http://localhost/", null, "GET", {
      redirectTimeout: 2,
      timeout: 3,
    });

    const opts: IframeHttpRequestOptions = getPrivate<IframeHttpRequestOptions>(req, "options");
    expect(opts.redirectTimeout).to.eq(2);
    expect(opts.timeout).to.eq(3);
    req.dispose();
  });

  it("calling dispose multiple times does not throw an error", () => {
    expect(() => {
      const req = new IframeHttpRequest(win, "http://localhost/");
      req.dispose();
      req.dispose();
    }).not.throws();
  });

  falsies.forEach((falsie) => {
    it(`calling send with falsie(${String(falsie)}) data does not throw`, () => {
      expect(() => {
        const req = new IframeHttpRequest(win, "http://localhost/", falsie as unknown as Record<string, unknown>);
        overrideFormSubmit(win, req, () => {
          /* NOOP */
        });

        req.sendAsync().catch(() => {
          /* ignore error for this case */
        });
        req.dispose();
      }).not.throws();
    });
  });

  it("calling dispose after calling send works", () => {
    expect(() => {
      const req = new IframeHttpRequest(win, "http://localhost/");
      overrideFormSubmit(win, req, () => {
        /* NOOP */
      });

      req.sendAsync().catch(() => {
        /* ignore error for this case */
      });
      req.dispose();
    }).not.throws();
  });

  it("rejects with error in case of submit error", () => {
    const req = new IframeHttpRequest(win, "http://localhost/");
    overrideFormSubmit(win, req, () => {
      throw new Error("submit error");
    });
    return req
      .sendAsync()
      .catch((response: IframeHttpResponse) => {
        expect(response.data).to.eq("");
        expect(response.error).to.not.be.null;
        expect((response.error as Error).message).to.eq("submit error");
      })
      .finally(() => {
        req.dispose();
      });
  });

  it("calling send rejects with timeout", () => {
    const req = new IframeHttpRequest(win, "http://localhost/", null, "GET", {
      redirectTimeout: 0,
      timeout: 3,
    });
    overrideFormSubmit(win, req, () => {
      /* NOOP */
    });
    return req
      .sendAsync()
      .catch((response: IframeHttpResponse) => {
        expect(response.data).to.eq("");
        expect(response.error).to.not.be.null;
        expect((response.error as Error).message).to.eq("TIMEOUT");
      })
      .finally(() => {
        req.dispose();
      });
  });

  it("calling send rejects on CORS error - no redirect", () => {
    const req = new IframeHttpRequest(win, "http://localhost/", null, "GET", {
      redirectTimeout: 0,
      timeout: 3,
    });
    overrideFormSubmit(win, req, () => {
      const iframeRequest = req as unknown as Record<string, unknown>;
      const loadHandler = getPrivate<Function>(iframeRequest, "loadHandler");
      loadHandler.call(iframeRequest, {
        target: {
          get contentWindow(): Window {
            throw new Error("SIMULATED X-Frame-Options Error");
          },
        },
      });
    });
    return req
      .sendAsync()
      .catch((response: IframeHttpResponse) => {
        expect(response.data).to.eq("");
        expect(response.error).to.not.be.null;
        expect((response.error as Error).message).to.eq("SIMULATED X-Frame-Options Error");
      })
      .finally(() => {
        req.dispose();
      });
  });

  it("calling send rejects on CORS error - with redirect", () => {
    const req = new IframeHttpRequest(win, "http://localhost/", null, "GET", {
      redirectTimeout: 3,
      timeout: 8,
    });
    overrideFormSubmit(win, req, () => {
      const iframeRequest2 = req as unknown as Record<string, unknown>;
      const loadHandler2 = getPrivate<Function>(iframeRequest2, "loadHandler");
      loadHandler2.call(iframeRequest2, {
        target: {
          get contentWindow(): Window {
            throw new Error("SIMULATED X-Frame-Options Error (1)");
          },
        },
      });

      const loadHandler2b = getPrivate<Function>(iframeRequest2, "loadHandler");
      loadHandler2b.call(iframeRequest2, {
        target: {
          get contentWindow(): Window {
            throw new Error("SIMULATED X-Frame-Options Error (2)");
          },
        },
      });
    });
    return req
      .sendAsync()
      .catch((response: IframeHttpResponse) => {
        expect(response.data).to.eq("");
        expect(response.error).to.not.be.null;
        expect((response.error as Error).message).to.eq("SIMULATED X-Frame-Options Error (2)");
      })
      .finally(() => {
        req.dispose();
      });
  });

  it("calling send resolves with result - no redirect", () => {
    const req = new IframeHttpRequest(win, "http://localhost/segment-1", null, "GET", {
      redirectTimeout: 0,
      timeout: 3,
    });
    overrideFormSubmit(win, req, () => {
      const iframeRequest3 = req as unknown as Record<string, unknown>;
      const getDocument = getPrivate<() => Document>(iframeRequest3, "getDocument");
      const iframe = getDocument.call(iframeRequest3).querySelector("iframe") as HTMLIFrameElement;
      iframe.src = "http://localhost/segment-1";

      const cWin = iframe.contentWindow as Window;

      cWin.document.write("TEST_RESULT");

      const loadHandler3 = getPrivate<Function>(iframeRequest3, "loadHandler");
      loadHandler3.call(iframeRequest3, {
        target: iframe,
      });
    });
    return req
      .sendAsync()
      .then((response: IframeHttpResponse) => {
        expect(response.data).to.eq("TEST_RESULT");
        expect(response.error).to.be.null;
      })
      .finally(() => {
        req.dispose();
      });
  });

  it("calling send resolves with result - with redirect", () => {
    const req = new IframeHttpRequest(win, "http://localhost/segment-1", null, "GET", {
      redirectTimeout: 3,
      timeout: 8,
    });
    overrideFormSubmit(win, req, () => {
      const iframeRequest4 = req as unknown as Record<string, unknown>;
      const getDocument4 = getPrivate<() => Document>(iframeRequest4, "getDocument");
      const iframe2 = getDocument4.call(iframeRequest4).querySelector("iframe") as HTMLIFrameElement;
      let cWin2: Window;

      iframe2.src = "http://localhost/segment-2";
      cWin2 = iframe2.contentWindow as Window;
      cWin2.document.write("TEST_RESULT_1");
      const loadHandler4a = getPrivate<Function>(iframeRequest4, "loadHandler");
      loadHandler4a.call(iframeRequest4, {
        target: iframe2,
      });

      iframe2.src = "http://localhost/segment-1";
      cWin2 = iframe2.contentWindow as Window;
      cWin2.document.write("TEST_RESULT_2");
      const loadHandler4b = getPrivate<Function>(iframeRequest4, "loadHandler");
      loadHandler4b.call(iframeRequest4, {
        target: iframe2,
      });
    });
    return req
      .sendAsync()
      .then((response: IframeHttpResponse) => {
        expect(response.data).to.eq("TEST_RESULT_2");
        expect(response.error).to.be.null;
      })
      .finally(() => {
        req.dispose();
      });
  });

  it("calling send resolves with result - no redirect & different path", () => {
    const req = new IframeHttpRequest(win, "http://localhost/segment-1", null, "GET", {
      redirectTimeout: 0,
      timeout: 3,
    });
    overrideFormSubmit(win, req, () => {
      const iframeRequest5 = req as unknown as Record<string, unknown>;
      const getDocument5 = getPrivate<() => Document>(iframeRequest5, "getDocument");
      const iframe3 = getDocument5.call(iframeRequest5).querySelector("iframe") as HTMLIFrameElement;
      iframe3.src = "http://localhost/segment-2";

      const cWin3 = iframe3.contentWindow as Window;

      cWin3.document.write("TEST_RESULT");

      const loadHandler5 = getPrivate<Function>(iframeRequest5, "loadHandler");
      loadHandler5.call(iframeRequest5, {
        target: iframe3,
      });
    });
    return req
      .sendAsync()
      .then((response: IframeHttpResponse) => {
        expect(response.data).to.eq("TEST_RESULT");
        expect(response.error).to.be.null;
      })
      .finally(() => {
        req.dispose();
      });
  });

  it("calling send resolves with result - no redirect & different path & loadHandlerRef", () => {
    const req = new IframeHttpRequest(win, "http://localhost/segment-1", null, "GET", {
      redirectTimeout: 0,
      timeout: 3,
    });
    overrideFormSubmit(win, req, () => {
      const iframeRequest6 = req as unknown as Record<string, unknown>;
      const getDocument6 = getPrivate<() => Document>(iframeRequest6, "getDocument");
      const iframe4 = getDocument6.call(iframeRequest6).querySelector("iframe") as HTMLIFrameElement;
      iframe4.src = "http://localhost/segment-2";

      const cWin4 = iframe4.contentWindow as Window;

      cWin4.document.write("TEST_RESULT");

      const loadHandlerRef6 = getPrivate<Function>(iframeRequest6, "loadHandlerRef");
      loadHandlerRef6.call(iframeRequest6, {
        target: iframe4,
      });
    });
    return req
      .sendAsync()
      .then((response: IframeHttpResponse) => {
        expect(response.data).to.eq("TEST_RESULT");
        expect(response.error).to.be.null;
      })
      .finally(() => {
        req.dispose();
      });
  });
});
