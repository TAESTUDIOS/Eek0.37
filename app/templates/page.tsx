// app/templates/page.tsx
// Page for managing schedule templates

"use client";

import TemplateManager from "@/components/TemplateManager";

export default function TemplatesPage() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6">
      <TemplateManager />
    </div>
  );
}
