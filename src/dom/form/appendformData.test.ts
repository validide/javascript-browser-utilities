import { beforeEach, describe, expect, it } from "vitest";
import { getNewDocument } from "../../test/utils";
import { appendDataToForm } from "./appendDataToForm";

describe("appendformData", () => {
  let form: HTMLFormElement;
  beforeEach(() => {
    const formOrNull = getNewDocument("<!DOCTYPE html><form></form>").querySelector("form");
    if (!formOrNull) throw new Error("Setup failure!");
    form = formOrNull;
  });

  it('should throw an error if "ownerDocument" is null', () => {
    expect(() => appendDataToForm({}, { ownerDocument: null } as unknown as HTMLFormElement)).toThrowError(
      'The "ownerDocument" of the "form" should be the a reference to the parent window!',
    );
  });

  it('should not add any data if "undefined"', () => {
    appendDataToForm(undefined as unknown as Record<string, unknown>, form);
    expect(form.querySelectorAll("input").length).toBe(0);
  });

  it('should not add any data if "null"', () => {
    appendDataToForm(null as unknown as Record<string, unknown>, form);
    expect(form.querySelectorAll("input").length).toBe(0);
  });

  it('should not add any data if "empty" data object', () => {
    appendDataToForm({}, form);
    expect(form.querySelectorAll("input").length).toBe(0);
  });

  it("should add the data", () => {
    const now = new Date();
    appendDataToForm(
      {
        num: 1,
        falseBool: false,
        trueBool: true,
        empty: "",
        und: undefined,
        nullable: null,
        date: now,
        name: "str",
        another_object: {
          name: "my_name",
          value: "whatever",
        },
        array: [
          {
            key1: {
              name: "key1",
            },
          },
          {
            key2: {
              name: "key2",
            },
          },
        ],
      },
      form,
    );
    expect(form.querySelector<HTMLInputElement>('input[name="num"]')?.value).toBe((1).toString());
    expect(form.querySelector<HTMLInputElement>('input[name="falseBool"]')?.value).toBe(false.toString());
    expect(form.querySelector<HTMLInputElement>('input[name="trueBool"]')?.value).toBe(true.toString());
    expect(form.querySelector<HTMLInputElement>('input[name="empty"]')?.value).toBe("");
    expect(form.querySelector<HTMLInputElement>('input[name="und"]')?.value).toBe("");
    expect(form.querySelector<HTMLInputElement>('input[name="nullable"]')?.value).toBe("");
    expect(form.querySelector<HTMLInputElement>('input[name="date"]')?.value).toBe(now.toISOString());
    expect(form.querySelector<HTMLInputElement>('input[name="name"]')?.value).toBe("str");
    expect(form.querySelector<HTMLInputElement>('input[name="another_object[name]"]')?.value).toBe("my_name");
    expect(form.querySelector<HTMLInputElement>('input[name="another_object[value]"]')?.value).toBe("whatever");
    expect(form.querySelector<HTMLInputElement>('input[name="array[0][key1][name]"]')?.value).toBe("key1");
    expect(form.querySelector<HTMLInputElement>('input[name="array[1][key2][name]"]')?.value).toBe("key2");
  });
});
