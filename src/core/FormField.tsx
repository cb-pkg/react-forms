import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import get from 'lodash-es/get';
import pick from 'lodash-es/pick';
import omit from 'lodash-es/omit';

import type { UseFormRegisterReturn, FieldError, RegisterOptions, InternalFieldName } from 'react-hook-form';
import { useFormContext } from 'react-hook-form';

import { useStaticErrors } from './StaticErrors';
import { messagifyValidationRules, patternsMap } from '../utils';
import { validationRuleProps } from '../constants';

export interface FormInputFuncProps<T extends InternalFieldName> {
  field: UseFormRegisterReturn<T>;
  label?: string;
  errors: FieldError;
}

export interface FormInputProps<T extends InternalFieldName> extends Omit<RegisterOptions, 'pattern'> {
  name: T;
  pattern?: RegisterOptions['pattern'] | keyof typeof patternsMap;
  label?: string;
  render?: (props: FormInputFuncProps<T>) => ReactNode;
  children?: ReactNode;
}

export const FormFieldContext = createContext<FormInputFuncProps<string> | undefined>(undefined);
export const useFormField = () => useContext(FormFieldContext);

export default function FormField<T extends InternalFieldName>({
  name,
  label,
  render,
  children,
  ...props
}: FormInputProps<T>) {
  const form = useFormContext();
  const {getFieldError, unsetFieldError} = useStaticErrors();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, rerender] = useState(false);
  const fieldRef = useRef<HTMLInputElement>();

  const ruleProps = pick(props, validationRuleProps);
  const restProps = omit(props, validationRuleProps);

  const inputProps = form.register(name, {
    ...messagifyValidationRules(ruleProps),
    ...restProps,
  });

  let newChildren = children;

  const formRef = inputProps.ref;
  inputProps.ref = (instance) => {
    formRef?.(instance);
    fieldRef.current = instance;
  };

  const errors = (get(form.formState.errors, name) ?? getFieldError(name)) as unknown as FieldError;

  useEffect(() => {
    const fn = () => {
      unsetFieldError(name);
      rerender((e) => !e);
    };

    fieldRef.current?.addEventListener?.('input', fn);
    return () => fieldRef.current?.removeEventListener?.('input', fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formFieldValue = useMemo(
    () => ({
      field: { ...inputProps },
      label,
      errors,
    }),
    [errors, inputProps, label],
  );

  if (typeof render === 'function') {
    newChildren = render({ field: { ...inputProps }, label, errors });
  }

  return <FormFieldContext.Provider value={formFieldValue}>{newChildren}</FormFieldContext.Provider>;
}
