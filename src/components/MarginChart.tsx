const KEY = new Set([3, 6, 7, 10, 14, 17, 20, 24]);

export default function MarginChart({
  data, homeColor, awayColor, spread,
}: {
  data: { margin: number; pct: number }[];
  homeColor: string;
  awayColor: string;
  spread: number;
}) {
  const max = Math.max(...data.map((d) => d.pct), 0.1);
  return (
    <div>
      <div className="flex items-end gap-[1.5px] h-40">
        {data.map((d) => {
          const isKey = KEY.has(Math.abs(d.margin));
          const color = d.margin > 0 ? homeColor : d.margin < 0 ? awayColor : '#7d8aa3';
          return (
            <div key={d.margin} className="flex-1 flex flex-col justify-end h-full group relative">
              <div
                className="w-full rounded-t-[2px] transition-all"
                style={{
                  height: `${(d.pct / max) * 100}%`,
                  background: color,
                  opacity: isKey ? 1 : 0.45,
                  minHeight: d.pct > 0 ? 2 : 0,
                }}
              />
              <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap rounded bg-pitch border border-line px-1.5 py-0.5 font-mono text-[10px] z-10">
                {d.margin > 0 ? '+' : ''}{d.margin}: {d.pct.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
      <div className="relative mt-1 h-5 font-mono text-[10px] text-muted">
        <span className="absolute left-0">−30 (visita)</span>
        <span className="absolute left-1/2 -translate-x-1/2">0</span>
        <span className="absolute right-0">+30 (local)</span>
        <span
          className="absolute -top-[172px] h-40 border-l border-dashed border-volt/70"
          style={{ left: `${((spread + 30) / 60) * 100}%` }}
        />
        <span
          className="absolute -translate-x-1/2 text-volt"
          style={{ left: `${((spread + 30) / 60) * 100}%`, top: -14 }}
        >
          ▲
        </span>
      </div>
    </div>
  );
}
