import { expect, test } from "bun:test";
import {
  getAdaptiveEditToolRailLayout,
  formatProcessingElapsedNote,
  getMobileLandscapeEditToolRailAvailableHeight,
  getMobileEditStageHeight,
  getMobilePindouStageHeight,
  getEffectiveMobileEditPanelHeight,
  getMobileWorkspaceChromeMode,
  getMobilePindouColorRailViewportBleedStyle,
  getPindouFocusButtonClassName,
  getPindouColorRailHintClassName,
  getPindouColorRailRenderSlotCount,
  getPixelEditorPanelViewportHeight,
  shouldRoundPindouColorRailOuterCorners,
  shouldUsePindouLandscapeColorRail,
  getUnifiedWorkspaceShellCorners,
  getPindouColorRailItemCornerFlags,
  getMobileWorkspaceStageRegionMode,
  getPindouColorRailMode,
  getPindouPanelSectionClassName,
  getEditPanelSectionInlineStyle,
  getPindouStageAreaClassName,
  getPindouVisiblePanelHeight,
  getPindouColorRailDummySlotClassName,
  getPindouLandscapeRailContentMode,
  getPindouLandscapeSwatchGridClassName,
  getPindouPanelSectionInlineStyle,
  getEditToolRailSectionClassName,
  getEditStageSurfaceInlineStyle,
  getEditStageViewportContainerClassName,
  shouldRenderStandaloneEditToolRailRow,
  shouldUseSideMountedEditToolRail,
} from "../src/components/pixel-editor-panel";
import { getCompactPindouToolbarButtonMetrics } from "../src/components/pixel-editor-chrome";

test("processing elapsed note should only show the formatted duration text", () => {
  expect(formatProcessingElapsedNote(0)).toBeNull();
  expect(formatProcessingElapsedNote(218)).toBe("218 ms");
  expect(formatProcessingElapsedNote(1520)).toBe("1.52 s");
});

test("mobile workspace stage regions should keep edit fixed and pindou square", () => {
  expect(getMobileWorkspaceStageRegionMode({ panel: "edit", mobileApp: true })).toEqual({
    fixedViewport: true,
    squareViewport: false,
  });
  expect(getMobileWorkspaceStageRegionMode({ panel: "pindou", mobileApp: true })).toEqual({
    fixedViewport: false,
    squareViewport: false,
  });
  expect(getMobileWorkspaceStageRegionMode({ panel: "edit", mobileApp: false })).toEqual({
    fixedViewport: false,
    squareViewport: false,
  });
});

test("mobile pixel editor panel height should fit within the parent content region instead of using raw viewport heuristics", () => {
  expect(
    getPixelEditorPanelViewportHeight({
      viewportWidth: 390,
      windowInnerHeight: 664,
      panelTop: 108,
      parentBottom: 596,
    }),
  ).toBe(464);
});

test("mobile pindou panel height should stop at the fixed bottom toolbar", () => {
  expect(
    getPindouVisiblePanelHeight({
      panelTop: 64,
      navTop: 596,
      viewportHeight: 664,
    }),
  ).toBe(532);
});

test("mobile pindou stage height should reserve two color rows and the hint label", () => {
  expect(
    getMobilePindouStageHeight({
      panelViewportHeight: 720,
      reserveColorRailRows: 2,
      includeHint: true,
    }),
  ).toBe(482);
  expect(
    getMobilePindouStageHeight({
      panelViewportHeight: 260,
      reserveColorRailRows: 2,
      includeHint: true,
    }),
  ).toBe(220);
});

test("mobile edit stage height should reserve toolbar and bottom breathing room like pindou instead of using a fixed svh box", () => {
  expect(
    getMobileEditStageHeight({
      panelViewportHeight: 664,
    }),
  ).toBe(468);
  expect(
    getMobileEditStageHeight({
      panelViewportHeight: 320,
    }),
  ).toBe(260);
});

test("mobile non-focus pindou layout should keep the panel and stage area constrained to the visible region", () => {
  expect(
    getPindouPanelSectionClassName({
      focusOnly: false,
      useLandscapeColorRail: false,
    }),
  ).toContain("flex-col");
  expect(
    getPindouPanelSectionClassName({
      focusOnly: false,
      useLandscapeColorRail: false,
    }),
  ).toContain("overflow-visible");
  expect(
    getPindouPanelSectionClassName({
      focusOnly: false,
      useLandscapeColorRail: false,
    }),
  ).not.toContain("h-full");
  expect(
    getPindouStageAreaClassName({
      focusOnly: false,
      reserveFocusToolbarSpace: false,
    }),
  ).toContain("flex-1");
  expect(
    getPindouStageAreaClassName({
      focusOnly: false,
      reserveFocusToolbarSpace: false,
    }),
  ).not.toContain("shrink-0");
});

test("mobile landscape pindou should keep the section clipped so the left swatch rail scrolls inside its own container", () => {
  expect(
    getPindouPanelSectionClassName({
      focusOnly: false,
      useLandscapeColorRail: true,
    }),
  ).toContain("overflow-hidden");
  expect(
    getPindouPanelSectionClassName({
      focusOnly: false,
      useLandscapeColorRail: true,
    }),
  ).toContain("h-full");
  expect(
    getPindouPanelSectionClassName({
      focusOnly: true,
      useLandscapeColorRail: true,
    }),
  ).toContain("overflow-hidden");
});

test("mobile non-focus landscape pindou should pin the panel height to the visible workspace region", () => {
  expect(
    getPindouPanelSectionInlineStyle({
      mobileApp: true,
      focusOnly: false,
      useLandscapeColorRail: true,
      panelViewportHeight: 246,
    }),
  ).toEqual({
    height: "246px",
    minHeight: "246px",
  });
  expect(
    getPindouPanelSectionInlineStyle({
      mobileApp: true,
      focusOnly: false,
      useLandscapeColorRail: false,
      panelViewportHeight: 246,
    }),
  ).toBeUndefined();
});

test("mobile non-focus landscape edit should pin the panel height to the visible workspace region", () => {
  expect(
    getEditPanelSectionInlineStyle({
      mobileApp: true,
      useSideMountedEditToolRail: true,
      panelViewportHeight: 258,
    }),
  ).toEqual({
    height: "258px",
    minHeight: "258px",
  });
  expect(
    getEditPanelSectionInlineStyle({
      mobileApp: true,
      useSideMountedEditToolRail: false,
      panelViewportHeight: 258,
    }),
  ).toBeUndefined();
});

test("mobile landscape edit side rail section should be clipped to the stage height instead of growing past the bottom nav", () => {
  expect(
    getEditToolRailSectionClassName({
      mobileApp: true,
      useSideMountedEditToolRail: true,
      mergeEditToolRailIntoToolbar: false,
      isDark: false,
    }),
  ).toContain("h-full");
  expect(
    getEditToolRailSectionClassName({
      mobileApp: true,
      useSideMountedEditToolRail: true,
      mergeEditToolRailIntoToolbar: false,
      isDark: false,
    }),
  ).toContain("overflow-hidden");
});

test("mobile landscape edit stage surface should clamp its single grid row to the visible height", () => {
  expect(
    getEditStageSurfaceInlineStyle({
      useSideMountedEditToolRail: true,
      railWidthPx: 190,
    }),
  ).toEqual({
    gridTemplateColumns: "190px minmax(0,1fr)",
    gridTemplateRows: "minmax(0,1fr)",
  });
});

test("mobile landscape edit should not keep the fixed portrait viewport box when the tool rail moves to the side", () => {
  expect(
    getEditStageViewportContainerClassName({
      useSharedStageInset: true,
      fixedViewport: true,
      useSideMountedEditToolRail: true,
    }),
  ).toContain("flex h-full flex-1");
  expect(
    getEditStageViewportContainerClassName({
      useSharedStageInset: true,
      fixedViewport: true,
      useSideMountedEditToolRail: true,
    }),
  ).not.toContain("h-[min(58svh,32rem)]");
});

test("mobile landscape edit should not keep extra viewport padding around the canvas container", () => {
  expect(
    getEditStageViewportContainerClassName({
      useSharedStageInset: true,
      fixedViewport: true,
      useSideMountedEditToolRail: true,
    }),
  ).not.toContain("px-2");
  expect(
    getEditStageViewportContainerClassName({
      useSharedStageInset: true,
      fixedViewport: true,
      useSideMountedEditToolRail: true,
    }),
  ).not.toContain("pb-4");
  expect(
    getEditStageViewportContainerClassName({
      useSharedStageInset: true,
      fixedViewport: true,
      useSideMountedEditToolRail: true,
    }),
  ).not.toContain("pt-3");
});

test("mobile edit should clamp its panel height to the actually visible region above the fixed nav", () => {
  expect(
    getEffectiveMobileEditPanelHeight({
      panelViewportHeight: 293,
      mobileVisiblePanelHeight: 258,
    }),
  ).toBe(258);
  expect(
    getEffectiveMobileEditPanelHeight({
      panelViewportHeight: 0,
      mobileVisiblePanelHeight: 258,
    }),
  ).toBe(258);
});

test("mobile landscape fullscreen pindou should reserve space for the top focus toolbar", () => {
  expect(
    getPindouStageAreaClassName({
      focusOnly: true,
      reserveFocusToolbarSpace: true,
    }),
  ).toContain("mt-12");
  expect(
    getPindouStageAreaClassName({
      focusOnly: true,
      reserveFocusToolbarSpace: false,
    }),
  ).not.toContain("mt-12");
});

test("mobile workspace chrome should share pindou-style shell while letting edit merge its tool rail", () => {
  expect(getMobileWorkspaceChromeMode({ panel: "edit", mobileApp: true, isLandscapeViewport: false })).toEqual({
    useSharedToolbarSurface: true,
    useSharedStageInset: true,
    mergeEditToolRailIntoToolbar: true,
    useUnifiedStageShell: true,
  });
  expect(getMobileWorkspaceChromeMode({ panel: "edit", mobileApp: true, isLandscapeViewport: true })).toEqual({
    useSharedToolbarSurface: true,
    useSharedStageInset: true,
    mergeEditToolRailIntoToolbar: false,
    useUnifiedStageShell: true,
  });
  expect(getMobileWorkspaceChromeMode({ panel: "pindou", mobileApp: true, isLandscapeViewport: false })).toEqual({
    useSharedToolbarSurface: true,
    useSharedStageInset: true,
    mergeEditToolRailIntoToolbar: false,
    useUnifiedStageShell: true,
  });
  expect(getMobileWorkspaceChromeMode({ panel: "edit", mobileApp: false, isLandscapeViewport: false })).toEqual({
    useSharedToolbarSurface: false,
    useSharedStageInset: false,
    mergeEditToolRailIntoToolbar: false,
    useUnifiedStageShell: false,
  });
});

test("edit workspace should not render a duplicate top tool-rail row when landscape mobile already moves it to the left rail", () => {
  expect(
    shouldRenderStandaloneEditToolRailRow({
      useUnifiedStageShell: true,
      mergeEditToolRailIntoToolbar: true,
    }),
  ).toBe(true);
  expect(
    shouldRenderStandaloneEditToolRailRow({
      useUnifiedStageShell: true,
      mergeEditToolRailIntoToolbar: false,
    }),
  ).toBe(false);
});

test("mobile landscape edit should mount the tool rail on the left side instead of another top row", () => {
  expect(
    shouldUseSideMountedEditToolRail({
      mobileApp: true,
      isLandscapeViewport: true,
      mergeEditToolRailIntoToolbar: false,
    }),
  ).toBe(true);
  expect(
    shouldUseSideMountedEditToolRail({
      mobileApp: true,
      isLandscapeViewport: false,
      mergeEditToolRailIntoToolbar: true,
    }),
  ).toBe(false);
  expect(
    shouldUseSideMountedEditToolRail({
      mobileApp: false,
      isLandscapeViewport: true,
      mergeEditToolRailIntoToolbar: false,
    }),
  ).toBe(false);
});

test("mobile landscape edit side rail should add columns when one column would overflow the available height", () => {
  expect(
    getAdaptiveEditToolRailLayout({
      availableHeight: 176,
      itemCount: 10,
    }),
  ).toEqual({
    rows: 3,
    columns: 4,
    railWidthPx: 190,
  });

  expect(
    getAdaptiveEditToolRailLayout({
      availableHeight: 258,
      itemCount: 10,
    }),
  ).toEqual({
    rows: 5,
    columns: 2,
    railWidthPx: 98,
  });
});

test("mobile landscape edit side rail should reserve the fixed bottom toolbar height before laying out rows", () => {
  expect(
    getMobileLandscapeEditToolRailAvailableHeight({
      measuredHeight: 258,
      mobileApp: true,
      isLandscapeViewport: true,
      useSideMountedEditToolRail: true,
    }),
  ).toBe(190);

  expect(
    getAdaptiveEditToolRailLayout({
      availableHeight: getMobileLandscapeEditToolRailAvailableHeight({
        measuredHeight: 258,
        mobileApp: true,
        isLandscapeViewport: true,
        useSideMountedEditToolRail: true,
      }),
      itemCount: 10,
    }),
  ).toEqual({
    rows: 4,
    columns: 3,
    railWidthPx: 144,
  });
});

test("unified workspace shell should use the shared rounded outer corners", () => {
  expect(getUnifiedWorkspaceShellCorners()).toBe("rounded-[14px] sm:rounded-[16px] xl:rounded-[18px]");
});

test("compact pindou toolbar buttons should reduce inner padding without increasing shell height", () => {
  expect(getCompactPindouToolbarButtonMetrics()).toEqual({
    groupGapClass: "gap-[3px]",
    buttonSizeClass: "h-[30px] w-[30px]",
    boardSwatchPaddingClass: "p-[3px]",
    boardSwatchInnerRadiusClass: "rounded-[6px]",
    iconSizeClass: "h-[16px] w-[16px]",
  });
});

test("mobile pindou color rail should become a page-bottom section instead of a horizontal strip", () => {
  expect(
    getPindouColorRailMode({
      mobileApp: true,
      focusOnly: false,
      useLandscapeColorRail: false,
      useMobileSquareStage: true,
    }),
  ).toEqual({
    pageBottomSection: true,
    horizontalStrip: false,
    equalWidthGrid: true,
    gaplessGrid: true,
    columns: 4,
    fullBleed: false,
    gridOverflowMode: "page-flow",
    maxHeightClass: "max-h-[220px]",
    hintPlacement: "above",
    hintCentered: true,
  });

  expect(
    getPindouColorRailMode({
      mobileApp: true,
      focusOnly: true,
      useLandscapeColorRail: false,
      useMobileSquareStage: true,
    }),
  ).toEqual({
    pageBottomSection: true,
    horizontalStrip: false,
    equalWidthGrid: true,
    gaplessGrid: true,
    columns: 4,
    fullBleed: true,
    gridOverflowMode: "clamped",
    maxHeightClass: "max-h-[132px]",
    hintPlacement: "hidden",
    hintCentered: false,
  });

  expect(
    getPindouColorRailMode({
      mobileApp: false,
      focusOnly: false,
      useLandscapeColorRail: false,
      useMobileSquareStage: true,
    }),
  ).toEqual({
    pageBottomSection: false,
    horizontalStrip: true,
    equalWidthGrid: false,
    gaplessGrid: false,
    columns: 0,
    fullBleed: false,
    gridOverflowMode: "clamped",
    maxHeightClass: "max-h-[220px]",
    hintPlacement: "below",
    hintCentered: false,
  });
});

test("mobile and desktop pindou should use the left landscape rail in landscape viewports", () => {
  expect(
    shouldUsePindouLandscapeColorRail({
      mobileApp: true,
      isLandscapeViewport: true,
    }),
  ).toBe(true);
  expect(
    shouldUsePindouLandscapeColorRail({
      mobileApp: false,
      isLandscapeViewport: true,
    }),
  ).toBe(true);
});

test("mobile fullscreen pindou color rail should bleed to the full viewport width", () => {
  expect(
    getMobilePindouColorRailViewportBleedStyle(true),
  ).toEqual({
    width: "100vw",
    maxWidth: "100vw",
    marginLeft: "calc(50% - 50vw)",
  });
  expect(getMobilePindouColorRailViewportBleedStyle(false)).toBeUndefined();
});

test("mobile pindou gapless color rail should only round the four outer corners", () => {
  expect(getPindouColorRailItemCornerFlags({ index: 0, total: 8, columns: 4 })).toEqual({
    topLeft: true,
    topRight: false,
    bottomLeft: false,
    bottomRight: false,
  });
  expect(getPindouColorRailItemCornerFlags({ index: 3, total: 8, columns: 4 })).toEqual({
    topLeft: false,
    topRight: true,
    bottomLeft: false,
    bottomRight: false,
  });
  expect(getPindouColorRailItemCornerFlags({ index: 4, total: 8, columns: 4 })).toEqual({
    topLeft: false,
    topRight: false,
    bottomLeft: true,
    bottomRight: false,
  });
  expect(getPindouColorRailItemCornerFlags({ index: 7, total: 8, columns: 4 })).toEqual({
    topLeft: false,
    topRight: false,
    bottomLeft: false,
    bottomRight: true,
  });
  expect(getPindouColorRailItemCornerFlags({ index: 5, total: 8, columns: 4 })).toEqual({
    topLeft: false,
    topRight: false,
    bottomLeft: false,
    bottomRight: false,
  });
});

test("mobile pindou focus toggle buttons should match the same square tool-button shape", () => {
  expect(
    getPindouFocusButtonClassName({
      mobileApp: true,
      focusOnly: false,
    }),
  ).toContain("h-10 w-10");
  expect(
    getPindouFocusButtonClassName({
      mobileApp: true,
      focusOnly: true,
    }),
  ).toContain("h-10 w-10");
  expect(
    getPindouFocusButtonClassName({
      mobileApp: true,
      focusOnly: false,
    }),
  ).toContain("rounded-md");
  expect(
    getPindouFocusButtonClassName({
      mobileApp: true,
      focusOnly: true,
    }),
  ).toContain("rounded-md");
  expect(
    getPindouFocusButtonClassName({
      mobileApp: true,
      focusOnly: false,
    }),
  ).not.toContain("rounded-full");
  expect(
    getPindouFocusButtonClassName({
      mobileApp: true,
      focusOnly: true,
    }),
  ).not.toContain("rounded-full");
});

test("mobile pindou hint above the color rail should sit farther from the canvas while staying close to the rail", () => {
  expect(
    getPindouColorRailHintClassName({
      hintCentered: true,
      hintPlacement: "above",
    }),
  ).toContain("mt-3");
  expect(
    getPindouColorRailHintClassName({
      hintCentered: true,
      hintPlacement: "above",
    }),
  ).toContain("mb-1");
});

test("mobile pindou color rail should pad to a full four-column row with dummy slots", () => {
  expect(
    getPindouColorRailRenderSlotCount({
      itemCount: 5,
      columns: 4,
      equalWidthGrid: true,
    }),
  ).toBe(8);
  expect(
    getPindouColorRailRenderSlotCount({
      itemCount: 8,
      columns: 4,
      equalWidthGrid: true,
    }),
  ).toBe(8);
  expect(
    getPindouColorRailRenderSlotCount({
      itemCount: 5,
      columns: 0,
      equalWidthGrid: false,
    }),
  ).toBe(5);
  expect(
    getPindouColorRailDummySlotClassName({
      equalWidthGrid: true,
      roundOuterCorners: false,
      topLeft: false,
      topRight: false,
      bottomLeft: false,
      bottomRight: false,
    }),
  ).toContain("border");
  expect(
    getPindouColorRailDummySlotClassName({
      equalWidthGrid: true,
      roundOuterCorners: false,
      topLeft: false,
      topRight: false,
      bottomLeft: false,
      bottomRight: false,
    }),
  ).toContain("bg-");
});

test("mobile fullscreen pindou color rail should drop the outer corner rounding", () => {
  expect(
    shouldRoundPindouColorRailOuterCorners({
      mobileApp: true,
      focusOnly: false,
      equalWidthGrid: true,
    }),
  ).toBe(true);
  expect(
    shouldRoundPindouColorRailOuterCorners({
      mobileApp: true,
      focusOnly: true,
      equalWidthGrid: true,
    }),
  ).toBe(false);
});

test("desktop pindou landscape rail should show swatches outside fullscreen focus mode", () => {
  expect(
    getPindouLandscapeRailContentMode({
      useLandscapeColorRail: true,
      focusOnly: false,
      useCompactLandscapeFocusToolbar: false,
    }),
  ).toBe("swatches");
  expect(
    getPindouLandscapeRailContentMode({
      useLandscapeColorRail: true,
      focusOnly: true,
      useCompactLandscapeFocusToolbar: true,
    }),
  ).toBe("focus-toolbar");
  expect(
    getPindouLandscapeRailContentMode({
      useLandscapeColorRail: false,
      focusOnly: false,
      useCompactLandscapeFocusToolbar: false,
    }),
  ).toBe("none");
  expect(getPindouLandscapeSwatchGridClassName()).toContain("grid-cols-2");
});

test("mobile fullscreen landscape pindou should keep swatches in the left rail instead of the compact toolbar", () => {
  expect(
    getPindouLandscapeRailContentMode({
      useLandscapeColorRail: true,
      focusOnly: true,
      useCompactLandscapeFocusToolbar: false,
    }),
  ).toBe("swatches");
});
