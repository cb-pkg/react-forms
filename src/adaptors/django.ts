import type { FieldErrors } from 'react-hook-form';

export type ApiErrors = {
  [FieldName: string]: ApiErrors | ApiErrors[] | string[];
};

export function drfErrorsAdaptor(errors: ApiErrors) {
  function handleObject(err: ApiErrors) {
    const formErrors: FieldErrors = {};

    for (const [fieldName, error] of Object.entries(err)) {
      if (Array.isArray(error)) {
        if (typeof error[0] === 'string') {
          formErrors[fieldName] = {
            type: 'validate',
            types: (error as string[]).reduce((acc, el, i) => ({...acc, [`error${i}`]: el}), {}),
            message: error[0],
          };
        } else if (typeof error[0] === 'object') {
          formErrors[fieldName] = (error as ApiErrors[]).map((e) => handleObject(e)) as any;
        } else {
          // todo: maybe case case will never occur
        }
      } else if (typeof error === 'object') {
        formErrors[fieldName] = handleObject(error);
      } else if (typeof error === 'string') {
        formErrors[fieldName] = {
          type: 'validate',
          message: error,
        };
      }
    }

    return formErrors;
  }

  return handleObject(errors);
}
