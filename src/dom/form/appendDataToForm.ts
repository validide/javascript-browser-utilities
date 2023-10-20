/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function appendInput(form: HTMLFormElement, name: string, value: string): void {
  const input = form.ownerDocument.createElement('input');
  input.name = name;
  input.value = value;
  input.type = 'hidden';
  form.appendChild(input);
}

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function appendData(form: HTMLFormElement, data: any, parentProp: string): void {
  if (typeof data === 'object' && data != null) {
    if (data instanceof Date) {
      appendInput(form, parentProp, data.toISOString());
    } else {
      Object.keys(data as object).forEach(prop => {
        appendData(form, data[prop], parentProp ? `${parentProp}[${prop}]` : prop);
      });
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
    appendInput(form, parentProp, data === null || data === undefined ? '' : data.toString());
  }
}

/**
 * Append an object to a form as 'input'(HTMLInputElement) elements
 *
 * @param data The information to append to the the ´form´
 * @param form The form (HTMLFormElement) element to elements to
 * @throws {Error} if the ´form´ does not have an 'ownerDocument'
 */
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function appendDataToForm(data: Record<string, unknown> | null, form: HTMLFormElement): void {
  if (!data)
    return;

  if (!form.ownerDocument)
    throw new Error('The "ownerDocument" of the "form" should be the a reference to the parent window!');

  appendData(form, data, '');
}

export { appendDataToForm };
