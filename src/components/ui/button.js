import React from "react";
import { cn } from "@/lib/utils";

export const Button = React.forwardRef(
  (
    {
      className,
      variant = "primary",
      size = "md",
      disabled = false,
      isLoading = false,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

    const variants = {
      primary:
        "bg-teal-700 hover:bg-teal-800 text-white shadow-sm border border-teal-800",
      secondary:
        "bg-cyan-700 hover:bg-cyan-800 text-white shadow-sm border border-cyan-800",
      outline:
        "border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-sm",
      ghost: "hover:bg-slate-100 text-slate-700",
      destructive:
        "bg-red-600 hover:bg-red-700 text-white shadow-sm border border-red-700",
      warning:
        "bg-amber-600 hover:bg-amber-700 text-white shadow-sm border border-amber-700",
      link: "text-teal-700 underline-offset-4 hover:underline p-0 h-auto",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-9 px-4 text-sm gap-2",
      lg: "h-11 px-6 text-base gap-2.5",
      icon: "h-9 w-9 p-0",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

