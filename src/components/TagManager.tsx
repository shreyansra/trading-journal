"use client";

import { useState } from "react";
import { Tag } from "@/lib/types";
import { supabase } from "@/lib/supabase";

interface TagManagerProps {
  tags: Tag[];
  onRefresh?: () => void;
}

const PRESET_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

export default function TagManager({ tags, onRefresh }: TagManagerProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    await supabase.from("tags").insert({ name: name.trim(), color });
    setName("");
    setColor(PRESET_COLORS[0]);
    setSaving(false);
    onRefresh?.();
  }

  async function handleDelete(id: string) {
    await supabase.from("tags").delete().eq("id", id);
    onRefresh?.();
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-accent hover:text-accent-hover font-medium"
      >
        {open ? "Hide Tag Manager" : "Manage Tags"}
      </button>

      {open && (
        <div className="mt-3 bg-card border border-card-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New tag name"
              className="flex-1 px-3 py-1.5 bg-background border border-card-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <div className="flex gap-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-full transition-transform ${
                    color === c ? "scale-125 ring-2 ring-foreground" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              onClick={handleAdd}
              disabled={saving || !name.trim()}
              className="px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium disabled:opacity-50"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
                <button
                  onClick={() => handleDelete(tag.id)}
                  className="hover:opacity-70 ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
