import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { TabulatorFull as Tabulator } from "tabulator-tables";
import { exportToExcel } from "../../lib/exportExcel.js";

const DataGrid = forwardRef(function DataGrid({ columns, dataFetcher, onCellEdited, onRowContext, options = {} }, ref) {
  const containerRef = useRef(null);
  const tableRef = useRef(null);

  const load = () => {
    const t = tableRef.current;
    if (!t || !dataFetcher) return Promise.resolve();
    return dataFetcher().then((d) => t.setData(Array.isArray(d) ? d : [])).catch((e) => console.error(e));
  };

  useEffect(() => {
    const t = new Tabulator(containerRef.current, {
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
      selectableRows: 1,
      columns,
      ...options,
    });
    tableRef.current = t;
    if (onCellEdited) t.on("cellEdited", (cell) => onCellEdited(cell));
    if (onRowContext) t.on("rowContext", (e, row) => { e.preventDefault(); onRowContext(e, row.getData()); });
    load();
    return () => { t.destroy(); tableRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    reload: load,
    exportCsv: (name = "export.csv") => tableRef.current?.download("csv", name),
    exportExcel: (name = "export.xlsx") => {
      const data = tableRef.current?.getData("active");
      exportToExcel(data || [], name);
    },
    clearFilters: () => {
      const t = tableRef.current; if (!t) return; t.clearHeaderFilter(); t.clearFilter();
    },
    applySearch: (term) => {
      const t = tableRef.current; if (!t) return;
      const q = term.trim().toLowerCase();
      if (!q) { t.clearFilter(); return; }
      t.setFilter((row) => Object.values(row).some((v) => String(v).toLowerCase().includes(q)));
    },
    setData: (d) => tableRef.current?.setData(d),
  }));

  return <div className="grid-wrap" ref={containerRef} />;
});

export default DataGrid;
