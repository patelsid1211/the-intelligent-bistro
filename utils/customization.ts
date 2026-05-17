/**
 * utils/customization.ts
 * Helpers for the customization selection model.
 *
 * SelectionMap: groupId → Set<optionId>
 * Supports both single (radio) and multi (checkbox) groups.
 */

import type { CustomizationGroup, MenuItem, SelectedCustomization } from "@shared/types";

/** groupId → Set of selected optionIds */
export type SelectionMap = Record<string, Set<string>>;

/**
 * Build the initial SelectionMap for a menu item,
 * pre-selecting all options marked `isDefault`.
 */
export function buildDefaultSelections(item: MenuItem): SelectionMap {
  const map: SelectionMap = {};
  for (const group of item.customizationGroups) {
    const defaults = group.options.filter((o) => o.isDefault);
    map[group.id] = new Set(defaults.map((o) => o.id));
  }
  return map;
}

/**
 * Toggle an option in a SelectionMap.
 * - single groups: always replace (radio behaviour)
 * - multi groups: toggle in/out, respecting maxSelections
 */
export function toggleSelection(
  prev: SelectionMap,
  group: CustomizationGroup,
  optionId: string
): SelectionMap {
  const current = new Set(prev[group.id] ?? []);

  if (group.type === "single") {
    return { ...prev, [group.id]: new Set([optionId]) };
  }

  // Multi: toggle, respect maxSelections
  if (current.has(optionId)) {
    current.delete(optionId);
  } else if (current.size < group.maxSelections) {
    current.add(optionId);
  }
  return { ...prev, [group.id]: new Set(current) };
}

/**
 * Compute the total price delta (in cents) from a SelectionMap.
 */
export function computeSelectionDelta(
  item: MenuItem,
  selections: SelectionMap
): number {
  return item.customizationGroups.reduce((total, group) => {
    const chosen = selections[group.id];
    if (!chosen) return total;
    let groupDelta = 0;
    for (const optionId of chosen) {
      const opt = group.options.find((o) => o.id === optionId);
      groupDelta += opt?.priceDelta ?? 0;
    }
    return total + groupDelta;
  }, 0);
}

/**
 * Returns groups that haven't met their minSelections requirement.
 */
export function getMissingGroups(
  item: MenuItem,
  selections: SelectionMap
): CustomizationGroup[] {
  return item.customizationGroups.filter(
    (g) => (selections[g.id]?.size ?? 0) < g.minSelections
  );
}

/**
 * Expand a SelectionMap into the flat SelectedCustomization[] array
 * that the cart store expects.
 */
export function expandSelections(
  item: MenuItem,
  selections: SelectionMap
): SelectedCustomization[] {
  const result: SelectedCustomization[] = [];
  for (const group of item.customizationGroups) {
    const chosen = selections[group.id];
    if (!chosen || chosen.size === 0) continue;
    for (const optionId of chosen) {
      const option = group.options.find((o) => o.id === optionId);
      if (option) {
        result.push({
          groupId: group.id,
          groupLabel: group.label,
          optionId,
          optionLabel: option.label,
          priceDelta: option.priceDelta,
        });
      }
    }
  }
  return result;
}
