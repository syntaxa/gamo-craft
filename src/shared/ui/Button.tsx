import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

export function Button(props: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  const { className, children, ...rest } = props;
  return (
    <button className={`btn ${className ?? ''}`.trim()} {...rest}>
      {children}
    </button>
  );
}
