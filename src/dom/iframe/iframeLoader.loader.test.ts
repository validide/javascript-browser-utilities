import { expect } from "vitest";
import { getHashCode } from "../../infrastructure";
// Refer to shared test utilities under src to avoid keeping a separate test utils
import { falsies, getDelayPromise, getNewDocument } from "../../test/utils";
import {
  IframeLoader,
  type IframeLoaderEvent,
  type IframeLoaderEvents,
  IframeLoaderEventType,
  type IframeLoaderOptions,
  type IframeMessage,
  IframeMessageState,
} from "./iframeLoader";

describe("IframeLoaderOptions", () => {
  it("should have public getters and setters", () => {
    const options: IframeLoaderOptions = {
      url: "http://foo.bar",
      parent: "#aaa",
      events: {
        beforeUpdate: (e: IframeLoaderEvent) => {
          console.log(e);
        },
      },
      iframeAttributes: {
        allowtransparency: "true",
      },
    };

    expect(options.url).to.eq("http://foo.bar");
    expect(options.parent).to.eq("#aaa");
    expect(options.events).to.not.eq(undefined);
    expect((options.events as IframeLoaderEvents).beforeUpdate).to.not.eq(undefined);
  });
});

describe("IframeLoader", () => {
  const eventsArr: IframeLoaderEvent[] = [];
  const evtHandler = (e: IframeLoaderEvent) => {
    eventsArr.push(e);
  };
  const options: IframeLoaderOptions = {
    url: "http://localhost:81/child",
    parent: "body",
    events: {
      beforeCreate: evtHandler,
      beforeMount: evtHandler,
      beforeUpdate: evtHandler,
      beforeDestroy: evtHandler,
      created: evtHandler,
      mounted: evtHandler,
      destroyed: evtHandler,
      updated: evtHandler,
    },
    iframeAttributes: {
      allowtransparency: "true",
    },
  };
  let win: Window;
  let testLoader: IframeLoader;

  beforeEach(() => {
    const doc = getNewDocument(undefined, "http://localhost:81/");
    const w = doc.defaultView as Window | null;
    if (!w) throw new Error("Setup failure!");
    win = w;
    testLoader = new IframeLoader(win, options);
  });

  afterEach(() => {
    try {
      if (testLoader && typeof (testLoader as unknown as Record<string, unknown>).dispose === "function") {
        (testLoader as unknown as { dispose: () => void }).dispose();
      }
    } catch (_e) {
      // ignore disposal errors in cleanup
    }
    eventsArr.length = 0;
    try {
      if (win && typeof (win as unknown as { close?: unknown }).close === "function") {
        (win as unknown as { close: () => void }).close();
      }
    } catch (_e) {
      // ignore
    }
  });

  it("should have a valid window reference", () => {
    expect(() => new IframeLoader(null as unknown as Window, { url: "" })).throws(Error, 'Missing "window" reference.');
  });

  falsies.forEach((f) => {
    it(`should have a valid option parameter: ${f}`, () => {
      expect(() => new IframeLoader(win, f as unknown as IframeLoaderOptions)).throws(
        Error,
        'The "options.url" value should be a non-empty string.',
      );
    });
  });

  it("should have a valid url option", () => {
    expect(() => new IframeLoader(win, { url: "" })).throws(
      Error,
      'The "options.url" value should be a non-empty string.',
    );
  });

  it("should have a valid parent option", () => {
    let parent: any;
    expect(() => new IframeLoader(win, { url: "http://localhost:81/child", parent: parent })).throws(
      Error,
      `Failed to find parent "${parent}".`,
    );

    parent = "";
    expect(() => new IframeLoader(win, { url: "http://localhost:81/child", parent: parent })).throws(
      Error,
      `Failed to find parent "${parent}".`,
    );

    parent = "#some-random-id";
    expect(() => new IframeLoader(win, { url: "http://localhost:81/child", parent: parent })).throws(
      Error,
      `Failed to find parent "${parent}".`,
    );
  });

  it("failing event handlers should not fail the operation", () => {
    let errorMessage = "";
    const originalConsoleError = console.error;
    console.error = (message?: any) => {
      errorMessage = message;
    };

    const loader = new IframeLoader(win, {
      url: "http://localhost:81/child",
      parent: win.document.body,
      events: {
        beforeDestroy: () => {
          throw new Error("test");
        },
      },
    });
    expect(() => {
      loader.dispose();
    }).not.throws();
    expect(errorMessage).to.eq(`Calling the "${IframeLoaderEventType.BeforeDestroy}" handler failed.`);
    console.error = originalConsoleError;
  });

  it("failing event handlers should not fail the operation if console is missing method", () => {
    const originalConsoleError = console.error;
    // Temporarily remove console.error safely
    (console as unknown as { error?: unknown }).error = undefined;

    const loader = new IframeLoader(win, {
      url: "http://localhost:81/child",
      parent: win.document.body,
      events: {
        beforeDestroy: () => {
          throw new Error("test");
        },
      },
    });
    expect(() => {
      loader.dispose();
    }).not.throws();
    console.error = originalConsoleError;
  });

  it("calling dispose multiple times does not throw an error", () => {
    expect(() => {
      const loader = new IframeLoader(win, { url: "http://localhost:81/child", parent: win.document.body });
      loader.dispose();
      loader.dispose();
    }).not.throws();
  });

  // should not throw error
  falsies.forEach((f) => {
    it(`calling dispose does not throw an error if iframe load event handler is missing(${f})`, () => {
      expect(() => {
        const loader = new IframeLoader(win, { url: "http://localhost:81/child", parent: win.document.body });
        (loader as unknown as Record<string, unknown>).onIframeLoaded = f;
        loader.dispose();
      }).not.throws();
    });
  });

  it("calling init multiple times(hacky) does not add extra elements", () => {
    // Call private init for testing via a safe cast
    ((testLoader as unknown as { init?: () => void }).init as Function)?.call(testLoader);
    ((testLoader as unknown as { init?: () => void }).init as Function)?.call(testLoader);
    ((testLoader as unknown as { init?: () => void }).init as Function)?.call(testLoader);
    expect(win.document.body.children.length).to.eq(1);
  });

  it("message handling", async () => {
    const winMessages: IframeMessage[] = [];
    const idValue = (testLoader as unknown as Record<string, unknown>).iframeId as string;
    const origin = "http://localhost:81";

    // DIRTY HACK to bypass message sending and play with the origin.
    function postMessage(data: IframeMessage, origin_: string) {
      // add it to the queue
      win.postMessage(data, origin_);

      // trigger hander to "test it"
      // Trigger internal windowMessageHandler via a safe cast
      (
        (testLoader as unknown as { windowMessageHandler?: (e: unknown) => void }).windowMessageHandler as Function
      )?.call(testLoader, { data: data, origin: origin_ } as unknown);
    }

    win.addEventListener("message", (e: MessageEvent<IframeMessage>) => {
      winMessages.push(e.data);
    });

    let contentIframeId = "";
    const childWin = (win.document.querySelector("iframe") as HTMLIFrameElement).contentWindow as Window;
    childWin.addEventListener("message", (event_: MessageEvent) => {
      // console.log('CHILD: ' + JSON.stringify(event.data));
      const messageData = event_.data ? event_.data : null;

      if (!messageData) {
        return;
      }

      // In case we do not have the iframeId it means handshake did not happen.
      if (!contentIframeId) {
        if (!messageData.id) {
          // Phase 1 of the handshake - we got the hash so send it back.
          // EVT3
          postMessage({ id: contentIframeId, state: IframeMessageState.Mounted, data: messageData.data }, origin);
        } else {
          // Phase 2 of the handshake - we got the id.
          contentIframeId = messageData.id;
          postMessage({ id: contentIframeId, state: IframeMessageState.Mounted, data: messageData.data }, origin);
          afterHandshake(contentIframeId);
        }
      }
    });

    // EVT BEFORE LOAD
    postMessage(undefined as unknown as IframeMessage, origin);
    const event = win.document.createEvent("Event");
    event.initEvent("load", true, true);
    (win.document.querySelector("iframe") as HTMLIFrameElement).dispatchEvent(event);
    (win.document.querySelector("iframe") as HTMLIFrameElement).dispatchEvent(event);

    // should not throw error
    falsies.forEach((f) => {
      expect(() => {
        postMessage(f as unknown as IframeMessage, origin);
      }).not.throws();
    });

    // Should be ignored due origin stuff
    // EVT0
    win.postMessage({ id: "123456" }, origin);

    // Should be ignored due to WRONG id
    // EVT1
    postMessage({ id: "123456", state: IframeMessageState.Mounted }, origin);

    // Trigger handshake
    // EVT2
    postMessage({ id: "", state: IframeMessageState.Mounted }, origin);

    await getDelayPromise(3);

    function afterHandshake(id: string) {
      // EVT4
      postMessage({ id: "", state: IframeMessageState.Mounted }, origin);
      // EVT5
      postMessage({ id: id, state: IframeMessageState.Updated }, origin);

      // EVT6
      postMessage({ id: id, state: IframeMessageState.BeforeUpdate }, origin);
      // EVT7
      postMessage({ id: id, state: IframeMessageState.Updated }, origin);
      // EVT_MOUNTED
      postMessage({ id: id, state: IframeMessageState.Mounted }, origin);
      // EVT_DEFAULT
      postMessage({ id: id, state: -1 as IframeMessageState }, origin);
      // EVT8
      postMessage({ id: id, state: IframeMessageState.Destroyed }, origin);
    }
    await getDelayPromise(3);

    testLoader.dispose();

    await getDelayPromise(3);

    try {
      expect(contentIframeId).to.eq(idValue);
      let idx = -1;

      // EVT BEFORE LOAD
      idx++;
      expect(winMessages[idx]).to.be.eq(undefined, "EVT_BEFORE_LOAD");

      falsies.forEach((f) => {
        // ignore due to "mising" data
        idx++;
        expect(winMessages[idx]).to.be.eq(f, `FALSIE_${f}`);
      });

      // ignore test - EVT0
      idx++;
      expect(winMessages[idx].id).to.be.eq("123456", `ID_EVT0(${idx})`);
      expect(winMessages[idx].state).to.be.eq(undefined, `STATE_EVT0(${idx})`);
      expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT0(${idx})`);

      // ignore test - EVT1
      idx++;
      expect(winMessages[idx].id).to.be.eq("123456", `ID_EVT1(${idx})`);
      expect(winMessages[idx].state).to.be.eq(IframeMessageState.Mounted, `STATE_EVT1(${idx})`);
      expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT1(${idx})`);

      // Handshake init event - EVT2
      idx++;
      expect(winMessages[idx].id).to.be.eq("", `ID_EVT2(${idx})`);
      expect(winMessages[idx].state).to.be.eq(IframeMessageState.Mounted, `STATE_EVT2(${idx})`);
      expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT2(${idx})`);

      // Handshake init event - EVT3
      idx++;
      expect(winMessages[idx].id).to.be.eq("", `ID_EVT3(${idx})`);
      expect(winMessages[idx].state).to.be.eq(IframeMessageState.Mounted, `STATE_EVT3(${idx})`);
      expect(winMessages[idx].data).to.be.eq(
        getHashCode(idValue as unknown as string).toString(10),
        `DATA_EVT3(${idx})`,
      );

      // Handshake Mounted
      idx++;
      expect(winMessages[idx].id).to.be.eq(idValue, `ID_EVT3(${idx})`);
      expect(winMessages[idx].state).to.be.eq(IframeMessageState.Mounted, `STATE_EVT3(${idx})`);
      expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT3(${idx})`);

      // ignore test - EVT4
      idx++;
      expect(winMessages[idx].id).to.be.eq("", `ID_EVT4(${idx})`);
      expect(winMessages[idx].state).to.be.eq(IframeMessageState.Mounted, `STATE_EVT4(${idx})`);
      expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT4(${idx})`);

      // ignore test - EVT5
      idx++;
      expect(winMessages[idx].id).to.be.eq(idValue, `ID_EVT5(${idx})`);
      expect(winMessages[idx].state).to.be.eq(IframeMessageState.Updated, `STATE_EVT5(${idx})`);
      expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT5(${idx})`);

      // set busy - EVT6
      idx++;
      expect(winMessages[idx].id).to.be.eq(idValue, `ID_EVT6(${idx})`);
      expect(winMessages[idx].state).to.be.eq(IframeMessageState.BeforeUpdate, `STATE_EVT6(${idx})`);
      expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT6(${idx})`);

      // set not busy - EVT7
      idx++;
      expect(winMessages[idx].id).to.be.eq(idValue, `ID_EVT7(${idx})`);
      expect(winMessages[idx].state).to.be.eq(IframeMessageState.Updated, `STATE_EVT7(${idx})`);
      expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT7(${idx})`);

      // EVT_MOUNTED

      idx++;
      expect(winMessages[idx].id).to.be.eq(idValue, `ID_EVT_DEFAULT(${idx})`);
      expect(winMessages[idx].state).to.be.eq(IframeMessageState.Mounted, `STATE_EVT_DEFAULT(${idx})`);
      expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT_DEFAULT(${idx})`);

      // EVT_DEFAULT
      idx++;
      expect(winMessages[idx].id).to.be.eq(idValue, `ID_EVT_DEFAULT(${idx})`);
      expect(winMessages[idx].state).to.be.eq(-1 as IframeMessageState, `STATE_EVT_DEFAULT(${idx})`);
      expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT_DEFAULT(${idx})`);

      // destroy - EVT8
      idx++;
      expect(winMessages[idx].id).to.be.eq(idValue, `ID_EVT8(${idx})`);
      expect(winMessages[idx].state).to.be.eq(IframeMessageState.Destroyed, `STATE_EVT8(${idx})`);
      expect(winMessages[idx].data).to.be.eq(undefined, `DATA_EVT8(${idx})`);

      expect(winMessages.length).to.be.eq(idx + 1);
    } catch (err) {
      // console.log(JSON.stringify(winMessages, undefined, 2))
      winMessages.forEach((f) => console.log(JSON.stringify(f, undefined, 0)));

      throw err;
    }

    try {
      let idx = -1;

      // CTOR - beforeCreate
      idx++;
      expect(eventsArr[idx].type).to.eq(IframeLoaderEventType.BeforeCreate, `TYPE_CTOR_b(${idx})`);
      expect(eventsArr[idx].el).to.eq(null, `EL_CTOR_b(${idx})`);
      expect(eventsArr[idx].parentEl).not.to.eq(null, `EL_CTOR_b(${idx})`);

      // CTOR - created
      idx++;
      expect(eventsArr[idx].type).to.eq(IframeLoaderEventType.Created, `TYPE_CTOR_c(${idx})`);
      expect(eventsArr[idx].el).to.not.eq(null, `EL_CTOR_c(${idx})`);
      expect(eventsArr[idx].parentEl).not.to.eq(null, `EL_CTOR_c(${idx})`);

      // CTOR - before mount
      idx++;
      expect(eventsArr[idx].type).to.eq(IframeLoaderEventType.BeforeMount, `TYPE_CTOR_c(${idx})`);
      expect(eventsArr[idx].el).to.not.eq(null, `EL_CTOR_c(${idx})`);
      expect(eventsArr[idx].parentEl).not.to.eq(null, `EL_CTOR_c(${idx})`);

      // CTOR - mounted
      idx++;
      expect(eventsArr[idx].type).to.eq(IframeLoaderEventType.Mounted, `TYPE_CTOR_c(${idx})`);
      expect(eventsArr[idx].el).to.not.eq(null, `EL_CTOR_c(${idx})`);
      expect(eventsArr[idx].parentEl).not.to.eq(null, `EL_CTOR_c(${idx})`);

      // EVT5 - not busy
      idx++;
      expect(eventsArr[idx].type).to.eq(IframeLoaderEventType.Updated, `TYPE_EVT5(${idx})`);
      expect(eventsArr[idx].el).to.not.eq(null, `EL_EVT5(${idx})`);
      expect(eventsArr[idx].parentEl).not.to.eq(null, `EL_EVT5(${idx})`);

      // EVT6 - busy
      idx++;
      expect(eventsArr[idx].type).to.eq(IframeLoaderEventType.BeforeUpdate, `TYPE_EVT6(${idx})`);
      expect(eventsArr[idx].el).to.not.eq(null, `EL_EVT6(${idx})`);
      expect(eventsArr[idx].parentEl).not.to.eq(null, `EL_EVT6(${idx})`);

      // EVT7 - not busy
      idx++;
      expect(eventsArr[idx].type).to.eq(IframeLoaderEventType.Updated, `TYPE_EVT7(${idx})`);
      expect(eventsArr[idx].el).to.not.eq(null, `EL_EVT7(${idx})`);
      expect(eventsArr[idx].parentEl).not.to.eq(null, `EL_EVT7(${idx})`);

      // EVT_MOUNTED

      idx++;
      expect(eventsArr[idx].type).to.eq(IframeLoaderEventType.Mounted, `TYPE_EVT_MOUNTED(${idx})`);
      expect(eventsArr[idx].el).to.not.eq(null, `EL_EVT_MOUNTED(${idx})`);
      expect(eventsArr[idx].parentEl).not.to.eq(null, `EL_EVT_MOUNTED(${idx})`);

      // EVT_DEFAULT
      // <IframeMessageState>-1 -> this shall be ignored

      // EVT8.1 - beforeDestroy
      idx++;
      expect(eventsArr[idx].type).to.eq(IframeLoaderEventType.BeforeDestroy, `TYPE_EVT8.1(${idx})`);
      expect(eventsArr[idx].el).to.not.eq(null, `EL_EVT8.1(${idx})`);
      expect(eventsArr[idx].parentEl).not.to.eq(null, `EL_EVT8.1(${idx})`);

      // EVT8.2 - destroyed
      idx++;
      expect(eventsArr[idx].type).to.eq(IframeLoaderEventType.Destroyed, `TYPE_EVT8.2(${idx})`);
      expect(eventsArr[idx].el).to.eq(null, `EL_EVT8.2(${idx})`);
      expect(eventsArr[idx].parentEl).not.to.eq(null, `EL_EVT8.2(${idx})`);

      expect(eventsArr.length).to.be.eq(idx + 1);
    } catch (err) {
      eventsArr.forEach((f) => console.log(JSON.stringify(f, undefined, 0)));

      throw err;
    }
  });
});
