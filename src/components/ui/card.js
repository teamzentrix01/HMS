import React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.04)] overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div
      className={cn("px-5 py-4 border-b border-slate-100 flex flex-col gap-1", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3
      className={cn("text-base font-semibold text-slate-900 tracking-tight", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn("text-xs text-slate-500", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div     className={cn("px-5 py-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div
      className={cn("px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between", className)}
      {...props}
    >
      {children}
    </div>
  );
}
