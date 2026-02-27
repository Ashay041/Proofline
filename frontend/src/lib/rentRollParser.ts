import * as XLSX from "xlsx";

export interface ParsedUnit {
  unitNumber: string;
  unitType?: string;
  sqFt?: number;
  tenantName?: string;
  leaseStart?: string;
  leaseEnd?: string;
  leaseTermMonths?: number;
  moveInDate?: string;
  securityDeposit?: number;
  monthlyRent?: number;
  marketRent?: number;
  lastIncrease?: number;
  concession?: number;
  parking?: number;
  lateFee?: number;
  otherFee?: number;
  leaseStatus?: string;
  occupants?: number;
  petRent?: number;
  arrears?: number;
  moveInSpecials?: string;
  subsidizedRent?: number;
  lastPaidDate?: string;
  utilityBillbacks?: number;
  leaseBreakFee?: number;
  annualRent?: number;
  notes?: string;
}

type HeaderMap = Record<string, keyof ParsedUnit>;

const HEADER_ALIASES: HeaderMap = buildHeaderMap({
  unitNumber: [
    "unit no", "unit no.", "unit #", "unit number", "unit", "unit num",
    "apt", "apt #", "apt no", "apartment",
  ],
  unitType: [
    "unit type", "type", "bed/bath", "bed bath", "bedroom", "floor plan",
    "floorplan", "plan",
  ],
  sqFt: [
    "sq ft", "sqft", "sq. ft", "square feet", "square footage", "area",
    "rentable area", "rentable area (sqft)", "size",
  ],
  tenantName: [
    "tenant name", "tenant", "tenant name(s)", "tenant names",
    "resident", "resident name", "occupant", "occupant name", "lessee",
  ],
  leaseStart: [
    "lease start", "lease start date", "start date", "lease from",
    "move-in date", "move in date", "movein",
  ],
  leaseEnd: [
    "lease end", "lease end date", "end date", "lease to",
    "lease expiration", "expiration", "lease exp",
  ],
  leaseTermMonths: [
    "lease term", "lease term (months)", "term", "term (months)", "months",
  ],
  moveInDate: ["move-in", "move in", "moved in"],
  securityDeposit: [
    "security deposit", "deposit", "security deposit ($)", "sec deposit",
    "security", "deposit amount",
  ],
  monthlyRent: [
    "rent", "monthly rent", "base rent", "rent amount", "current rent",
    "rent/month", "contract rent",
  ],
  marketRent: [
    "market rent", "market rate", "market", "asking rent",
  ],
  lastIncrease: ["last increase", "rent increase", "increase"],
  concession: ["concession", "concessions"],
  parking: [
    "parking", "parking fee", "parking ($)", "parking fees",
  ],
  lateFee: [
    "late fee", "late fee charged", "late fee charged $", "late",
    "late fees",
  ],
  otherFee: ["other fee", "other fees", "other"],
  leaseStatus: [
    "lease status", "status", "occupancy", "occupancy status",
  ],
  occupants: [
    "number of occupants", "occupants", "# occupants", "num occupants",
    "people",
  ],
  petRent: ["pet rent", "pet fee", "pet", "pet fees"],
  arrears: ["arrears", "balance due", "outstanding"],
  moveInSpecials: [
    "move-in specials", "move in specials", "specials", "concession notes",
    "move-in special",
  ],
  subsidizedRent: [
    "subsidized rent", "subsidy", "subsidized", "housing assistance",
    "section 8",
  ],
  lastPaidDate: [
    "last paid date", "last payment", "last paid", "payment date",
    "last payment date",
  ],
  utilityBillbacks: [
    "utility billbacks", "billbacks", "utility", "utilities",
    "utility charges",
  ],
  leaseBreakFee: [
    "lease break fee", "break fee", "early termination", "termination fee",
    "lease break",
  ],
  annualRent: [
    "annual rent", "yearly rent", "annual", "rent/year",
  ],
  notes: ["notes", "note", "comments", "remark", "remarks"],
});

function buildHeaderMap(mapping: Record<keyof ParsedUnit, string[]>): HeaderMap {
  const map: HeaderMap = {};
  for (const [field, aliases] of Object.entries(mapping)) {
    for (const alias of aliases) {
      map[alias.toLowerCase().trim()] = field as keyof ParsedUnit;
    }
  }
  return map;
}

function normalizeHeader(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9\s/.#()$-]/g, "").trim();
}

function parseNumber(val: unknown): number | undefined {
  if (val == null || val === "") return undefined;
  const s = String(val).replace(/[$,\s]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function parseDate(val: unknown): string | undefined {
  if (val == null || val === "") return undefined;
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(val).trim();
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return undefined;
}

const DATE_FIELDS = new Set<keyof ParsedUnit>([
  "leaseStart", "leaseEnd", "moveInDate", "lastPaidDate",
]);

const NUMBER_FIELDS = new Set<keyof ParsedUnit>([
  "sqFt", "leaseTermMonths", "securityDeposit", "monthlyRent", "marketRent",
  "lastIncrease", "concession", "parking", "lateFee", "otherFee",
  "occupants", "petRent", "arrears", "subsidizedRent", "utilityBillbacks",
  "leaseBreakFee", "annualRent",
]);

const SKIP_PATTERNS = /^(total|sum|average|avg|count|grand total|subtotal|\s*$)/i;

export function parseRentRoll(file: File): Promise<ParsedUnit[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: false });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (rows.length === 0) {
          resolve([]);
          return;
        }

        const rawHeaders = Object.keys(rows[0]);
        const columnMap: Record<string, keyof ParsedUnit> = {};
        for (const raw of rawHeaders) {
          const normalized = normalizeHeader(raw);
          if (HEADER_ALIASES[normalized]) {
            columnMap[raw] = HEADER_ALIASES[normalized];
          }
        }

        const units: ParsedUnit[] = [];
        for (const row of rows) {
          const unit: Record<string, unknown> = {};
          for (const [rawCol, field] of Object.entries(columnMap)) {
            const val = row[rawCol];
            if (DATE_FIELDS.has(field)) {
              unit[field] = parseDate(val);
            } else if (NUMBER_FIELDS.has(field)) {
              unit[field] = parseNumber(val);
            } else {
              unit[field] = val != null && val !== "" ? String(val).trim() : undefined;
            }
          }

          if (!unit.unitNumber) continue;
          const unitNum = String(unit.unitNumber).trim();
          if (SKIP_PATTERNS.test(unitNum)) continue;

          units.push({ ...unit, unitNumber: unitNum } as unknown as ParsedUnit);
        }

        resolve(units);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
