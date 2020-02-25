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
    appendInput(ownerDocument, form, parentProp, !data ? '' : data);
  }
}

function appendDataToForm(data: Object | null, form: HTMLFormElement): void {
  if (!data)
    return;

  if (!form.ownerDocument)
    throw new Error('The "ownerDocument" of the "form" shold be the a reference to the parent window!');

  appendData(form.ownerDocument, form, data, '');
}

export { appendDataToForm };
