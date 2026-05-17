interface InputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}

export function Input({
  label,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
}: InputProps) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full rounded-xl border border-border/70 bg-card px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
      />
    </div>
  );
}
