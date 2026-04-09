export type PindouBoardTheme = "none" | "gray" | "green" | "pink" | "blue";
export type PindouBeadShape = "square" | "circle";

export const pindouBoardThemes: PindouBoardTheme[] = [
  "none",
  "gray",
  "green",
  "pink",
  "blue",
];

export function getPindouBoardThemeShades(theme: PindouBoardTheme): [string, string, string] {
  switch (theme) {
    case "none":
      return ["#FFFFFF", "#FFFFFF", "#FFFFFF"];
    case "green":
      return ["#A9B49F", "#D4DDD0", "#FFFFFF"];
    case "pink":
      return ["#C8ADB4", "#E8D6DB", "#FFFFFF"];
    case "blue":
      return ["#A9B8C3", "#D5E0E8", "#FFFFFF"];
    case "gray":
    default:
      return ["#AEA8A0", "#D8D1C7", "#FFFFFF"];
  }
}
