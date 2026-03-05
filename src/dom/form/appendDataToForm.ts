function appendInput(form: HTMLFormElement, name: string, value: string): void {
  const input = form.ownerDocument.createElement("input");
  input.name = name;
  input.value = value;
  input.type = "hidden";
  form.appendChild(input);
}

function appendData(form: HTMLFormElement, data: unknown, parentProp: string): void {
  if (typeof data === "object" && data != null) {
    if (data instanceof Date) {
      appendInput(form, parentProp, data.toISOString());
    } else {
      const obj = data as Record<string, unknown>;
      Object.keys(obj).forEach((prop) => {
        appendData(form, obj[prop], parentProp ? `${parentProp}[${prop}]` : prop);
      });
    }
  } else {
    appendInput(form, parentProp, data === null || data === undefined ? "" : String(data));
  }
}

/**
 * Append an object to a form as 'input'(HTMLInputElement) elements
 *
 * @param data The information to append to the the ´form´
 * @param form The form (HTMLFormElement) element to elements to
 * @throws {Error} if the ´form´ does not have an 'ownerDocument'
 */
function appendDataToForm(data: Record<string, unknown> | null, form: HTMLFormElement): void {
  if (!data) return;

  if (!form.ownerDocument)
    throw new Error('The "ownerDocument" of the "form" should be the a reference to the parent window!');

  appendData(form, data, "");
}

export { appendDataToForm };
