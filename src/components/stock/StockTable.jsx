import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { TabulatorFull as Tabulator } from "tabulator-tables";
import { api } from "../../lib/api.js";
import { columns } from "./columns.js";
import { exportToExcel } from "../../lib/exportExcel.js";

const StockTable = forwardRef(function StockTable({ onRowContext, onCellEdited }, ref) {
  const containerRef = useRef(null);
  const tableRef = useRef(null);

  const loadItems = () => {
    const table = tableRef.current;
    if (!table) return Promise.resolve();
    return api.listItems().then((d) => table.setData(d)).catch((e) => console.error(e));
  };

  useEffect(() => {
    const table = new Tabulator(containerRef.current, {
      layout: "fitDataFill",
      responsiveLayout: false,
      placeholder: "<div style='padding:40px;color:#64748b;font-size:13px;text-align:center;'>Məlumat tapılmadı</div>",
      pagination: true,
      paginationSize: 25,
      paginationCounter: "rows",
      movableColumns: true,
      height: "100%",
      rowHeight: 34,
      vertAlign: "middle",
      selectableRows: "multiple",
      selectableRowsRangeMode: "click",
      columns,
    });
    tableRef.current = table;
    table.on("cellEdited", (cell) => onCellEdited(cell));
    table.on("rowContext", (event, row) => {
      event.preventDefault();
      onRowContext(event, row.getData());
    });
    loadItems();
    return () => { table.destroy(); tableRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    reload: loadItems,
    exportCsv: () => tableRef.current?.download("csv", "runstock.csv"),
    exportExcel: () => {
      const data = tableRef.current?.getData("active");
      exportToExcel(data || [], "stok_siyahisi.xlsx", "Stok");
    },
    clearFilters: () => {
      const t = tableRef.current;
      if (!t) return;
      t.clearHeaderFilter();
      t.clearFilter();
    },
    applySearch: (term) => {
      const t = tableRef.current;
      if (!t) return;
      const q = term.trim().toLowerCase();
      if (!q) {
        t.clearFilter();
        return;
      }
      t.setFilter((row) => Object.values(row).some((v) => String(v).toLowerCase().includes(q)));
    },
  }));

  return <div className="grid-wrap" ref={containerRef} />;
});

export default StockTable;
