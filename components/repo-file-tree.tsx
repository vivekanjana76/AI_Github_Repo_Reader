"use client";

import { useEffect, useMemo, useState } from "react";

import type { RepoTreeBadge, RepoTreeNode } from "@/lib/types";
import { cn } from "@/lib/utils";

type RepoFileTreeProps = {
  nodes: RepoTreeNode[];
  onSelectFile?: (path: string) => void;
};

const badgeStyles: Record<RepoTreeBadge, string> = {
  important: "border-tide/25 bg-tide/10 text-tide",
  large: "border-amber-200 bg-amber-50 text-amber-700",
  complex: "border-red-200 bg-red-50 text-red-700",
  sampled: "border-emerald-200 bg-emerald-50 text-emerald-700"
};

export function RepoFileTree({ nodes, onSelectFile }: RepoFileTreeProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const defaultExpandedPaths = useMemo(() => {
    const paths = new Set<string>();

    const walk = (treeNodes: RepoTreeNode[], ancestors: string[] = []) => {
      for (const node of treeNodes) {
        if (ancestors.length === 0 && node.type === "directory") {
          paths.add(node.path);
        }

        if (node.badges.some((badge) => badge === "important" || badge === "large" || badge === "complex")) {
          for (const ancestor of ancestors) {
            paths.add(ancestor);
          }
        }

        if (node.children.length > 0) {
          walk(node.children, [...ancestors, node.path]);
        }
      }
    };

    walk(nodes);
    return paths;
  }, [nodes]);

  useEffect(() => {
    setExpandedPaths(defaultExpandedPaths);
  }, [defaultExpandedPaths]);

  function togglePath(path: string) {
    setExpandedPaths((current) => {
      const next = new Set(current);

      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }

      return next;
    });
  }

  return (
    <div className="rounded-3xl border border-ink/10 bg-white/70 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">File Tree</p>
          <p className="text-xs leading-5 text-ink/55">Repository structure with highlighted files.</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <TreeBadge badge="important" />
        <TreeBadge badge="complex" />
        <TreeBadge badge="large" />
        <TreeBadge badge="sampled" />
      </div>

      <div className="max-h-[420px] overflow-auto rounded-2xl border border-ink/10 bg-mist/50 p-3">
        {nodes.length === 0 ? (
          <p className="text-sm text-ink/55">No tree data available.</p>
        ) : (
          <div className="space-y-1">
            {nodes.map((node) => (
              <TreeNode
                expandedPaths={expandedPaths}
                key={node.path}
                node={node}
                onSelectFile={onSelectFile}
                onToggle={togglePath}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TreeNode({
  node,
  expandedPaths,
  onToggle,
  onSelectFile
}: {
  node: RepoTreeNode;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onSelectFile?: (path: string) => void;
}) {
  const isExpanded = expandedPaths.has(node.path);
  const isDirectory = node.type === "directory";

  return (
    <div>
      <div className="flex items-start gap-2 rounded-xl px-2 py-1.5 transition hover:bg-white/80">
        {isDirectory ? (
          <button
            aria-label={isExpanded ? `Collapse ${node.path}` : `Expand ${node.path}`}
            className="mt-0.5 text-xs text-ink/50"
            onClick={() => onToggle(node.path)}
            type="button"
          >
            {isExpanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="mt-0.5 text-xs text-ink/35">•</span>
        )}

        <div className="min-w-0 flex-1">
          <button
            className={cn(
              "text-left text-sm leading-6 text-ink/80",
              !isDirectory && "hover:text-tide"
            )}
            onClick={() => {
              if (isDirectory) {
                onToggle(node.path);
                return;
              }

              onSelectFile?.(node.path);
            }}
            type="button"
          >
            {node.name}
          </button>

          {node.badges.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {node.badges.map((badge) => (
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                    badgeStyles[badge]
                  )}
                  key={`${node.path}-${badge}`}
                >
                  {badge}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {isDirectory && isExpanded && node.children.length > 0 ? (
        <div className="ml-4 border-l border-ink/10 pl-2">
          {node.children.map((child) => (
            <TreeNode
              expandedPaths={expandedPaths}
              key={child.path}
              node={child}
              onSelectFile={onSelectFile}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TreeBadge({ badge }: { badge: RepoTreeBadge }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
        badgeStyles[badge]
      )}
    >
      {badge}
    </span>
  );
}
