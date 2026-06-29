import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export interface StrongPasswordOptions {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumber?: boolean;
  requireSpecialChar?: boolean;
}

export function IsStrongPassword(
  options?: StrongPasswordOptions,
  validationOptions?: ValidationOptions,
) {
  const config: StrongPasswordOptions = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: true,
    ...options,
  };

  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') {
            return false;
          }

          const password = value;
          const errors: string[] = [];

          if (password.length < config.minLength!) {
            errors.push(`at least ${config.minLength} characters`);
          }

          if (config.requireUppercase && !/[A-Z]/.test(password)) {
            errors.push('at least one uppercase letter');
          }

          if (config.requireLowercase && !/[a-z]/.test(password)) {
            errors.push('at least one lowercase letter');
          }

          if (config.requireNumber && !/\d/.test(password)) {
            errors.push('at least one number');
          }

          if (
            config.requireSpecialChar &&
            !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
          ) {
            errors.push('at least one special character (!@#$%^&* etc.)');
          }

          if (errors.length > 0) {
            return false;
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          const password = typeof args.value === 'string' ? args.value : '';
          const errors: string[] = [];

          if (password.length < config.minLength!) {
            errors.push(`at least ${config.minLength} characters`);
          }

          if (config.requireUppercase && !/[A-Z]/.test(password)) {
            errors.push('at least one uppercase letter');
          }

          if (config.requireLowercase && !/[a-z]/.test(password)) {
            errors.push('at least one lowercase letter');
          }

          if (config.requireNumber && !/\d/.test(password)) {
            errors.push('at least one number');
          }

          if (
            config.requireSpecialChar &&
            !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
          ) {
            errors.push('at least one special character');
          }

          return `Password must contain: ${errors.join(', ')}`;
        },
      },
    });
  };
}
