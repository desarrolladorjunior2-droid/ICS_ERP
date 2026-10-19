import { useMemo, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * Tabla genérica con ordenamiento.
 * columns: [{ key, label, render?(row), sortValue?(row), align? }]
 */
export default function DataTable({ columns, rows, onRowClick, empty = 'Sin registros', actions, dense = false }) {
  const [sort, setSort] = useState({ key: null, dir: 1 });

  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const col = columns.find((c) => c.key === sort.key);
    const val = (r) => (col?.sortValue ? col.sortValue(r) : r[sort.key]);
    return [...rows].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sort.dir;
      return String(va ?? '').localeCompare(String(vb ?? ''), 'es', { numeric: true }) * sort.dir;
    });
  }, [rows, sort, columns]);

  const toggle = (key) => setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: 1 }));

  return (
    <div className={`table-wrap ${dense ? 'dense' : ''}`}>
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => {
              const SortIcon = sort.key !== c.key ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
              return (
                <th key={c.key} className={c.align === 'right' ? 'right' : ''}>
                  <button className="th-sort" onClick={() => toggle(c.key)}>
                    {c.label}
                    <SortIcon size={12} aria-hidden />
                  </button>
                </th>
              );
            })}
            {actions && <th className="right" aria-label="Acciones" />}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} className="table-empty">
                {empty}
              </td>
            </tr>
          )}
          {sorted.map((r) => (
            <tr key={r.id} onClick={onRowClick ? () => onRowClick(r) : undefined} className={onRowClick ? 'clickable' : ''}>
              {columns.map((c) => (
                <td key={c.key} className={c.align === 'right' ? 'right num' : ''}>
                  {c.render ? c.render(r) : r[c.key] ?? '—'}
                </td>
              ))}
              {actions && (
                <td className="right row-actions" onClick={(e) => e.stopPropagation()}>
                  {actions(r)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
