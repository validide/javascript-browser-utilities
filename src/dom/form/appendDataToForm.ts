/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function appendInput(ownerDocument: Document, form: HTMLFormElement, name: string, value: string): void {
  const input = ownerDocument.createElement('input');
  input.name = name;
  input.value = value;
  input.type = 'hidden';
  form.appendChild(input);
}

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function appendData(ownerDocument: Document, form: HTMLFormElement, data: any, parentProp: string): void {
  if (typeof data === 'object' && data != null) {
    if (data instanceof Date) {
      appendInput(ownerDocument, form, parentProp, data.toISOString());
    } else {
      Object.keys(data as object).forEach(prop => {
        appendData(ownerDocument, form, data[prop], parentProp ? `${parentProp}[${prop}]` : prop);
      });
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
    appendInput(ownerDocument, form, parentProp, data === null || data === undefined ? '' : data.toString());
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
function appendDataToForm(data: any | null, form: HTMLFormElement): void {
  if (!data)
    return;

  if (!form.ownerDocument)
    throw new Error('The "ownerDocument" of the "form" shold be the a reference to the parent window!');

  appendData(form.ownerDocument, form, data, '');
}

export { appendDataToForm };
