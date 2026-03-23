/**
 * SVG-based visual question renderer.
 * Renders matrices, sequences, and analogies for the shapes category.
 */

import type {
  VisualData,
  VisualCell,
  VisualShape,
} from "../types";

// ─── SVG Shape Rendering ─────────────────────────────

function SvgShape({ shape }: { shape: VisualShape }) {
  const { type, x, y, size, fill, rotation } = shape;
  const fc = fill === "solid" ? "#1e293b" : "none";
  const sc = "#1e293b";
  const sw = 2.5;
  const half = size / 2;
  const xf = rotation ? `rotate(${rotation} ${x} ${y})` : undefined;

  switch (type) {
    case "circle":
      return (
        <circle
          cx={x}
          cy={y}
          r={half}
          fill={fc}
          stroke={sc}
          strokeWidth={sw}
          transform={xf}
        />
      );

    case "square":
      return (
        <rect
          x={x - half}
          y={y - half}
          width={size}
          height={size}
          fill={fc}
          stroke={sc}
          strokeWidth={sw}
          transform={xf}
        />
      );

    case "triangle": {
      const h = size * 0.866;
      const pts = `${x},${y - h / 2} ${x - half},${y + h / 2} ${x + half},${y + h / 2}`;
      return (
        <polygon
          points={pts}
          fill={fc}
          stroke={sc}
          strokeWidth={sw}
          transform={xf}
        />
      );
    }

    case "diamond": {
      const pts = `${x},${y - half} ${x + half},${y} ${x},${y + half} ${x - half},${y}`;
      return (
        <polygon
          points={pts}
          fill={fc}
          stroke={sc}
          strokeWidth={sw}
          transform={xf}
        />
      );
    }

    case "star": {
      const outer = half;
      const inner = half * 0.4;
      const pts: string[] = [];
      for (let i = 0; i < 5; i++) {
        const oa = ((i * 72 - 90) * Math.PI) / 180;
        const ia = (((i * 72 + 36) - 90) * Math.PI) / 180;
        pts.push(
          `${x + outer * Math.cos(oa)},${y + outer * Math.sin(oa)}`,
        );
        pts.push(
          `${x + inner * Math.cos(ia)},${y + inner * Math.sin(ia)}`,
        );
      }
      return (
        <polygon
          points={pts.join(" ")}
          fill={fc}
          stroke={sc}
          strokeWidth={sw}
          transform={xf}
        />
      );
    }

    case "hexagon": {
      const pts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const a = ((i * 60 - 30) * Math.PI) / 180;
        pts.push(
          `${x + half * Math.cos(a)},${y + half * Math.sin(a)}`,
        );
      }
      return (
        <polygon
          points={pts.join(" ")}
          fill={fc}
          stroke={sc}
          strokeWidth={sw}
          transform={xf}
        />
      );
    }

    default:
      return (
        <circle cx={x} cy={y} r={half} fill={fc} stroke={sc} strokeWidth={sw} />
      );
  }
}

// ─── Cell SVG ────────────────────────────────────────

function CellSvg({
  cell,
  size = 80,
  border = true,
}: {
  cell: VisualCell | null;
  size?: number;
  border?: boolean;
}) {
  if (!cell) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="shrink-0"
      >
        {border && (
          <rect
            x="2"
            y="2"
            width="96"
            height="96"
            fill="#eef2ff"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeDasharray="6,3"
            rx="6"
          />
        )}
        <text
          x="50"
          y="62"
          textAnchor="middle"
          fontSize="40"
          fill="#94a3b8"
          fontWeight="bold"
        >
          ?
        </text>
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="shrink-0"
    >
      {border && (
        <rect
          x="2"
          y="2"
          width="96"
          height="96"
          fill="white"
          stroke="#e2e8f0"
          strokeWidth="1.5"
          rx="6"
        />
      )}
      {cell.shapes.map((s, i) => (
        <SvgShape key={i} shape={s} />
      ))}
    </svg>
  );
}

// ─── Layout Components ───────────────────────────────

function MatrixLayout({ cells }: { cells: (VisualCell | null)[] }) {
  return (
    <div className="flex justify-center mb-6">
      <div className="inline-grid grid-cols-3 gap-1 p-3 bg-gray-50 rounded-xl border-2 border-gray-200 shadow-inner">
        {cells.map((c, i) => (
          <CellSvg key={i} cell={c} size={88} />
        ))}
      </div>
    </div>
  );
}

function SequenceLayout({ cells }: { cells: (VisualCell | null)[] }) {
  return (
    <div className="flex justify-center mb-6 overflow-x-auto pb-2">
      <div className="flex items-center gap-0.5 p-3 bg-gray-50 rounded-xl border-2 border-gray-200 shadow-inner">
        {cells.map((c, i) => (
          <div key={i} className="flex items-center shrink-0">
            <CellSvg cell={c} size={64} />
            {i < cells.length - 1 && (
              <span className="text-gray-300 text-sm mx-0.5 select-none">
                ▸
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalogyLayout({ cells }: { cells: (VisualCell | null)[] }) {
  return (
    <div className="flex justify-center mb-6 overflow-x-auto pb-2">
      <div className="flex items-center gap-1.5 p-3 bg-gray-50 rounded-xl border-2 border-gray-200 shadow-inner">
        <CellSvg cell={cells[0]} size={76} />
        <span className="text-gray-400 text-xl font-bold select-none">
          :
        </span>
        <CellSvg cell={cells[1]} size={76} />
        <span className="text-gray-300 text-2xl font-bold mx-1 select-none">
          =
        </span>
        <CellSvg cell={cells[2]} size={76} />
        <span className="text-gray-400 text-xl font-bold select-none">
          :
        </span>
        <CellSvg cell={cells[3]} size={76} />
      </div>
    </div>
  );
}

// ─── Exports ─────────────────────────────────────────

export function VisualQuestion({ data }: { data: VisualData }) {
  switch (data.type) {
    case "matrix":
      return <MatrixLayout cells={data.cells} />;
    case "sequence":
      return <SequenceLayout cells={data.cells} />;
    case "analogy":
      return <AnalogyLayout cells={data.cells} />;
    default:
      return null;
  }
}

export function VisualOption({ cell }: { cell: VisualCell }) {
  return <CellSvg cell={cell} size={56} border={false} />;
}
