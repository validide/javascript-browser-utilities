import { expect } from "vitest";
import { falsies, getDelayPromise, getNewDocument } from "../../test/utils";
import { IframeContent, type IframeMessage, IframeMessageState } from "./iframeLoader";

describe("IframeContent - Standalone", () => {
  let win: Window;

  beforeEach(() => {
    const w = getNewDocument("http://localhost:81/").defaultView as Window | null;
    if (!w) throw new Error("Setup failure!");
    win = w;
    Object.defineProperty(win, "parent", { value: w });
  });

  afterEach(() => {
    win.close();
  });

  it("should have a valid window reference", () => {
    expect(() => new IframeContent(null as unknown as Window, "")).throws(Error, 'Missing "window" reference.');
  });

  it("should have a valid origin string", () => {
    expect(() => new IframeContent(win, "")).throws(
      Error,
      'Parent origin("parentOrigin") should be a non-empty string.',
    );
  });

  it("calling dispose multiple times does not throw an error", () => {
    expect(() => {
      const content = new IframeContent(win, "http://localhost:81");
      content.dispose();
      content.dispose();
    }).not.throws();
  });

  it("should not post any messages when current window === window.parent", async () => {
    const messages: unknown[] = [];

    await new Promise<void>((resolve) => {
      win.addEventListener("message", (e) => {
        if (e.data === "end-the-unit-test") {
          expect((messages as unknown[]).length).to.be.eq(0);
          resolve();
          return;
        }

        (messages as unknown[]).push(e.data);
      });

      const content = new IframeContent(win, "http://localhost:81");
      content.signalBusyState(false);

      win.postMessage("end-the-unit-test", "*");
    });
  });
});

describe("IframeContent - Not Standalone", () => {
  let win: Window;
  let parentWin: Window;

  beforeEach(() => {
    const w = getNewDocument("http://localhost:91/").defaultView as Window | null;
    if (!w) throw new Error("Setup failure!");
    win = w;

    const prnt = getNewDocument("http://localhost:81/").defaultView as Window | null;
    if (!prnt) throw new Error("Setup failure!");
    parentWin = prnt;

    Object.defineProperty(win, "parent", { value: prnt });
    // JSDOM creates separate window instances that don't automatically deliver
    // postMessage events between them. Patch both windows to forward messages
    // to each other so parent<->child communication behaves like a browser.
    // Only dispatch the message event on the same window the method is called on.
    // Do not forward events between windows; the tests explicitly call the
    // other side when they need to simulate cross-window messaging.
    (parentWin as unknown as { postMessage?: unknown }).postMessage = ((data: unknown, _targetOrigin?: string) => {
      const evParent = new (parentWin as any).MessageEvent("message", {
        data,
        origin: parentWin.location?.origin,
        source: parentWin,
      });
      parentWin.dispatchEvent(evParent);
    }) as unknown as typeof parentWin.postMessage;

    (win as unknown as { postMessage?: unknown }).postMessage = ((data: unknown, _targetOrigin?: string) => {
      const evChild = new (win as any).MessageEvent("message", { data, origin: win.location?.origin, source: win });
      win.dispatchEvent(evChild);
    }) as unknown as typeof win.postMessage;
  });

  afterEach(() => {
    win.close();
  });

  it("should have a valid window reference", () => {
    expect(() => new IframeContent(null as unknown as Window, "")).throws(Error, 'Missing "window" reference.');
  });

  it("should have a valid origin string", () => {
    expect(() => new IframeContent(win, "")).throws(
      Error,
      'Parent origin("parentOrigin") should be a non-empty string.',
    );
  });

  it("calling dispose multiple times does not throw an error", () => {
    expect(() => {
      const content = new IframeContent(win, "http://localhost:81");
      content.dispose();
      content.dispose();
    }).not.throws();
  });

  it("should have only 1 event as handshake did not happen", async () => {
    const messages: IframeMessage[] = [];

    await new Promise<void>((resolve) => {
      parentWin.addEventListener("message", (e) => {
        if (e.data === "end-the-unit-test") {
          expect(messages.length).to.be.eq(1);
          expect(messages[0].id).to.be.eq("");

          resolve();
          return;
        }

        (messages as unknown[]).push(e.data);
      });

      const content = new IframeContent(win, "http://localhost:81");
      content.signalBusyState(false);
      parentWin.postMessage("end-the-unit-test", "http://localhost:81");
    });
  });

  it("should have all messages after handshake", async () => {
    const messages: IframeMessage[] = [];
    const idValue = "id-value";

    parentWin.addEventListener("message", (e: MessageEvent<IframeMessage>) => {
      messages.push(e.data);
    });

    const content = new IframeContent(win, "http://localhost:81");

    function postMessage(data: IframeMessage, origin: string) {
      (content as unknown as { windowMessageHandler?: (e: MessageEvent) => void }).windowMessageHandler?.({
        data: data,
        origin: origin,
      } as unknown as MessageEvent);
    }

    // Simulate a benign undefined post from the child (should be ignored by
    // the IframeContent logic). We still call it to match original test flow.
    win.postMessage(undefined, "http://localhost:91");

    falsies.forEach((f) => {
      postMessage(f as unknown as IframeMessage, "http://localhost:81");
      postMessage(
        { id: "", state: IframeMessageState.Mounted, data: f as unknown as string | undefined },
        "http://localhost:81",
      );
    });

    content.signalBusyState(true);

    postMessage({ id: "", state: IframeMessageState.Mounted, data: "id-hash" }, "http://localhost:81");
    postMessage({ id: idValue, state: IframeMessageState.Mounted }, "http://localhost:81");

    postMessage({ id: idValue, state: IframeMessageState.BeforeUpdate }, "http://localhost:81");

    content.signalBusyState(true);
    content.signalBusyState(false);

    await getDelayPromise(3);

    content.dispose();

    await getDelayPromise(3);

    try {
      let idx = 0;
      expect(messages[idx].id).to.be.eq("");

      falsies.forEach((f) => {
        idx++;
        expect(messages[idx].id).to.be.eq("");
        expect(messages[idx].state).to.be.eq(IframeMessageState.Mounted);
        expect(messages[idx].data).to.be.eq(f);
      });

      idx++;
      expect(messages[idx].id).to.be.eq("");
      expect(messages[idx].state).to.be.eq(IframeMessageState.Mounted);
      expect(messages[idx].data).to.be.eq("id-hash");

      idx++;
      expect(messages[idx].id).to.be.eq(idValue);
      expect(messages[idx].state).to.be.eq(IframeMessageState.Mounted);
      expect(messages[idx].data).to.be.eq(undefined);

      idx++;
      expect(messages[idx].id).to.be.eq(idValue);
      expect(messages[idx].state).to.be.eq(IframeMessageState.BeforeUpdate);
      expect(messages[idx].data).to.be.eq(undefined);

      idx++;
      expect(messages[idx].id).to.be.eq(idValue);
      expect(messages[idx].state).to.be.eq(IframeMessageState.BeforeUpdate);
      expect(messages[idx].data).to.be.eq(undefined);

      idx++;
      expect(messages[idx].id).to.be.eq(idValue);
      expect(messages[idx].state).to.be.eq(IframeMessageState.Updated);
      expect(messages[idx].data).to.be.eq(undefined);

      idx++;
      expect(messages[idx].id).to.be.eq(idValue, `ID: ${idx}`);
      expect(messages[idx].state).to.be.eq(IframeMessageState.BeforeUpdate);
      expect(messages[idx].data).to.be.eq(undefined, `DATA: ${idx}`);

      idx++;
      expect(messages[idx].id).to.be.eq(idValue, `ID: ${idx}`);
      expect(messages[idx].state).to.be.eq(IframeMessageState.Destroyed);
      expect(messages[idx].data).to.be.eq(undefined, `DATA: ${idx}`);
    } catch (err) {
      messages.forEach((f) => console.log(JSON.stringify(f, undefined, 0)));
      throw err;
    }
  });
});
