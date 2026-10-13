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
    return api
      .listItems()
      .then((data) => table.setData(data))
      .catch((error) => console.error(error));
  };

  useEffect(() => {
    const table = new Tabulator(containerRef.current, {
      layout: "fitData",
      responsiveLayout: false,
      placeholder: "Kayıt bulunamadı",
      pagination: true,
      paginationSize: 12,
      paginationCounter: "rows",
      movableColumns: true,
      height: "100%",
      rowHeight: 24,
      vertAlign: "middle",
      selectableRows: 1,
      columns,
    });

    tableRef.current = table;
    table.on("cellEdited", (cell) => onCellEdited(cell));
    table.on("rowContext", (event, row) => {
      event.preventDefault();
      onRowContext(event, row.getData());
    });

    loadItems();

    return () => {
      table.destroy();
      tableRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    reload: loadItems,
    exportCsv: () => tableRef.current?.download("csv", "runstock.csv"),
    clearFilters: () => {
      const table = tableRef.current;
      if (!table) return;
      table.clearHeaderFilter();
      table.clearFilter(true);
    },
    applySearch: (term) => {
      const table = tableRef.current;
      if (!table) return;
      const query = term.trim().toLowerCase();
      if (!query) {
        table.clearFilter(true);
        return;
      }
      table.setFilter((row) =>
        Object.values(row).some((value) => String(value).toLowerCase().includes(query))
      );
    },
  }));

  return <div className="grid-wrap" ref={containerRef} />;
});

export default StockTable;
