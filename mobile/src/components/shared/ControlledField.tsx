import { Controller, type Control, type FieldValues, type Path, type RegisterOptions } from 'react-hook-form';
import { Field, type FieldProps } from '@/components/ui';

export type ControlledFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  rules?: RegisterOptions<T, Path<T>>;
} & Omit<FieldProps, 'value' | 'onChangeText' | 'error'>;

// Conecta nuestro Field al control de react-hook-form y expone el mensaje de error
// del propio campo.
export function ControlledField<T extends FieldValues>({ control, name, rules, ...fieldProps }: ControlledFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { value, onChange, onBlur }, fieldState }) => (
        <Field
          {...fieldProps}
          value={String(value ?? '')}
          onChangeText={onChange}
          onBlur={onBlur}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
