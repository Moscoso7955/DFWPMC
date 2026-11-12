"use client";

import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

// Fields that save themselves when you leave them (or press Enter).

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "defaultValue" | "onBlur"> & {
  value: string;
  onSave: (value: string) => void;
};

export function InlineInput({ value, onSave, ...props }: InputProps) {
  return (
    <input
      {...props}
      defaultValue={value}
      onBlur={(e) => {
        if (e.target.value !== value) onSave(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

type AreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "defaultValue" | "onBlur"> & {
  value: string;
  onSave: (value: string) => void;
};

export function InlineArea({ value, onSave, ...props }: AreaProps) {
  return (
    <textarea
      {...props}
      defaultValue={value}
      onBlur={(e) => {
        if (e.target.value !== value) onSave(e.target.value);
      }}
    />
  );
}
