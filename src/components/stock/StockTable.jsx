import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { TabulatorFull as Tabulator } from "tabulator-tables";
import { api } from "../../lib/api.js";
import { columns } from "./columns.js";

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
      layout: "fitData",
      responsiveLayout: false,
      placeholder: "Məlumat yoxdur",
      pagination: true,
      paginationSize: 15,
      paginationCounter: "rows",
      movableColumns: true,
      height: "100%",
      rowHeight: 24,
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
