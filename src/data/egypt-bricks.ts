/**
 * Official Egypt Territories, Sectors & Bricks for EVA Pharma
 * Total: 148 Bricks across 6 Regions and 70 Sectors
 */

export interface BrickItem {
  id: string; // e.g. "BRICK1 ABBASEIA"
  name: string;
  sector: string;
  region: string;
}

export interface RegionGroup {
  region: string;
  sectors: {
    sector: string;
    bricks: string[];
  }[];
}

export const EGYPT_REGIONS_DATA: RegionGroup[] = [
  {
    region: "القاهرة (Cairo)",
    sectors: [
      { sector: "ABBASEIA", bricks: ["BRICK1 ABBASEIA", "BRICK2 ABBASEIA"] },
      { sector: "CAIRO CENTER", bricks: ["BRICK1 CAIRO CENTER"] },
      { sector: "CAIRO EAST I", bricks: ["BRICK1 CAIRO EAST I", "BRICK2 CAIRO EAST I"] },
      { sector: "CAIRO EAST II", bricks: ["BRICK1 CAIRO EAST II", "BRICK2 CAIRO EAST II", "BRICK3 CAIRO EAST II"] },
      { sector: "CAIRO EAST III", bricks: ["BRICK1 CAIRO EAST III"] },
      { sector: "CAIRO SOUTH I", bricks: ["BRICK1 CAIRO SOUTH I", "BRICK2 CAIRO SOUTH I"] },
      { sector: "CAIRO SOUTH II", bricks: ["BRICK1 CAIRO SOUTH II", "BRICK2 CAIRO SOUTH II", "BRICK3 CAIRO SOUTH II"] },
      { sector: "CAIRO SOUTH III", bricks: ["BRICK1 CAIRO SOUTH III", "BRICK2 CAIRO SOUTH III", "BRICK3 CAIRO SOUTH III"] },
      { sector: "CAIRO WEST I", bricks: ["BRICK1 CAIRO WEST I", "BRICK2 CAIRO WEST I", "BRICK3 CAIRO WEST I"] },
      { sector: "CAIRO WEST II", bricks: ["BRICK1 CAIRO WEST II", "BRICK2 CAIRO WEST II"] },
      { sector: "CAIRO WEST III", bricks: ["BRICK1 CAIRO WEST III", "BRICK2 CAIRO WEST III"] },
      { sector: "EL KOBBAH", bricks: ["BRICK1 EL KOBBAH"] },
      { sector: "HELIOPOLIS I", bricks: ["BRICK1 HELIOPOLIS I", "BRICK2 HELIOPOLIS I"] },
      { sector: "HELIOPOLIS II", bricks: ["BRICK1 HELIOPOLIS II", "BRICK2 HELIOPOLIS II"] },
      { sector: "HELIOPOLIS III", bricks: ["BRICK1 HELIOPOLIS III", "BRICK2 HELIOPOLIS III"] },
      { sector: "HELWAN", bricks: ["BRICK1 HELWAN", "BRICK2 HELWAN"] },
      { sector: "MAADI", bricks: ["BRICK1 MAADI", "BRICK2 MAADI"] },
      { sector: "NASR CITY", bricks: ["BRICK1 NASR CITY", "BRICK2 NASR CITY"] },
      { sector: "SHOBRA EL KHEMAH", bricks: ["BRICK1 SHOBRA EL KHEMAH"] },
    ],
  },
  {
    region: "الجيزة (Giza)",
    sectors: [
      { sector: "FAISAL", bricks: ["BRICK1 FAISAL", "BRICK2 FAISAL"] },
      { sector: "GUIZA I", bricks: ["BRICK1 GUIZA I", "BRICK2 GUIZA I"] },
      { sector: "GUIZA II", bricks: ["BRICK1 GUIZA II", "BRICK2 GUIZA II", "BRICK3 GUIZA II", "BRICK4 GUIZA II", "BRICK5 GUIZA II"] },
      { sector: "GUIZA III", bricks: ["BRICK1 GUIZA III", "BRICK2 GUIZA III"] },
      { sector: "GUIZA IV", bricks: ["BRICK1 GUIZA IV"] },
      { sector: "GUIZA V", bricks: ["BRICK1 GUIZA V", "BRICK2 GUIZA V"] },
      { sector: "HARAM", bricks: ["BRICK1 HARAM", "BRICK2 HARAM", "BRICK3 HARAM"] },
      { sector: "IMBABA I", bricks: ["BRICK1 IMBABA I"] },
      { sector: "IMBABA II", bricks: ["BRICK1 IMBABA II", "BRICK2 IMBABA II"] },
    ],
  },
  {
    region: "الإسكندرية ومطروح (Alexandria & Matrouh)",
    sectors: [
      { sector: "ALEX CENTER I", bricks: ["BRICK1 ALEX CENTER I"] },
      { sector: "ALEX CENTER II", bricks: ["BRICK1 ALEX CENTER II"] },
      { sector: "ALEX EAST I", bricks: ["BRICK1 ALEX EAST I", "BRICK2 ALEX EAST I"] },
      { sector: "ALEX EAST II", bricks: ["BRICK1 ALEX EAST II"] },
      { sector: "ALEX EAST III", bricks: ["BRICK1 ALEX EAST III", "BRICK2 ALEX EAST III"] },
      { sector: "ALEX WEST I", bricks: ["BRICK1 ALEX WEST I", "BRICK2 ALEX WEST I"] },
      { sector: "ALEX W II-MATROUH", bricks: ["BRICK1 ALEX W II-MATROUH", "BRICK2 ALEX W II-MATROUH"] },
    ],
  },
  {
    region: "وجه بحري والدلتا (Delta)",
    sectors: [
      { sector: "BEHAIRA I", bricks: ["BRICK1 BEHAIRA I"] },
      { sector: "BEHAIRA II", bricks: ["BRICK1 BEHAIRA II", "BRICK2 BEHAIRA II", "BRICK3 BEHAIRA II"] },
      { sector: "BEHAIRA III", bricks: ["BRICK1 BEHAIRA III", "BRICK2 BEHAIRA III"] },
      { sector: "DAKHLEIAH I", bricks: ["BRICK1 DAKHLEIAH I", "BRICK2 DAKHLEIAH I", "BRICK3 DAKHLEIAH I"] },
      { sector: "DAKHLEIAH II", bricks: ["BRICK1 DAKHLEIAH II", "BRICK2 DAKHLEIAH II", "BRICK3 DAKHLEIAH II"] },
      { sector: "DAKHLEIAH III", bricks: ["BRICK1 DAKHLEIAH III", "BRICK2 DAKHLEIAH III"] },
      { sector: "DAKHLEIAH IV", bricks: ["BRICK1 DAKHLEIAH IV", "BRICK2 DAKHLEIAH IV"] },
      { sector: "DOMIAT", bricks: ["BRICK1 DOMIAT", "BRICK2 DOMIAT", "BRICK3 DOMIAT"] },
      { sector: "GHARBEIA I", bricks: ["BRICK1 GHARBEIA I", "BRICK2 GHARBEIA I"] },
      { sector: "GHARBEIA II", bricks: ["BRICK1 GHARBEIA II", "BRICK2 GHARBEIA II"] },
      { sector: "GHARBEIA III", bricks: ["BRICK1 GHARBEIA III", "BRICK2 GHARBEIA III", "BRICK3 GHARBEIA III"] },
      { sector: "KAFR EL SHEIKH I", bricks: ["BRICK1 KAFR EL SHEIKH I", "BRICK2 KAFR EL SHEIKH I"] },
      { sector: "KAFR EL SHEIKH II", bricks: ["BRICK1 KAFR EL SHEIKH II", "BRICK2 KAFR EL SHEIKH II", "BRICK3 KAFR EL SHEIKH II"] },
      { sector: "KALUBIA I", bricks: ["BRICK1 KALUBIA I", "BRICK2 KALUBIA I", "BRICK3 KALUBIA I"] },
      { sector: "KALUBIA II", bricks: ["BRICK1 KALUBIA II", "BRICK2 KALUBIA II"] },
      { sector: "MENOFEYA I", bricks: ["BRICK1 MENOFEYA I"] },
      { sector: "MENOFEYA II", bricks: ["BRICK1 MENOFEYA II", "BRICK2 MENOFEYA II"] },
      { sector: "MENOFEYA III", bricks: ["BRICK1 MENOFEYA III", "BRICK2 MENOFEYA III", "BRICK3 MENOFEYA III"] },
      { sector: "SHARKEIA I", bricks: ["BRICK1 SHARKEIA I", "BRICK2 SHARKEIA I"] },
      { sector: "SHARKEIA II", bricks: ["BRICK1 SHARKEIA II", "BRICK2 SHARKEIA II", "BRICK3 SHARKEIA II"] },
      { sector: "SHARKEIA III", bricks: ["BRICK1 SHARKEIA III", "BRICK2 SHARKEIA III"] },
    ],
  },
  {
    region: "الصعيد (Upper Egypt)",
    sectors: [
      { sector: "ASSUIT I-N VALLEY", bricks: ["BRICK1 ASSUIT I-N VALLEY", "BRICK2 ASSUIT I-N VALLEY"] },
      { sector: "ASSUIT II", bricks: ["BRICK1 ASSUIT II", "BRICK2 ASSUIT II"] },
      { sector: "ASWAN", bricks: ["BRICK1 ASWAN", "BRICK2 ASWAN"] },
      { sector: "BANI SUEF", bricks: ["BRICK1 BANI SUEF", "BRICK2 BANI SUEF", "BRICK3 BANI SUEF"] },
      { sector: "EL MENYA I", bricks: ["BRICK1 EL MENYA I", "BRICK2 EL MENYA I"] },
      { sector: "EL MENYA II", bricks: ["BRICK1 EL MENYA II", "BRICK2 EL MENYA II"] },
      { sector: "FAYOUM", bricks: ["BRICK1 FAYOUM", "BRICK2 FAYOUM"] },
      { sector: "QUENA I - RED SEA", bricks: ["BRICK1 QUENA I - RED SEA", "BRICK2 QUENA I - RED SEA", "BRICK3 QUENA I - RED SEA", "BRICK4 QUENA I - RED SEA"] },
      { sector: "QUENA II", bricks: ["BRICK1 QUENA II", "BRICK2 QUENA II", "BRICK3 QUENA II"] },
      { sector: "SOHAG I", bricks: ["BRICK1 SOHAG I", "BRICK2 SOHAG I"] },
      { sector: "SOHAG II", bricks: ["BRICK1 SOHAG II"] },
    ],
  },
  {
    region: "القناة وسيناء والبحر الأحمر (Canal & Sinai)",
    sectors: [
      { sector: "ISMAELIA", bricks: ["BRICK1 ISMAELIA"] },
      { sector: "P. SAID-N. SINAI", bricks: ["BRICK1 P. SAID-N. SINAI", "BRICK2 P. SAID-N. SINAI"] },
      { sector: "SUES - S. SINAI", bricks: ["BRICK1 SUES - S. SINAI", "BRICK2 SUES - S. SINAI"] },
    ],
  },
];

// Flat list of all 148 Bricks
export const ALL_EGYPT_BRICKS: BrickItem[] = EGYPT_REGIONS_DATA.flatMap((reg) =>
  reg.sectors.flatMap((sec) =>
    sec.bricks.map((brickName) => ({
      id: brickName,
      name: brickName,
      sector: sec.sector,
      region: reg.region,
    }))
  )
);

export const ALL_BRICK_NAMES: string[] = ALL_EGYPT_BRICKS.map((b) => b.id);
