import { defineChart, stack } from "@tanstack/charts";
import { transactions } from "../../dummy/money/const";
import { barY } from "@tanstack/charts";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { Chart } from "@tanstack/charts/react";
import { tooltip } from "@tanstack/charts/tooltip";

const ColumnGraphDefinition = defineChart({
  tooltip,
  marks: [
    barY(transactions, {
      x: "date",
      y: "amount",
      z: "categoryId",
      color: "categoryId",
      layout: stack({}), // nameごとに並べたいがそのためにマージしないといけない。
    }),
  ],
  scales: {
    x: {
      axis: { label: "曜日" },
      scale: () => scaleBand<string>().padding(0.4),
    },
    y: {
      scale: scaleLinear,
      nice: true,
      grid: true,
      axis: { label: "残高" },
    },
  },
});

const ColumnGraph = () => (
  <Chart definition={ColumnGraphDefinition} height={320} ariaLabel="一週間のお金の流動" />
);

export default ColumnGraph;
