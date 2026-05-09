import { useEffect, useMemo, useState } from "react";
import type { SkillManifest } from "@/contracts";
import { Modal, Input, Kbd } from "@/ui";
import { useSkills } from "@/lib/adapters/adapters-context";
import { useHotkeys } from "@/lib/hooks/useHotkeys";
import { cn } from "@/lib/utils";

export interface SkillPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (skill: SkillManifest) => void;
}

export function SkillPicker({ open, onClose, onSelect }: SkillPickerProps) {
  const skills = useSkills();
  const [list, setList] = useState<SkillManifest[]>([]);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    skills.list().then(setList);
    setQuery("");
    setActiveIndex(0);
  }, [open, skills]);

  const filtered = useMemo(() => {
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
    );
  }, [list, query]);

  useHotkeys(
    {
      ArrowDown: (e) => {
        if (!open) return;
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      },
      ArrowUp: (e) => {
        if (!open) return;
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      },
      Enter: (e) => {
        if (!open) return;
        const s = filtered[activeIndex];
        if (s) {
          e.preventDefault();
          onSelect(s);
        }
      },
    },
    { enableInInputs: true },
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Choose a skill"
      width={580}
      trailing={
        <>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> Navigate · <Kbd>↵</Kbd> Select · <Kbd>esc</Kbd> Close
        </>
      }
    >
      <Input
        autoFocus
        placeholder="Search skills…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
        }}
      />
      <div className="mt-3 max-h-[60vh] overflow-y-auto" role="listbox">
        {filtered.map((s, i) => (
          <button
            key={s.id}
            role="option"
            aria-selected={i === activeIndex}
            onMouseEnter={() => setActiveIndex(i)}
            onClick={() => onSelect(s)}
            className={cn(
              "flex w-full items-start gap-3 rounded-3 px-3 py-2.5 text-left transition-colors",
              i === activeIndex ? "bg-bg-surface-hover" : "hover:bg-bg-input-hover",
            )}
          >
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-3 border border-border-default bg-bg-input text-accent-bright">
              {s.icon ?? "◇"}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-medium text-text-primary">{s.name}</span>
              <span className="mt-0.5 block text-text-muted text-xs leading-relaxed">{s.description}</span>
            </span>
            {s.shortcut && <Kbd className="self-start">{s.shortcut}</Kbd>}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-text-muted text-sm">No skills match "{query}"</p>
        )}
      </div>
    </Modal>
  );
}
