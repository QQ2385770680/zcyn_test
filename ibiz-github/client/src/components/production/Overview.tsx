/**
 * ProductionOverview — 生产总览
 *
 * 按照用户提供的表格布局：
 * 左侧：班次产量表（第一班/一加/第二班/二加 × ABCD + 可用人数 + 可用机器）
 * 右侧：本期关键参数列（本期机器、本期购买、期初人数、最少解雇、本期解雇、最大雇佣、本期雇佣）
 * 支持 2列 / 4列 切换（localStorage 持久化）
 * 可用人数/可用机器颜色与 Simulator 中约束颜色完全同步
 * 支持导出 Excel（一个工作表中按一行4列排列8期卡片）
 * 显示当前使用的方案名与算法简介
 */
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  ShieldCheck,
  ShieldAlert,
  LayoutGrid,
  Rows3,
  Package,
  TrendingUp,
  Factory,
  Users,
  Download,
  FileSpreadsheet,
  Cpu,
  BookOpen,
} from "lucide-react";

import {
  type PeriodResult,
  type PeriodProduction,
  type PeriodDecision,
  allConstraintsSatisfied,
} from "@/lib/data";
import { useConfig } from "@/lib/ConfigContext";
import { calcAllPeriods, getConstraintStatus } from "@/lib/engine";
import { getAlgorithm, type AlgorithmProfile } from "@/lib/algorithms";

// ============================================================
// localStorage 键
// ============================================================

const LAYOUT_STORAGE_KEY = "ibiz-overview-layout";

// ============================================================
// 从 Simulator 缓存中读取排产数据
// ============================================================

function loadSimCache() {
  try {
    const raw = localStorage.getItem("ibiz-sim-cache");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ============================================================
// 约束颜色函数（与 Simulator 完全同步）
// ============================================================

function constraintColor(value: number): string {
  if (value < -0.001) return "text-red-600 font-semibold"; // 超限
  if (value <= 5) return "text-emerald-600"; // 达标
  return "text-amber-600"; // 偏大
}

function constraintBgCell(value: number): string {
  if (value < -0.001) return "bg-red-50";
  if (value <= 5) return "";
  return "bg-amber-50";
}

// ============================================================
// 期数中文标签
// ============================================================

const PERIOD_CN = ["一", "二", "三", "四", "五", "六", "七", "八"];

// ============================================================
// Excel 导出函数
// ============================================================

async function exportToExcel(results: PeriodResult[], schemeName: string, algoName: string) {
  const ExcelJS = await import("exceljs");
  const { saveAs } = await import("file-saver");

  const wb = new ExcelJS.Workbook();
  wb.creator = "iBizSim 智能决策系统";
  wb.created = new Date();
  const ws = wb.addWorksheet("生产总览", {
    views: [{ state: "frozen", ySplit: 3, xSplit: 0 }],
  });

  // ============ 样式常量 ============
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const THIN_BORDER: any = {
    top: { style: "thin", color: { argb: "FFB0B0B0" } },
    left: { style: "thin", color: { argb: "FFB0B0B0" } },
    bottom: { style: "thin", color: { argb: "FFB0B0B0" } },
    right: { style: "thin", color: { argb: "FFB0B0B0" } },
  };
  const THICK_BORDER_BOTTOM: any = {
    ...THIN_BORDER,
    bottom: { style: "medium", color: { argb: "FF333333" } },
  };

  const FILL_TITLE_PASS: any = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
  const FILL_TITLE_FAIL: any = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDC2626" } };
  const FILL_HEADER: any = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  const FILL_PARAM_LABEL: any = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
  const FILL_PARAM_BLUE: any = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };
  const FILL_PARAM_AMBER: any = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
  const FILL_SUMMARY: any = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };
  const FILL_CONSTRAINT_GREEN: any = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
  const FILL_CONSTRAINT_YELLOW: any = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF9C3" } };
  const FILL_CONSTRAINT_RED: any = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
  const FILL_CONSTRAINT_ROW: any = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F9FF" } };

  const FONT_TITLE: any = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
  const FONT_HEADER: any = { bold: true, size: 10, color: { argb: "FF475569" } };
  const FONT_NORMAL: any = { size: 10, color: { argb: "FF1E293B" } };
  const FONT_LABEL: any = { size: 9, color: { argb: "FF64748B" } };
  const FONT_BOLD: any = { bold: true, size: 10, color: { argb: "FF1E293B" } };
  const FONT_BLUE_BOLD: any = { bold: true, size: 11, color: { argb: "FF1D4ED8" } };
  const FONT_AMBER_BOLD: any = { bold: true, size: 11, color: { argb: "FFB45309" } };
  const FONT_GREEN: any = { bold: true, size: 10, color: { argb: "FF059669" } };
  const FONT_YELLOW: any = { bold: true, size: 10, color: { argb: "FFD97706" } };
  const FONT_RED: any = { bold: true, size: 10, color: { argb: "FFDC2626" } };

  const ALIGN_CENTER: any = { horizontal: "center", vertical: "middle" };
  const ALIGN_RIGHT: any = { horizontal: "right", vertical: "middle" };
  const ALIGN_LEFT: any = { horizontal: "left", vertical: "middle" };

  // ============ 布局常量 ============
  const COLS_PER_CARD = 7; // 班次标签 + 4班次 + 参数名 + 参数值
  const COL_GAP = 1;
  const ROWS_PER_CARD = 10; // 标题1 + 表头1 + ABCD 4 + 可用人数1 + 可用机器1 + 汇总1 + 空行1
  const CARDS_PER_ROW = 4;

  // ============ 第1-3行：全局信息 ============
  const totalOutput = results.reduce((s, r) => s + r.totalOutput.A + r.totalOutput.B + r.totalOutput.C + r.totalOutput.D, 0);
  const totalA = results.reduce((s, r) => s + r.totalOutput.A, 0);
  const totalB = results.reduce((s, r) => s + r.totalOutput.B, 0);
  const totalC = results.reduce((s, r) => s + r.totalOutput.C, 0);
  const totalD = results.reduce((s, r) => s + r.totalOutput.D, 0);
  const passCount = results.filter(r => allConstraintsSatisfied(r.constraints)).length;

  // Row 1: 标题
  ws.mergeCells(1, 1, 1, 14);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `iBizSim 生产总览 — ${schemeName || "未命名方案"}`;
  titleCell.font = { bold: true, size: 14, color: { argb: "FF1E3A5F" } };
  titleCell.alignment = { horizontal: "left", vertical: "middle" };
  ws.getRow(1).height = 28;

  // Row 2: 方案 + 算法 + 统计
  ws.getCell(2, 1).value = `求解算法: ${algoName || "未指定"}`;
  ws.getCell(2, 1).font = { size: 10, color: { argb: "FF475569" } };
  ws.getCell(2, 8).value = `8期总产量: ${totalOutput} (A:${totalA} B:${totalB} C:${totalC} D:${totalD})`;
  ws.getCell(2, 8).font = { size: 10, bold: true, color: { argb: "FF1D4ED8" } };
  ws.getCell(2, 20).value = `约束通过: ${passCount}/${results.length}`;
  ws.getCell(2, 20).font = { size: 10, color: passCount === results.length ? { argb: "FF059669" } : { argb: "FFDC2626" } };
  ws.getRow(2).height = 20;

  // Row 3: 导出时间
  ws.getCell(3, 1).value = `导出时间: ${new Date().toLocaleString("zh-CN")}`;
  ws.getCell(3, 1).font = { size: 9, italic: true, color: { argb: "FF94A3B8" } };
  ws.getRow(3).height = 18;

  // ============ 辅助函数 ============
  function getConstraintFill(value: number): any {
    if (value < -0.001) return FILL_CONSTRAINT_RED;
    if (value <= 5) return FILL_CONSTRAINT_GREEN;
    return FILL_CONSTRAINT_YELLOW;
  }
  function getConstraintFont(value: number): any {
    if (value < -0.001) return FONT_RED;
    if (value <= 5) return FONT_GREEN;
    return FONT_YELLOW;
  }

  function setCell(
    row: number, col: number,
    value: string | number,
    opts?: {
      font?: any;
      fill?: any;
      alignment?: any;
      border?: any;
      numFmt?: string;
    }
  ) {
    const cell = ws.getCell(row, col);
    cell.value = value;
    if (opts?.font) cell.font = opts.font;
    if (opts?.fill) cell.fill = opts.fill;
    if (opts?.alignment) cell.alignment = opts.alignment;
    if (opts?.border) cell.border = opts.border;
    if (opts?.numFmt) cell.numFmt = opts.numFmt;
  }

  // ============ 设置列宽 ============
  const totalCols = CARDS_PER_ROW * (COLS_PER_CARD + COL_GAP);
  for (let i = 1; i <= totalCols; i++) {
    const posInBlock = (i - 1) % (COLS_PER_CARD + COL_GAP);
    if (posInBlock === COLS_PER_CARD) {
      ws.getColumn(i).width = 2; // 间隔列
    } else if (posInBlock === 0) {
      ws.getColumn(i).width = 10; // 班次标签列
    } else if (posInBlock === 5) {
      ws.getColumn(i).width = 10; // 参数名列
    } else if (posInBlock === 6) {
      ws.getColumn(i).width = 10; // 参数值列
    } else {
      ws.getColumn(i).width = 10; // 数值列
    }
  }

  // ============ 写入每期卡片 ============
  const START_ROW = 5; // 从第5行开始

  results.forEach((r, idx) => {
    const rowBlock = Math.floor(idx / CARDS_PER_ROW);
    const colBlock = idx % CARDS_PER_ROW;
    const baseRow = START_ROW + rowBlock * ROWS_PER_CARD;
    const baseCol = 1 + colBlock * (COLS_PER_CARD + COL_GAP);

    const prod = r.production;
    const res = r.resources;
    const con = r.constraints;
    const passed = allConstraintsSatisfied(con);
    const total = r.totalOutput.A + r.totalOutput.B + r.totalOutput.C + r.totalOutput.D;

    // --- 标题行（合并7列） ---
    ws.mergeCells(baseRow, baseCol, baseRow, baseCol + 4);
    setCell(baseRow, baseCol, `第${PERIOD_CN[idx]}期`, {
      font: FONT_TITLE,
      fill: passed ? FILL_TITLE_PASS : FILL_TITLE_FAIL,
      alignment: ALIGN_CENTER,
      border: THIN_BORDER,
    });
    setCell(baseRow, baseCol + 5, passed ? "✓ 通过" : "✗ 超限", {
      font: { bold: true, size: 10, color: { argb: "FFFFFFFF" } },
      fill: passed ? FILL_TITLE_PASS : FILL_TITLE_FAIL,
      alignment: ALIGN_CENTER,
      border: THIN_BORDER,
    });
    setCell(baseRow, baseCol + 6, "", {
      fill: passed ? FILL_TITLE_PASS : FILL_TITLE_FAIL,
      border: THIN_BORDER,
    });
    ws.getRow(baseRow).height = 22;

    // --- 表头行 ---
    const hRow = baseRow + 1;
    const headers = ["班次", "第一班", "一加", "第二班", "二加"];
    headers.forEach((h, hi) => {
      setCell(hRow, baseCol + hi, h, {
        font: FONT_HEADER,
        fill: FILL_HEADER,
        alignment: hi === 0 ? ALIGN_LEFT : ALIGN_CENTER,
        border: THICK_BORDER_BOTTOM,
      });
    });
    // 右侧表头留空但有样式
    setCell(hRow, baseCol + 5, "", { fill: FILL_HEADER, border: THICK_BORDER_BOTTOM });
    setCell(hRow, baseCol + 6, "", { fill: FILL_HEADER, border: THICK_BORDER_BOTTOM });

    // --- ABCD 产量行 ---
    const products = ["A", "B", "C", "D"] as const;
    const rightLabels = ["本期机器", "本期购买", "期初人数", "最少解雇", "本期解雇", "最大雇佣", "本期雇佣"];
    const rightValues: number[] = [res.machines, res.machinesPurchased, res.initialWorkers, res.minFire, res.fired, res.maxHire, res.hired];
    const rightHighlight = ["blue", null, "amber", null, null, null, null];

    products.forEach((p, pIdx) => {
      const row = baseRow + 2 + pIdx;
      const isEven = pIdx % 2 === 0;
      const rowFill: any = isEven ? undefined : { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };

      setCell(row, baseCol, `${p}产量`, {
        font: FONT_BOLD,
        fill: rowFill,
        alignment: ALIGN_LEFT,
        border: THIN_BORDER,
      });

      // 4个班次数值
      const vals = [prod.shift1[p], prod.ot1[p], prod.shift2[p], prod.ot2[p]];
      vals.forEach((v, vi) => {
        const hasOutput = v > 0;
        setCell(row, baseCol + 1 + vi, v, {
          font: hasOutput ? { bold: true, size: 10, color: { argb: "FF166534" } } : FONT_NORMAL,
          fill: hasOutput ? { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } } : rowFill,
          alignment: ALIGN_CENTER,
          border: THIN_BORDER,
        });
      });

      // 右侧参数
      setCell(row, baseCol + 5, rightLabels[pIdx], {
        font: FONT_LABEL,
        fill: FILL_PARAM_LABEL,
        alignment: ALIGN_RIGHT,
        border: THIN_BORDER,
      });

      const rh = rightHighlight[pIdx];
      setCell(row, baseCol + 6, rightValues[pIdx], {
        font: rh === "blue" ? FONT_BLUE_BOLD : rh === "amber" ? FONT_AMBER_BOLD : FONT_BOLD,
        fill: rh === "blue" ? FILL_PARAM_BLUE : rh === "amber" ? FILL_PARAM_AMBER : undefined,
        alignment: ALIGN_CENTER,
        border: THIN_BORDER,
      });
    });

    // --- 可用人数行 ---
    const wRow = baseRow + 6;
    setCell(wRow, baseCol, "可用人数", {
      font: { bold: true, size: 10, color: { argb: "FF1D4ED8" } },
      fill: FILL_CONSTRAINT_ROW,
      alignment: ALIGN_LEFT,
      border: THIN_BORDER,
    });
    const workerVals = [
      { val: con.c1_workersAfterShift1, show: true },
      { val: con.c2_workersAfterOt1, show: true },
      { val: 0, show: false },
      { val: con.c4_workersAfterOt2, show: true },
    ];
    workerVals.forEach((item, i) => {
      if (item.show) {
        setCell(wRow, baseCol + 1 + i, Number(item.val.toFixed(3)), {
          font: getConstraintFont(item.val),
          fill: getConstraintFill(item.val),
          alignment: ALIGN_CENTER,
          border: THIN_BORDER,
          numFmt: "0.000",
        });
      } else {
        setCell(wRow, baseCol + 1 + i, "—", {
          font: { size: 10, color: { argb: "FFC0C0C0" } },
          fill: FILL_CONSTRAINT_ROW,
          alignment: ALIGN_CENTER,
          border: THIN_BORDER,
        });
      }
    });
    // 右侧：本期解雇
    setCell(wRow, baseCol + 5, rightLabels[4], { font: FONT_LABEL, fill: FILL_PARAM_LABEL, alignment: ALIGN_RIGHT, border: THIN_BORDER });
    setCell(wRow, baseCol + 6, rightValues[4], { font: FONT_BOLD, alignment: ALIGN_CENTER, border: THIN_BORDER });

    // --- 可用机器行 ---
    const mRow = baseRow + 7;
    setCell(mRow, baseCol, "可用机器", {
      font: { bold: true, size: 10, color: { argb: "FF1D4ED8" } },
      fill: FILL_CONSTRAINT_ROW,
      alignment: ALIGN_LEFT,
      border: THIN_BORDER,
    });
    const machineVals = [
      { val: con.c5_machinesAfterShift1, show: true },
      { val: 0, show: false },
      { val: con.c7_machinesAfterShift2, show: true },
      { val: con.c8_machinesAfterOt2, show: true },
    ];
    machineVals.forEach((item, i) => {
      if (item.show) {
        setCell(mRow, baseCol + 1 + i, Number(item.val.toFixed(3)), {
          font: getConstraintFont(item.val),
          fill: getConstraintFill(item.val),
          alignment: ALIGN_CENTER,
          border: THIN_BORDER,
          numFmt: "0.000",
        });
      } else {
        setCell(mRow, baseCol + 1 + i, "—", {
          font: { size: 10, color: { argb: "FFC0C0C0" } },
          fill: FILL_CONSTRAINT_ROW,
          alignment: ALIGN_CENTER,
          border: THIN_BORDER,
        });
      }
    });
    // 右侧：最大雇佣
    setCell(mRow, baseCol + 5, rightLabels[5], { font: FONT_LABEL, fill: FILL_PARAM_LABEL, alignment: ALIGN_RIGHT, border: THIN_BORDER });
    setCell(mRow, baseCol + 6, rightValues[5], { font: FONT_BOLD, alignment: ALIGN_CENTER, border: THIN_BORDER });

    // --- 汇总行 ---
    const tRow = baseRow + 8;
    setCell(tRow, baseCol, `总产量: ${total}`, {
      font: { bold: true, size: 10, color: { argb: "FF92400E" } },
      fill: FILL_SUMMARY,
      alignment: ALIGN_LEFT,
      border: THIN_BORDER,
    });
    setCell(tRow, baseCol + 1, `A:${r.totalOutput.A}`, { font: FONT_NORMAL, fill: FILL_SUMMARY, alignment: ALIGN_CENTER, border: THIN_BORDER });
    setCell(tRow, baseCol + 2, `B:${r.totalOutput.B}`, { font: FONT_NORMAL, fill: FILL_SUMMARY, alignment: ALIGN_CENTER, border: THIN_BORDER });
    setCell(tRow, baseCol + 3, `C:${r.totalOutput.C}`, { font: FONT_NORMAL, fill: FILL_SUMMARY, alignment: ALIGN_CENTER, border: THIN_BORDER });
    setCell(tRow, baseCol + 4, `D:${r.totalOutput.D}`, { font: FONT_NORMAL, fill: FILL_SUMMARY, alignment: ALIGN_CENTER, border: THIN_BORDER });
    // 右侧：本期雇佣
    setCell(tRow, baseCol + 5, rightLabels[6], { font: FONT_LABEL, fill: FILL_PARAM_LABEL, alignment: ALIGN_RIGHT, border: THIN_BORDER });
    setCell(tRow, baseCol + 6, rightValues[6], { font: FONT_BOLD, alignment: ALIGN_CENTER, border: THIN_BORDER });

    // 设置行高
    for (let ri = baseRow + 1; ri <= tRow; ri++) {
      ws.getRow(ri).height = 20;
    }
  });

  // ============ 导出文件 ============
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `生产总览_${schemeName || "排产方案"}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ============================================================
// 单期卡片组件（核心：按图片布局）
// ============================================================

interface PeriodTableCardProps {
  result: PeriodResult;
  periodIndex: number;
}

function PeriodTableCard({ result, periodIndex }: PeriodTableCardProps) {
  const r = result;
  const prod = r.production;
  const res = r.resources;
  const con = r.constraints;
  const passed = allConstraintsSatisfied(con);

  const fmt = (v: number) => {
    if (v === 0) return "0";
    return Number.isInteger(v) ? v.toString() : v.toFixed(3);
  };

  // 右侧参数列数据
  const rightParams = [
    { label: "本期机器", value: res.machines, highlight: "blue" as const },
    { label: "本期购买", value: res.machinesPurchased, highlight: null },
    { label: "期初人数", value: res.initialWorkers, highlight: "amber" as const },
    { label: "最少解雇", value: res.minFire, highlight: null },
    { label: "本期解雇", value: res.fired, highlight: null },
    { label: "最大雇佣", value: res.maxHire, highlight: null },
    { label: "本期雇佣", value: res.hired, highlight: null },
  ];

  // 可用人数约束值（对应4个班次列）
  const workerConstraints = [
    { val: con.c1_workersAfterShift1, show: true },
    { val: con.c2_workersAfterOt1, show: true },
    { val: null as number | null, show: false }, // 第二班无人数约束
    { val: con.c4_workersAfterOt2, show: true },
  ];

  // 可用机器约束值（对应4个班次列）
  const machineConstraints = [
    { val: con.c5_machinesAfterShift1, show: true },
    { val: null as number | null, show: false }, // 一加无机器约束
    { val: con.c7_machinesAfterShift2, show: true },
    { val: con.c8_machinesAfterOt2, show: true },
  ];

  return (
    <div className={`rounded-lg border overflow-hidden transition-shadow hover:shadow-md ${
      !passed ? "border-red-300 shadow-red-100/50" : "border-gray-200 shadow-sm"
    }`}>
      {/* 标题栏 */}
      <div className={`text-center py-1.5 font-bold text-sm border-b ${
        passed
          ? "bg-gradient-to-r from-slate-50 to-blue-50/50 text-foreground border-gray-200"
          : "bg-gradient-to-r from-red-50 to-orange-50/50 text-red-700 border-red-200"
      }`}>
        <span className="flex items-center justify-center gap-1.5">
          第{PERIOD_CN[periodIndex]}期
          {passed ? (
            <ShieldCheck className="size-3.5 text-emerald-500" />
          ) : (
            <ShieldAlert className="size-3.5 text-red-500" />
          )}
        </span>
      </div>

      {/* 主体表格 */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          {/* 表头 */}
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200">
              <th className="py-1.5 px-2 text-left font-semibold text-gray-600 whitespace-nowrap w-[60px]">班次</th>
              <th className="py-1.5 px-1.5 text-center font-semibold text-gray-600 whitespace-nowrap">第一班</th>
              <th className="py-1.5 px-1.5 text-center font-semibold text-gray-600 whitespace-nowrap">一加</th>
              <th className="py-1.5 px-1.5 text-center font-semibold text-gray-600 whitespace-nowrap">第二班</th>
              <th className="py-1.5 px-1.5 text-center font-semibold text-gray-600 whitespace-nowrap">二加</th>
              <th className="py-1.5 px-2 text-right font-semibold text-blue-700 whitespace-nowrap border-l border-gray-200 w-[70px]" colSpan={2}>
                {/* 右侧参数表头留空 */}
              </th>
            </tr>
          </thead>
          <tbody>
            {/* ABCD 产量行 */}
            {(["A", "B", "C", "D"] as const).map((p, pIdx) => (
              <tr key={p} className={`border-b border-gray-100 ${pIdx % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                <td className="py-1 px-2 font-medium text-gray-700 whitespace-nowrap">{p}产量</td>
                <td className="py-1 px-1.5 text-center tabular-nums">{prod.shift1[p]}</td>
                <td className="py-1 px-1.5 text-center tabular-nums">{prod.ot1[p]}</td>
                <td className="py-1 px-1.5 text-center tabular-nums">{prod.shift2[p]}</td>
                <td className="py-1 px-1.5 text-center tabular-nums">{prod.ot2[p]}</td>
                {/* 右侧参数 */}
                <td className="py-1 px-2 text-right text-gray-600 whitespace-nowrap border-l border-gray-200 text-[10px]">
                  {rightParams[pIdx]?.label}
                </td>
                <td className={`py-1 px-2 text-right tabular-nums font-bold whitespace-nowrap min-w-[40px] ${
                  rightParams[pIdx]?.highlight === "blue"
                    ? "text-blue-700 bg-blue-50/60"
                    : rightParams[pIdx]?.highlight === "amber"
                    ? "text-amber-700 bg-amber-50/60"
                    : "text-foreground"
                }`}>
                  {rightParams[pIdx]?.value ?? ""}
                </td>
              </tr>
            ))}

            {/* 可用人数行 */}
            <tr className="border-t border-dashed border-blue-200 bg-blue-50/20">
              <td className="py-1.5 px-2 font-medium text-blue-700 whitespace-nowrap text-[11px]">可用人数</td>
              {workerConstraints.map((item, i) => (
                <td
                  key={i}
                  className={`py-1.5 px-1.5 text-center tabular-nums font-mono text-[11px] ${
                    item.show && item.val !== null ? constraintColor(item.val) : ""
                  } ${item.show && item.val !== null ? constraintBgCell(item.val) : ""}`}
                >
                  {item.show && item.val !== null ? fmt(item.val) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              ))}
              {/* 右侧参数：最少解雇 */}
              <td className="py-1.5 px-2 text-right text-gray-600 whitespace-nowrap border-l border-gray-200 text-[10px]">
                {rightParams[4]?.label}
              </td>
              <td className="py-1.5 px-2 text-right tabular-nums font-bold whitespace-nowrap">
                {rightParams[4]?.value}
              </td>
            </tr>

            {/* 可用机器行 */}
            <tr className="border-t border-dashed border-blue-200 bg-blue-50/20">
              <td className="py-1.5 px-2 font-medium text-blue-700 whitespace-nowrap text-[11px]">可用机器</td>
              {machineConstraints.map((item, i) => (
                <td
                  key={i}
                  className={`py-1.5 px-1.5 text-center tabular-nums font-mono text-[11px] ${
                    item.show && item.val !== null ? constraintColor(item.val) : ""
                  } ${item.show && item.val !== null ? constraintBgCell(item.val) : ""}`}
                >
                  {item.show && item.val !== null ? fmt(item.val) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              ))}
              {/* 右侧参数：最大雇佣 */}
              <td className="py-1.5 px-2 text-right text-gray-600 whitespace-nowrap border-l border-gray-200 text-[10px]">
                {rightParams[5]?.label}
              </td>
              <td className={`py-1.5 px-2 text-right tabular-nums font-bold whitespace-nowrap`}>
                {rightParams[5]?.value}
              </td>
            </tr>

            {/* 额外一行：本期雇佣（右侧最后一个参数） */}
            <tr className="border-t border-gray-100">
              <td colSpan={5} className="py-1 px-2">
                {/* 左侧留空或放总产量 */}
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-muted-foreground">总产量:</span>
                  <span className="font-bold tabular-nums text-foreground">
                    {r.totalOutput.A + r.totalOutput.B + r.totalOutput.C + r.totalOutput.D}
                  </span>
                  <span className="text-muted-foreground ml-1">A:{r.totalOutput.A}</span>
                  <span className="text-muted-foreground">B:{r.totalOutput.B}</span>
                  <span className="text-muted-foreground">C:{r.totalOutput.C}</span>
                  <span className="text-muted-foreground">D:{r.totalOutput.D}</span>
                </div>
              </td>
              <td className="py-1 px-2 text-right text-gray-600 whitespace-nowrap border-l border-gray-200 text-[10px]">
                {rightParams[6]?.label}
              </td>
              <td className="py-1 px-2 text-right tabular-nums font-bold whitespace-nowrap">
                {rightParams[6]?.value}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// 统计卡片组件
// ============================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}

function StatCard({ icon, label, value, sub, accent = "text-foreground" }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={`text-lg font-bold tabular-nums leading-tight ${accent}`}>{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ============================================================
// 主组件
// ============================================================

export function ProductionOverview() {
  const { config } = useConfig();

  // 布局状态：从 localStorage 读取，默认 2 列
  const [layout, setLayout] = React.useState<2 | 4>(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (saved === "4") return 4;
    } catch { /* ignore */ }
    return 2;
  });

  // 切换布局时同时持久化
  const handleLayoutChange = React.useCallback((newLayout: 2 | 4) => {
    setLayout(newLayout);
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, String(newLayout));
    } catch { /* ignore */ }
  }, []);

  // 从 Simulator 缓存中读取排产数据
  const cachedSim = React.useMemo(() => loadSimCache(), []);

  // 方案名与算法信息
  const schemeName = React.useMemo(() => {
    if (cachedSim?.activeDesign?.name) return cachedSim.activeDesign.name;
    return "";
  }, [cachedSim]);

  const algorithmId = React.useMemo(() => {
    // 优先使用方案内置算法，其次使用模拟器当前算法
    if (cachedSim?.activeDesign?.algorithmId) return cachedSim.activeDesign.algorithmId;
    if (cachedSim?.algorithmId) return cachedSim.algorithmId;
    return "balanced";
  }, [cachedSim]);

  const currentAlgo: AlgorithmProfile = React.useMemo(() => getAlgorithm(algorithmId), [algorithmId]);

  const designSource = React.useMemo(() => {
    if (cachedSim?.designSource) return cachedSim.designSource;
    return null;
  }, [cachedSim]);

  const { productions, decisions } = React.useMemo(() => {
    if (cachedSim?.productions && cachedSim?.decisions) {
      return { productions: cachedSim.productions, decisions: cachedSim.decisions };
    }
    const emptyProd = Array.from({ length: config.periods }, () => ({
      shift1: { A: 0, B: 0, C: 0, D: 0 },
      ot1: { A: 0, B: 0, C: 0, D: 0 },
      shift2: { A: 0, B: 0, C: 0, D: 0 },
      ot2: { A: 0, B: 0, C: 0, D: 0 },
    }));
    const emptyDec = Array.from({ length: config.periods }, () => ({
      machinesPurchased: 0,
      fired: 0,
      hired: 0,
    }));
    return { productions: emptyProd, decisions: emptyDec };
  }, [cachedSim, config.periods]);

  const effectiveConfig = React.useMemo(() => {
    if (cachedSim?.initialMachines !== undefined && cachedSim?.initialWorkers !== undefined) {
      return {
        ...config,
        initialMachines: cachedSim.initialMachines,
        initialWorkers: cachedSim.initialWorkers,
      };
    }
    return config;
  }, [config, cachedSim]);

  // 计算所有期数结果
  const results: PeriodResult[] = React.useMemo(
    () => calcAllPeriods(effectiveConfig, productions, decisions),
    [effectiveConfig, productions, decisions]
  );

  // 判断是否有数据
  const hasData = results.some(
    (r) => r.totalOutput.A + r.totalOutput.B + r.totalOutput.C + r.totalOutput.D > 0
  );

  // 汇总统计
  const totalA = results.reduce((s, r) => s + r.totalOutput.A, 0);
  const totalB = results.reduce((s, r) => s + r.totalOutput.B, 0);
  const totalC = results.reduce((s, r) => s + r.totalOutput.C, 0);
  const totalD = results.reduce((s, r) => s + r.totalOutput.D, 0);
  const totalProduction = totalA + totalB + totalC + totalD;
  const avgProduction = results.length > 0 ? Math.round(totalProduction / results.length) : 0;
  const allPassed = results.every((r) => allConstraintsSatisfied(r.constraints));
  const passedCount = results.filter((r) => allConstraintsSatisfied(r.constraints)).length;
  const failedCount = results.length - passedCount;
  const lastResult = results[results.length - 1];
  const maxPeriodOutput = Math.max(
    ...results.map((r) => r.totalOutput.A + r.totalOutput.B + r.totalOutput.C + r.totalOutput.D)
  );
  const maxPeriodIdx = results.findIndex(
    (r) => r.totalOutput.A + r.totalOutput.B + r.totalOutput.C + r.totalOutput.D === maxPeriodOutput
  );

  // Excel 导出
  const [exporting, setExporting] = React.useState(false);
  const handleExport = React.useCallback(async () => {
    setExporting(true);
    try {
      await exportToExcel(results, schemeName, currentAlgo.name);
    } catch (e) {
      console.error("导出失败", e);
    } finally {
      setExporting(false);
    }
  }, [results, schemeName, currentAlgo.name]);

  // ============================================================
  // 空状态
  // ============================================================

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 mb-5 shadow-sm">
          <BarChart3 className="size-10 text-gray-300" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">暂无排产数据</h3>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          请先在「生产模拟」中配置初始参数并填写排产数据，<br />
          或加载一个方案设计，数据将自动同步到此处。
        </p>
      </div>
    );
  }

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <div className="space-y-5">
      {/* ========== 方案名 + 算法简介 ========== */}
      <div className="rounded-xl border border-gray-100 bg-gradient-to-r from-white to-slate-50/80 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          {/* 方案名 */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 shrink-0">
              <BookOpen className="size-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">当前方案</p>
              <p className="text-sm font-bold text-foreground truncate">
                {schemeName || "手动排产"}
                {designSource && (
                  <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                    ({designSource === "loaded" ? "已加载" : designSource === "market" ? "市场方案" : designSource})
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* 分隔线 */}
          <div className="hidden sm:block w-px h-8 bg-gray-200" />

          {/* 算法信息 */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 shrink-0">
              <Cpu className="size-4 text-violet-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">求解算法</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  {currentAlgo.icon} {currentAlgo.name}
                </span>
                <span className="text-[11px] text-muted-foreground leading-snug hidden md:inline">
                  — {currentAlgo.description}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== 顶部统计仪表板 ========== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Package className="size-5 text-blue-600" />}
          label="8期总产量"
          value={totalProduction.toLocaleString()}
          sub={`期均 ${avgProduction.toLocaleString()}`}
          accent="text-blue-700"
        />
        <StatCard
          icon={<TrendingUp className="size-5 text-emerald-600" />}
          label="峰值产量"
          value={maxPeriodOutput.toLocaleString()}
          sub={`第${PERIOD_CN[maxPeriodIdx]}期 (P${maxPeriodIdx + 1})`}
          accent="text-emerald-700"
        />
        <StatCard
          icon={<Factory className="size-5 text-indigo-600" />}
          label="末期机器数"
          value={lastResult?.resources.machines ?? 0}
          sub={`初始 ${effectiveConfig.initialMachines} 台`}
          accent="text-indigo-700"
        />
        <StatCard
          icon={<Users className="size-5 text-amber-600" />}
          label="末期可用人数"
          value={(lastResult?.resources.totalAvailableWorkers ?? 0).toFixed(1)}
          sub={`初始 ${effectiveConfig.initialWorkers} 人`}
          accent="text-amber-700"
        />
      </div>

      {/* ========== 约束状态 + 导出 + 布局切换 ========== */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-foreground">8期排产总览</span>
          {allPassed ? (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs gap-1">
              <ShieldCheck className="size-3" />
              {passedCount}/{results.length} 通过
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs gap-1">
              <ShieldAlert className="size-3" />
              {failedCount}期超限
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 导出 Excel 按钮 */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <Download className="size-3 animate-bounce" />
            ) : (
              <FileSpreadsheet className="size-3" />
            )}
            {exporting ? "导出中..." : "导出Excel"}
          </Button>

          {/* 布局切换 */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            <Button
              variant={layout === 4 ? "default" : "ghost"}
              size="sm"
              className={`h-7 px-2.5 text-xs gap-1 ${layout === 4 ? "" : "text-muted-foreground"}`}
              onClick={() => handleLayoutChange(4)}
            >
              <LayoutGrid className="size-3" />
              4列
            </Button>
            <Button
              variant={layout === 2 ? "default" : "ghost"}
              size="sm"
              className={`h-7 px-2.5 text-xs gap-1 ${layout === 2 ? "" : "text-muted-foreground"}`}
              onClick={() => handleLayoutChange(2)}
            >
              <Rows3 className="size-3" />
              2列
            </Button>
          </div>
        </div>
      </div>

      {/* ========== 8期卡片网格 ========== */}
      <div className={`grid gap-3 ${
        layout === 4 ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" : "grid-cols-1 xl:grid-cols-2"
      }`}>
        {results.map((result, idx) => (
          <PeriodTableCard
            key={result.period}
            result={result}
            periodIndex={idx}
          />
        ))}
      </div>
    </div>
  );
}
