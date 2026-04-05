import { type MouseEvent, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { FlowNodeData } from "../../data/flowData";
import { cn } from "../../lib/utils";

/**
 * Arbres UX (compétences, user flow).
 * Référence produit : le user flow Playdago (`#userflow-tree`, SingleProject, variant `userflow`).
 * Tout nouvel alignement / connecteurs / espacements des autres arbres du site devra s’aligner sur ce comportement (mise à jour des autres usages à planifier).
 */

interface TreeNodeProps {
  data: FlowNodeData;
  depth?: number;
  selectedNodes?: Set<string>;
  onNodeClick?: (nodeId: string, event?: MouseEvent) => void;
  variant?: 'competences' | 'userflow';
}

const LINE_COLOR = "bg-zinc-700";
const LINE_COLOR_ACTIVE = "bg-[#f1582a]";
const TEXT_COLOR = "text-zinc-100";
const TEXT_COLOR_DISABLED = "text-zinc-500";
const NODE_BG = "bg-black";
const NODE_BG_DISABLED = "bg-zinc-900/50";
const NODE_BORDER = "border-zinc-800";
const NODE_BORDER_DISABLED = "border-zinc-700/50";
const NODE_BORDER_ACTIVE = "border-[#f1582a]";
const NODE_BG_ACTIVE = "bg-[#f1582a]";

// Fonction pour générer les initiales d'un label
const getInitials = (label: string): string => {
  const words = label.split(/\s+/);
  if (words.length === 0) return "";
  
  // Si le label contient "&", on prend la première lettre du mot avant "&", "&", et la première lettre du mot après "&"
  if (label.includes("&")) {
    const ampIndex = words.findIndex(word => word === "&");
    if (ampIndex > 0 && ampIndex < words.length - 1) {
      return `${words[ampIndex - 1].charAt(0).toUpperCase()} & ${words[ampIndex + 1].charAt(0).toUpperCase()}`;
    }
    // Fallback si "&" n'est pas au bon endroit
    return words
      .filter(word => word !== "&")
      .slice(0, 2)
      .map(word => word.charAt(0).toUpperCase())
      .join(" & ");
  }
  
  // Sinon, on prend les premières lettres des mots (max 2-3 lettres selon la longueur)
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  return words
    .slice(0, Math.min(3, words.length))
    .map(word => word.charAt(0).toUpperCase())
    .join(" ");
};

export const TreeNode = ({
  data,
  depth = 0,
  selectedNodes = new Set(),
  onNodeClick,
  variant = 'competences',
}) => {
  const hasBranches = data.branches && data.branches.length > 0;
  const hasNext = !!data.next;
  const isSelected = selectedNodes.has(data.id);
  const isDisabled = data.disabled === true;
  const isUserflow = variant === 'userflow';
  const useSimpleBubble = isUserflow || !(data.branches && data.branches.length > 0 && data.id !== "racines" && data.id !== "domaine_product" && data.id !== "domaine_da");
  const useVerticalBranches = hasBranches && (isUserflow || data.id === "racines" || data.id === "domaine_product" || data.id === "domaine_da");
  const branchListVertical = useVerticalBranches && data.branches ? data.branches : null;
  const branchCountVertical = branchListVertical?.length ?? 0;
  const branchIdsKey = branchListVertical?.map((b) => b.id).join("\0") ?? "";
  /** User flow + 2+ enfants : colonne unique absolute (traverse gap-y) ; sinon demi-segments par ligne (compétences) */
  const spineUnified = isUserflow && branchCountVertical > 1;
  const spineColRef = useRef<HTMLDivElement>(null);
  const [spineBetweenCenters, setSpineBetweenCenters] = useState({ top: 0, height: 0 });

  useLayoutEffect(() => {
    if (!spineUnified) return;
    const col = spineColRef.current;
    if (!col) return;

    const updateSpine = () => {
      /* Enfants directs uniquement — sinon les sous-branches (ex. Ateliers) fausseraient premier/dernier centre */
      const rows = Array.from(col.children).filter(
        (el): el is HTMLElement => el.hasAttribute("data-branch-row")
      );
      if (rows.length < 2) {
        setSpineBetweenCenters({ top: 0, height: 0 });
        return;
      }
      const first = rows[0];
      const last = rows[rows.length - 1];
      const cr = col.getBoundingClientRect();
      const f = first.getBoundingClientRect();
      const l = last.getBoundingClientRect();
      const y1 = f.top + f.height / 2 - cr.top;
      const y2 = l.top + l.height / 2 - cr.top;
      setSpineBetweenCenters({ top: y1, height: Math.max(0, y2 - y1) });
    };

    updateSpine();
    const ro = new ResizeObserver(updateSpine);
    ro.observe(col);
    Array.from(col.children).forEach((el) => {
      if (el.hasAttribute("data-branch-row")) ro.observe(el);
    });
    window.addEventListener("resize", updateSpine);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateSpine);
    };
  }, [spineUnified, branchCountVertical, branchIdsKey]);

  const handleClick = (e: MouseEvent) => {
    if (isDisabled) return; // Ne pas permettre le clic si désactivé
    if (onNodeClick) {
      onNodeClick(data.id, e);
    }
  };

  return (
    <div className="flex flex-row items-center">
      {/* The Node Itself */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: depth * 0.1 }}
        onClick={handleClick}
        data-node-id={data.id}
        className={cn(
          "relative z-10 border text-sm font-medium transition-colors",
          useSimpleBubble
            ? "rounded-full flex flex-col items-center gap-1.5 " + (isUserflow ? "userflow-bubble px-8 py-4" : "px-6 py-3")
            : "rounded-[24px] flex flex-row items-center gap-3 min-w-[320px] px-4 py-3 box-border",
          isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-zinc-500 hover:bg-zinc-900",
          isDisabled ? NODE_BG_DISABLED : NODE_BG,
          isDisabled ? NODE_BORDER_DISABLED : (isSelected ? NODE_BORDER_ACTIVE : NODE_BORDER),
          isDisabled ? "" : (isSelected ? NODE_BG_ACTIVE : ""),
          isDisabled ? TEXT_COLOR_DISABLED : TEXT_COLOR
        )}
      >
        {!useSimpleBubble ? (
          <>
            <div className="font-semibold whitespace-nowrap">{data.label}</div>
            <div className="flex flex-row items-center gap-2 flex-shrink-0">
            {data.branches!.slice(0, 3).map((branch) => {
              const branchIsSelected = selectedNodes.has(branch.id);
              const shouldHighlight = isSelected || branchIsSelected;
              const initials = getInitials(branch.label);
              
              return (
                <motion.div
                  key={branch.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: depth * 0.1 + 0.1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onNodeClick) {
                      onNodeClick(branch.id, e);
                    }
                  }}
                  className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center text-[10px] font-medium cursor-pointer transition-colors",
                    shouldHighlight ? NODE_BORDER_ACTIVE : NODE_BORDER,
                    shouldHighlight ? NODE_BG_ACTIVE : NODE_BG,
                    TEXT_COLOR,
                    "hover:border-zinc-500 hover:bg-zinc-900"
                  )}
                  title={branch.label}
                >
                  {initials}
                </motion.div>
              );
            })}
            {data.branches!.length > 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: depth * 0.1 + 0.1 }}
                className={cn(
                  "w-10 h-10 rounded-full border-2 flex items-center justify-center text-[10px] font-medium",
                  NODE_BORDER,
                  NODE_BG,
                  TEXT_COLOR,
                  "opacity-60"
                )}
                title={`${data.branches!.length - 3} compétence${data.branches!.length - 3 > 1 ? 's' : ''} supplémentaire${data.branches!.length - 3 > 1 ? 's' : ''}`}
              >
                +{data.branches!.length - 3}
              </motion.div>
            )}
            </div>
          </>
        ) : (
          <div className="whitespace-nowrap font-semibold">{data.label}</div>
        )}
      </motion.div>

      {/* Horizontal Flow (Next) */}
      {hasNext && (
        <div className="flex flex-row items-center">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: 48 }}
            transition={{ duration: 0.4, delay: depth * 0.1 }}
            className={cn(
              "h-[2px]", 
              (isSelected || selectedNodes.has(data.next!.id)) ? LINE_COLOR_ACTIVE : LINE_COLOR
            )} 
          />
          <TreeNode 
            data={data.next!} 
            depth={depth + 1}
            selectedNodes={selectedNodes}
            onNodeClick={onNodeClick}
            variant={variant}
          />
        </div>
      )}

      {/* Vertical Branches */}
      {useVerticalBranches ? (
        <div className="flex flex-row items-center">
          {/* Connector from Parent to Spine */}
          <motion.div 
             initial={{ width: 0 }}
             animate={{ width: 48 }}
             transition={{ duration: 0.4, delay: depth * 0.1 }}
             className={cn(
               "h-[2px]", 
               isSelected ? LINE_COLOR_ACTIVE : LINE_COLOR
             )} 
          />
          
          <div
            ref={spineColRef}
            className={cn(
              "relative flex flex-col",
              spineUnified && "gap-y-6"
            )}
          >
            {spineUnified && spineBetweenCenters.height > 0 && (
              <div
                className={cn(
                  "pointer-events-none absolute left-0 z-0 w-[2px]",
                  isSelected ? LINE_COLOR_ACTIVE : LINE_COLOR
                )}
                style={{
                  top: spineBetweenCenters.top,
                  height: spineBetweenCenters.height,
                }}
                aria-hidden
              />
            )}

            {branchListVertical!.map((branch, index) => {
              const isFirstChild = index === 0;
              const isLastChild = index === branchCountVertical - 1;
              const isOnlyChild = branchCountVertical === 1;
              const branchIsSelected = selectedNodes.has(branch.id);
              const shouldHighlightBranch = isSelected || branchIsSelected;

              return (
                <div
                  key={branch.id}
                  data-branch-row
                  className="relative z-10 flex flex-row items-center"
                >
                  {!spineUnified && (
                    <div className="relative w-0 shrink-0 self-stretch">
                      {!isOnlyChild && (
                        <>
                          {!isFirstChild && (
                            <div
                              className={cn(
                                "absolute left-0 top-0 h-[calc(50%+1px)] w-[2px]",
                                shouldHighlightBranch ? LINE_COLOR_ACTIVE : LINE_COLOR
                              )}
                            />
                          )}
                          {!isLastChild && (
                            <div
                              className={cn(
                                "absolute left-0 top-[calc(50%-1px)] h-[calc(50%+1px)] w-[2px]",
                                shouldHighlightBranch ? LINE_COLOR_ACTIVE : LINE_COLOR
                              )}
                            />
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {spineUnified && <div className="w-0 shrink-0" aria-hidden />}

                  <div
                    className={cn(
                      "h-[2px] w-12 shrink-0",
                      shouldHighlightBranch ? LINE_COLOR_ACTIVE : LINE_COLOR
                    )}
                  />

                  <div
                    className={cn(
                      !isUserflow && "py-3 mb-6",
                      "flex min-h-0 items-center",
                      !isUserflow && "userflow-branch-spacing"
                    )}
                  >
                    <TreeNode
                      data={branch}
                      depth={depth + 1}
                      selectedNodes={selectedNodes}
                      onNodeClick={onNodeClick}
                      variant={variant}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

