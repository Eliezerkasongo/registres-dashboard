import React, { useState } from "react";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string;
  /** Controlled mode: takes over from defaultValue's own internal state
   * entirely, so the shown value always tracks the caller's state exactly -
   * needed for a form reused across different records (an entry form open
   * for entry A, then reused for entry B without unmounting in between),
   * where defaultValue's "read once at mount" behavior would otherwise
   * leave the previous record's value on screen. */
  value?: string;
}

const Select: React.FC<SelectProps> = ({
  options,
  placeholder = "Choisir",
  onChange,
  className = "",
  defaultValue = "",
  value,
}) => {
  const isControlled = value !== undefined;
  // Manage the selected value (uncontrolled mode only)
  const [uncontrolledValue, setUncontrolledValue] = useState<string>(defaultValue);
  const selectedValue = isControlled ? value : uncontrolledValue;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    if (!isControlled) setUncontrolledValue(next);
    onChange(next); // Trigger parent handler
  };

  return (
    <select
      className={`h-9 w-full appearance-none rounded-lg border border-gray-300  px-3 py-1.5 pr-9 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 ${
        selectedValue
          ? "text-gray-800 dark:text-white/90"
          : "text-gray-400 dark:text-gray-400"
      } ${className}`}
      value={selectedValue}
      onChange={handleChange}
    >
      {/* Placeholder option */}
      <option
        value=""
        disabled
        className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
      >
        {placeholder}
      </option>
      {/* Map over options */}
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
        >
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default Select;
