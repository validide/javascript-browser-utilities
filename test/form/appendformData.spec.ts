import { appendDataToForm } from '../../src/index';
import { expect } from 'chai';
import 'mocha';
import { JSDOM } from 'jsdom';

export function test_appendformData() {
  describe('appendformData',
    () => {
      let form: HTMLFormElement;
      beforeEach(() => {
        const formOrNull = new JSDOM(`<!DOCTYPE html><form></form>`).window.document.querySelector('form');
        if (!formOrNull)
          throw new Error('Setup failure!');
        form = formOrNull;
      });

      it('should throw an error if "ownerDocument" is null', () => {
        expect(
          () => appendDataToForm({}, <HTMLFormElement>(<unknown>{ ownerDocument: null }))
        ).throws(Error, 'The "ownerDocument" of the "form" shold be the a reference to the parent window!');
      })

      it('should not add any data if "undefined"', () => {
        appendDataToForm(<Object>(<unknown>undefined), form);
        expect(form.querySelectorAll('input').length).to.eq(0);
      })

      it('should not add any data if "null"', () => {
        appendDataToForm(<Object>(<unknown>null), form);
        expect(form.querySelectorAll('input').length).to.eq(0);
      })

      it('should not add any data if "empty" data object', () => {
        appendDataToForm({}, form);
        expect(form.querySelectorAll('input').length).to.eq(0);
      })


      it('should add the data', () => {
        var now = new Date();
        appendDataToForm({
          num: 1,
          falseBool: false,
          trueBool: true,
          empty: '',
          und: undefined,
          nullable: null,
          date: now,
          name: 'str',
          another_object: {
            name: 'my_name',
            value: 'whatever'
          },
          array: [
            {
              key1: {
                name: 'key1'
              }
            },
            {
              key2: {
                name: 'key2'
              }
            }
          ]
        }, form);
        expect(form.querySelector<HTMLInputElement>('input[name="num"]')?.value).to.eq((1).toString());
        expect(form.querySelector<HTMLInputElement>('input[name="falseBool"]')?.value).to.eq((false).toString());
        expect(form.querySelector<HTMLInputElement>('input[name="trueBool"]')?.value).to.eq((true).toString());
        expect(form.querySelector<HTMLInputElement>('input[name="empty"]')?.value).to.eq('');
        expect(form.querySelector<HTMLInputElement>('input[name="und"]')?.value).to.eq('');
        expect(form.querySelector<HTMLInputElement>('input[name="nullable"]')?.value).to.eq('');
        expect(form.querySelector<HTMLInputElement>('input[name="date"]')?.value).to.eq(now.toISOString());
        expect(form.querySelector<HTMLInputElement>('input[name="name"]')?.value).to.eq('str');
        expect(form.querySelector<HTMLInputElement>('input[name="another_object[name]"]')?.value).to.eq('my_name');
        expect(form.querySelector<HTMLInputElement>('input[name="another_object[value]"]')?.value).to.eq('whatever');
        expect(form.querySelector<HTMLInputElement>('input[name="array[0][key1][name]"]')?.value).to.eq('key1');
        expect(form.querySelector<HTMLInputElement>('input[name="array[1][key2][name]"]')?.value).to.eq('key2');
      })
    })
}
