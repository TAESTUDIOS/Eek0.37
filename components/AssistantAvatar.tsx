// components/AssistantAvatar.tsx
// Visual avatar for the assistant with animated presence

"use client";

export default function AssistantAvatar({ 
  name, 
  size = "sm" 
}: { 
  name?: string; 
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg"
  };

  const initial = (name || "E").charAt(0).toUpperCase();

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-md ring-2 ring-[var(--surface-1)] ring-offset-1 ring-offset-[var(--bg)]`}
      title={name || "Assistant"}
    >
      {initial}
    </div>
  );
}
