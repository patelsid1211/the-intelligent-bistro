/**
 * constants/layout.ts
 * App-wide layout constants.
 */

import { Dimensions, Platform } from "react-native";

const { width, height } = Dimensions.get("window");

export const SCREEN_W = width;
export const SCREEN_H = height;

/** Height of the bottom tab bar (includes home indicator on iOS). */
export const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 88 : 68;

/** Minimum margin from screen edges for floating elements. */
export const SNAP_MARGIN = 16;
