interface AvatarProps {
  name: string;
  id?: number;
  size?: 'sm' | 'md';
}

const PALETTE = [
  'from-violet-400 to-indigo-500',
  'from-amber-400 to-orange-500',
  'from-sky-400 to-blue-500',
  'from-emerald-400 to-teal-500',
  'from-rose-400 to-pink-500',
  'from-fuchsia-400 to-purple-500',
  'from-cyan-400 to-blue-500',
  'from-lime-400 to-emerald-500',
];

export function Avatar({ name, id, size = 'md' }: AvatarProps) {
  const parts = name.trim().split(/\s+/);
  const initials = (parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '');
  const seed = id ?? Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0);
  const gradient = PALETTE[seed % PALETTE.length];
  const sizeClasses = size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs';
  return (
    <div
      className={`${sizeClasses} rounded-full bg-gradient-to-br ${gradient} text-white font-semibold flex items-center justify-center shrink-0`}
    >
      {initials.toUpperCase()}
    </div>
  );
}
