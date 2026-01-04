"use client";
import React from 'react';
import { clsx } from 'clsx';
import { motion, HTMLMotionProps } from 'framer-motion';

// Union type allowing button props OR anchor props
type ButtonProps = {
  variant?: 'primary' | 'outline' | 'accent';
  children: React.ReactNode;
  as?: 'button' | 'a';
  href?: string;
  className?: string;
} & (HTMLMotionProps<"button"> | HTMLMotionProps<"a">);

// Exporting a helper for consistency if needed, but for now just export the component.
// Ideally we should use cva. 
// ...
// Actually, I'll add buttonVariants support to match shadcn/ui pattern expected by ChatWrapper.
// But since I don't have cva, I will just export a simple function.

export const buttonVariants = ({ variant = "primary", className }: { variant?: "primary" | "secondary" | "outline" | "accent" | "ghost", className?: string }) => {
  const baseStyles = "px-6 py-3 rounded-full font-medium transition-all duration-300 flex items-center gap-2 justify-center";
  const variants: any = {
    primary: "bg-brand-primary text-white hover:bg-blue-600 shadow-lg shadow-blue-500/30",
    accent: "bg-brand-accent text-white hover:bg-violet-500 shadow-lg shadow-violet-500/30",
    outline: "border border-slate-600 text-slate-300 hover:border-white hover:text-white backdrop-blur-sm",
    secondary: "bg-slate-800 text-white hover:bg-slate-700",
    ghost: "hover:bg-slate-800 text-slate-300",
  };
  return clsx(baseStyles, variants[variant], className);
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  className,
  children,
  as = 'button',
  href,
  ...props
}) => {
  // Use the helper
  return as === "a" && href ? (
    <motion.a
      href={href}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={buttonVariants({ variant: variant as any, className })}
      {...(props as HTMLMotionProps<"a">)}
    >
      {children}
    </motion.a>
  ) : (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={buttonVariants({ variant: variant as any, className })}
      {...(props as HTMLMotionProps<"button">)}
    >
      {children}
    </motion.button>
  );
};