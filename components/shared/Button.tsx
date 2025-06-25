import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'link';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  asLink?: boolean;
  href?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  isLoading = false,
  className = '',
  asLink = false,
  href,
  ...props
}) => {
  const baseStyles = "font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-150 ease-in-out inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed";

  // Using CSS variables defined in index.html for primary, accent etc.
  // Ensure primary-focus, secondary-focus, danger-focus are defined in your global CSS or Tailwind config
  // For example, primary-focus might be primary-darker or a specific focus color like indigo-500
  const variantStyles = {
    primary: "bg-primary hover:bg-primary-hover text-white focus:ring-primary border border-transparent",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-400 border border-gray-200", // More conventional secondary
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 border border-transparent",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-700 focus:ring-primary hover:text-primary", // Adjusted for better contrast with gray text
    outline: "bg-transparent border border-primary text-primary hover:bg-primary-extralight focus:ring-primary",
    link: "bg-transparent text-primary hover:text-primary-hover hover:underline focus:ring-primary p-0", // Minimal padding for link-like buttons
  };

  const sizeStyles = {
    xs: "px-2.5 py-1.5 text-xs",
    sm: "px-3 py-2 text-sm leading-4", // Adjusted for slightly more padding
    md: "px-4 py-2 text-sm", // Standard size
    lg: "px-4 py-2 text-base", // Larger text, same padding as md
    xl: "px-6 py-3 text-base", // Large button
  };

  // Icon specific size adjustments
  const iconSizeClasses = {
    xs: "h-3.5 w-3.5",
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-5 w-5",
    xl: "h-6 w-6",
  };

  const loadingStyles = isLoading ? "opacity-75 cursor-wait" : "";
  const Element = asLink ? 'a' : 'button';

  // Type assertion for props on Element
  const elementProps: any = {
    className: `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${loadingStyles} ${className}`,
    disabled: isLoading || props.disabled,
    ...props
  };
  if (asLink) {
    elementProps.href = href;
  }

  return (
    <Element {...elementProps}>
      {isLoading && (
        <svg className={`animate-spin ${leftIcon ? '-ml-0.5 mr-2' : 'mr-2'} ${iconSizeClasses[size]}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {leftIcon && !isLoading && <span className={`${children ? 'mr-2' : ''} inline-flex items-center`}>{React.cloneElement(leftIcon as React.ReactElement, { className: `${iconSizeClasses[size]} text-current` })}</span>}
      {children}
      {rightIcon && !isLoading && <span className={`${children ? 'ml-2' : ''} inline-flex items-center`}>{React.cloneElement(rightIcon as React.ReactElement, { className: `${iconSizeClasses[size]} text-current` })}</span>}
    </Element>
  );
};

export default Button;