export abstract class BaseComponent {
  protected window: Window | null;

  constructor(window: Window) {
    if (!window)
      throw new Error('Missing "window" reference.');

    this.window = window;
  }

  protected getWindow(): Window { return <Window>this.window; }

  protected getDocument(): Document { return this.getWindow().document; }

  public dispose(): void {
    this.window = null;
  }
}
