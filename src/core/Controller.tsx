import { Controller as BaseController, useFormContext } from 'react-hook-form';
import type { FieldValues, Path } from 'react-hook-form';

import get from 'lodash-es/get';
import pick from 'lodash-es/pick';
import omit from 'lodash-es/omit';
import unset from 'lodash-es/unset';

import { messagifyValidationRules, render, getDisplayName } from '../utils';
import { validationRuleProps } from '../constants';
import { Props } from '../types';
import React, { ElementType, Fragment } from 'react';
import { RegisterOptions } from 'react-hook-form/dist/types/validator';
import { Control, FieldPathValue, UseFormStateReturn } from 'react-hook-form/dist/types';
import { ControllerFieldState, ControllerRenderProps } from 'react-hook-form/dist/types/controller';

interface RenderProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends Path<TFieldValues> = Path<TFieldValues>,
> {
  field: ControllerRenderProps<TFieldValues, TName>;
  fieldState: ControllerFieldState;
  formState: UseFormStateReturn<TFieldValues>;
}

export type ComponentProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends Path<TFieldValues> = Path<TFieldValues>,
  TTag extends ElementType = typeof Fragment
> =
  {
    name: TName;
    shouldUnregister?: boolean;
    defaultValue?: FieldPathValue<TFieldValues, TName>;
    control?: Control<TFieldValues>;
    render?: (renderProps: RenderProps<TFieldValues, TName>) => React.ReactElement;
    propsAdapter?: (renderProps: RenderProps<TFieldValues, TName>) => Partial<Props<TTag>>
  }
  & Omit<RegisterOptions<TFieldValues, TName>, 'valueAsNumber' | 'valueAsDate' | 'setValueAs' | 'disabled'>
  & Props<TTag>;

export default function Controller<
  TFieldValues extends FieldValues = FieldValues,
  TName extends Path<TFieldValues> = Path<TFieldValues>,
  TTag extends ElementType = typeof Fragment
>(props: ComponentProps<TFieldValues, TName, TTag>) {
  const form = useFormContext();
  const rulesProps = pick(props, validationRuleProps);
  const cProps = pick(props, ['shouldUnregister', 'defaultValue'] as const);

  return (
    <BaseController
      {...cProps}
      name={props.name as any}
      rules={{
        ...messagifyValidationRules(rulesProps),
        validate: rulesProps.validate,
      }}
      render={(renderProps) => {
        // wraps onChange callback of base controller
        // to remove api errors on change
        // and also to trim string values
        const formOnChange = renderProps.field.onChange;
        renderProps.field.onChange = (e) => {
          // eslint-disable-next-line no-underscore-dangle
          unset((form.control as any)._apiErrors, props.name);
          console.log(e);
          if (typeof e?.target?.value === 'string') {
            e.target.value = e.target.value.trim();
          }
          formOnChange(e);
        };

        // add api error to field if available
        renderProps.fieldState = new Proxy(renderProps.fieldState, {
          get(target: ControllerFieldState, prop: string | symbol, receiver: any): any {
            if (prop === 'error') {
              return Reflect.get(target, prop, receiver) ?? get((form.control as any)._apiErrors, props.name);
            }

            return Reflect.get(target, prop, receiver);
          }
        });

        if (props.as) {
          const theirProps = omit(props, [
            ...validationRuleProps,
            'shouldUnregister', 'defaultValue', 'name', 'propsAdapter',
          ]);
          let ourProps = {};

          // compute component props by using provide propsAdapter prop
          // or by using global component propsAdapter config
          if (props.propsAdapter) {
            ourProps = props.propsAdapter(renderProps as any);
          } else {
            console.warn(
              `[Controller.Renderer]: No propsAdaptor found for element ${getDisplayName(props.as)} ` +
              `while rending Controller for '${props.name}' field`,
            );
          }

          return render({
            ourProps,
            theirProps,
            defaultTag: Fragment,
            name: 'Controller.Renderer',
          });
        }

        return (props.render as any)?.(renderProps);
      }}
    />
  );
}
