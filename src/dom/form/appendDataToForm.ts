function appendInput(ownerDocument: Document, form: HTMLFormElement, name: string, value: string): void {
  const input = ownerDocument.createElement('input');
  input.name = name;
  input.value = value;
  input.type = 'hidden';
  form.appendChild(input);
}

function appendData(ownerDocument: Document, form: HTMLFormElement, data: any, parentProp: string): void {
  if (typeof data === 'object' && data != null) {
    if (data instanceof Date) {
      appendInput(ownerDocument, form, parentProp, data.toISOString());
    } else {
      Object.keys(data).forEach(prop => {
        appendData(ownerDocument, form, data[prop], parentProp ? `${parentProp}[${prop}]` : prop);
      });
    }
  } else {
    appendInput(ownerDocument, form, parentProp, data === null || data === undefined ? '' : data.toString());
  }
}

/**
 * Append an object to a form as 'input'(HTMLInputElement) elements
 * @param data The information to append to the the ´form´
 * @param form The form (HTMLFormElement) element to elements to
 * @throws {Error} if the ´form´ does not have an 'ownerDocument'
 */
// tslint:disable-next-line: ban-types
function appendDataToForm(data: Object | null, form: HTMLFormElement): void {
  if (!data)
    return;

  if (!form.ownerDocument)
    throw new Error('The "ownerDocument" of the "form" shold be the a reference to the parent window!');

  appendData(form.ownerDocument, form, data, '');
}

export { appendDataToForm };
