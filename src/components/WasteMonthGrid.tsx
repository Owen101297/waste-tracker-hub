import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WASTE_COLUMNS, daysInMonth, type WasteKey } from "@/lib/waste-types";
import { Input } from "@/components/ui/input";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type RowData = Partial<Record<WasteKey, number>>;
export type RecordsMap = Record<number, RowData>;

interface Props {
  institutionId: string;
  year: number;
  month: number;
  readOnly?: boolean;
  onLoaded?: (records: RecordsMap) => void;
}

export function WasteMonthGrid({ institutionId, year, month, readOnly, onLoaded }: Props) {
  const days = daysInMonth(year, month);
  const [records, setRecords] = useState<RecordsMap>({});
  const [loading, setLoading] = useState(true);
  const [savingDay, setSavingDay] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase
      .from("waste_records")
      .select("*")
      .eq("institution_id", institutionId)
      .eq("year", year)
      .eq("month", month)
      .then(({ data }) => {
        if (!active) return;
        const map: RecordsMap = {};
        (data ?? []).forEach((r: any) => {
          map[r.day] = {};
          WASTE_COLUMNS.forEach((c) => (map[r.day][c.key] = Number(r[c.key] ?? 0)));
        });
        setRecords(map);
        onLoaded?.(map);
        setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId, year, month]);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    WASTE_COLUMNS.forEach((c) => (t[c.key] = 0));
    Object.values(records).forEach((row) => {
      WASTE_COLUMNS.forEach((c) => (t[c.key] += Number(row[c.key] ?? 0)));
    });
    return t;
  }, [records]);

  const totalNoPeligrosos = WASTE_COLUMNS.filter((c) => c.group === "no_peligrosos").reduce((s, c) => s + totals[c.key], 0);
  const totalInfecciosos = WASTE_COLUMNS.filter((c) => c.group === "infecciosos").reduce((s, c) => s + totals[c.key], 0);
  const totalFarmacos = totals["farmacos"];

  const handleChange = (day: number, key: WasteKey, value: string) => {
    const num = value === "" ? 0 : parseFloat(value);
    if (isNaN(num)) return;
    setRecords((prev) => ({ ...prev, [day]: { ...prev[day], [key]: num } }));
  };

  const saveDay = async (day: number) => {
    setSavingDay(day);
    const row = records[day] ?? {};
    const payload: any = { institution_id: institutionId, year, month, day };
    WASTE_COLUMNS.forEach((c) => (payload[c.key] = Number(row[c.key] ?? 0)));
    const { error } = await supabase
      .from("waste_records")
      .upsert(payload, { onConflict: "institution_id,year,month,day" });
    setSavingDay(null);
    if (error) toast.error("Error al guardar: " + error.message);
    else toast.success(`Día ${day} guardado`);
    onLoaded?.(records);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th rowSpan={2} className="p-2 border bg-muted text-left">Día</th>
            <th colSpan={3} className="p-2 border text-center" style={{ background: "oklch(0.85 0.06 145)" }}>RESIDUOS NO PELIGROSOS</th>
            <th colSpan={4} className="p-2 border text-center" style={{ background: "oklch(0.85 0.1 60)" }}>INFECCIOSOS / RIESGO BIOLÓGICO</th>
            <th className="p-2 border text-center text-primary-foreground" style={{ background: "oklch(0.4 0.1 25)" }}>QUÍMICOS</th>
            {!readOnly && <th rowSpan={2} className="p-2 border bg-muted">Acción</th>}
          </tr>
          <tr>
            {WASTE_COLUMNS.map((c) => (
              <th key={c.key} className="p-2 border bg-muted/50 text-center font-medium">
                {c.label}<br /><span className="text-[10px] text-muted-foreground">(Kg)</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: days }, (_, i) => i + 1).map((day) => (
            <tr key={day} className="hover:bg-muted/30">
              <td className="p-1 border font-medium text-center">{day}</td>
              {WASTE_COLUMNS.map((c) => (
                <td key={c.key} className="p-1 border">
                  {readOnly ? (
                    <span className="block text-center">{records[day]?.[c.key] ?? ""}</span>
                  ) : (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={records[day]?.[c.key] ?? ""}
                      onChange={(e) => handleChange(day, c.key, e.target.value)}
                      className="h-7 text-xs px-1"
                    />
                  )}
                </td>
              ))}
              {!readOnly && (
                <td className="p-1 border text-center">
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => saveDay(day)} disabled={savingDay === day}>
                    {savingDay === day ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  </Button>
                </td>
              )}
            </tr>
          ))}
          <tr className="font-bold bg-primary/10">
            <td className="p-2 border text-center">TOTAL</td>
            {WASTE_COLUMNS.map((c) => (
              <td key={c.key} className="p-2 border text-center">{totals[c.key].toFixed(2)}</td>
            ))}
            {!readOnly && <td className="border" />}
          </tr>
          <tr className="bg-muted/50 text-xs">
            <td className="p-2 border" />
            <td colSpan={3} className="p-2 border text-center font-semibold">No peligrosos: {totalNoPeligrosos.toFixed(2)} Kg</td>
            <td colSpan={4} className="p-2 border text-center font-semibold">Infecciosos: {totalInfecciosos.toFixed(2)} Kg</td>
            <td className="p-2 border text-center font-semibold">Fármacos: {totalFarmacos.toFixed(2)} Kg</td>
            {!readOnly && <td className="border" />}
          </tr>
        </tbody>
      </table>
    </div>
  );
}