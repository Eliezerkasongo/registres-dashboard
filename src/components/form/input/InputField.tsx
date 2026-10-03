import { EyeCloseIcon, EyeIcon } from "@/icons";
import React, { FC, useState } from "react";

interface InputProps {
  type?: "text" | "number" | "email" | "password" | "date" | "time" | string;
  id?: string;
  name?: string;
  placeholder?: string;
  defaultValue?: string | number;
  /** Controlled mode: takes over from defaultValue entirely, so the shown
   * text always tracks the caller's state exactly - needed for a form
   * reused across different records (an entry form open for entry A, then
   * reused for entry B without unmounting in between), where defaultValue's
   * "read once at mount" behavior would otherwise leave the previous
   * record's value on screen. */
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onCopy?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onCut?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  // Off by default everywhere - a field the app itself pre-fills (defaultValue)
  // or that always takes a fresh value (search boxes, one-off confirmations)
  // has no business being offered for browser autofill/autocomplete. A
  // password field gets "new-password" instead (see below) - Chrome/Firefox
  // are well documented to silently ignore autocomplete="off" specifically
  // on password inputs, still offering their saved-password autofill and the
  // "save this password?" prompt regardless; "new-password" is the value
  // they actually honor to suppress both.
  autoComplete?: string;
  className?: string;
  min?: string;
  max?: string;
  step?: number;
  disabled?: boolean;
  success?: boolean;
  error?: boolean;
  hint?: string; // Optional hint text
}

const Input: FC<InputProps> = ({
  type = "text",
  id,
  name,
  placeholder,
  defaultValue,
  value,
  onChange,
  onPaste,
  onCopy,
  onCut,
  autoComplete,
  className = "",
  min,
  max,
  step,
  disabled = false,
  success = false,
  error = false,
  hint,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const resolvedAutoComplete = autoComplete ?? (isPassword ? "new-password" : "off");
  // React warns if both value and defaultValue are passed - only one may
  // reach the DOM node, chosen by whether the caller opted into controlled
  // mode.
  const valueProps =
    value !== undefined ? { value } : { defaultValue };

  // Determine input styles based on state (disabled, success, error)
  let inputClasses = `h-9 w-full rounded-lg border appearance-none px-3 py-1.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 ${
    isPassword ? "pr-10" : ""
  } ${className}`;

  // Add styles for the different states
  if (disabled) {
    inputClasses += ` text-gray-500 border-gray-300 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700`;
  } else if (error) {
    inputClasses += ` text-error-800 border-error-500 focus:ring-3 focus:ring-error-500/10  dark:text-error-400 dark:border-error-500`;
  } else if (success) {
    inputClasses += ` text-success-500 border-success-400 focus:ring-success-500/10 focus:border-success-300  dark:text-success-400 dark:border-success-500`;
  } else {
    inputClasses += ` bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800`;
  }

  return (
    <div className="relative">
      <input
        type={isPassword ? (showPassword ? "text" : "password") : type}
        id={id}
        name={name}
        placeholder={placeholder}
        {...valueProps}
        onChange={onChange}
        onPaste={onPaste}
        onCopy={onCopy}
        onCut={onCut}
        autoComplete={resolvedAutoComplete}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={inputClasses}
      />

      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
          ) : (
            <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
          )}
        </button>
      )}

      {/* Optional Hint Text */}
      {hint && (
        <p
          className={`mt-1.5 text-xs ${
            error
              ? "text-error-500"
              : success
              ? "text-success-500"
              : "text-gray-500"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default Input;
