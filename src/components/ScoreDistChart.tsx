const KEY = new Set([3, 6, 7, 10, 14, 17, 20, 24]);

export default function ScoreDistChart({
  homeDist, awayDist, homeAbbr, awayAbbr, homeColor, awayColor,
}: {
  homeDist: number[];
  awayDist: number[];
  homeAbbr: string;
  awayAbbr: string;
  homeColor: string;
  awayColor: string;
}) {
  const n = 46;
  const max = Math.max(...homeDist.slice(0, n), ...awayDist.slice(0, n));
  return (
    <div>
      <div className="flex items-center gap-4 font-mono text-[11px] mb-2">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: homeColor }} /> {homeAbbr}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: awayColor }} /> {awayAbbr}
        </span>
        <span className="text-muted ml-auto">■ números clave resaltados</span>
      </div>
      <div className="flex items-end gap-[2px] h-40">
        {Array.from({ length: n }, (_, s) => {
          const isKey = KEY.has(s);
          return (
            <div key={s} className="flex-1 h-full flex flex-col justify-end relative group">
              {isKey && <div className="absolute inset-x-0 top-0 bottom-0 bg-volt/[0.06] rounded-sm" />}
              <div className="relative flex items-end gap-[1px] h-full">
                <div
                  className="flex-1 rounded-t-[2px]"
                  style={{ height: `${(homeDist[s] / max) * 100}%`, background: homeColor, opacity: isKey ? 1 : 0.5, minHeight: homeDist[s] > 0.0005 ? 2 : 0 }}
                />
                <div
                  className="flex-1 rounded-t-[2px]"
                  style={{ height: `${(awayDist[s] / max) * 100}%`, background: awayColor, opacity: isKey ? 1 : 0.5, minHeight: awayDist[s] > 0.0005 ? 2 : 0 }}
                />
              </div>
              <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap rounded bg-pitch border border-line px-1.5 py-0.5 font-mono text-[10px] z-10">
                {s} pts · {homeAbbr} {(homeDist[s] * 100).toFixed(1)}% / {awayAbbr} {(awayDist[s] * 100).toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between font-mono text-[10px] text-muted mt-1">
        <span>0</span><span>7</span><span>14</span><span>21</span><span>28</span><span>35</span><span>45 pts</span>
      </div>
    </div>
  );
}
