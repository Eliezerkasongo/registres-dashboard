import React, { ReactNode } from "react";

// Props for Table
interface TableProps {
  children: ReactNode; // Table content (thead, tbody, etc.)
  className?: string; // Optional className for styling
}

// Props for TableHeader
interface TableHeaderProps {
  children: ReactNode; // Header row(s)
  className?: string; // Optional className for styling
}

// Props for TableBody
interface TableBodyProps {
  children: ReactNode; // Body row(s)
  className?: string; // Optional className for styling
}

// Props for TableRow
interface TableRowProps {
  children: ReactNode; // Cells (th or td)
  className?: string; // Optional className for styling
  draggable?: boolean; // Optional native drag-and-drop support, forwarded to the underlying tr
  onDragOver?: (e: React.DragEvent<HTMLTableRowElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLTableRowElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLTableRowElement>) => void;
}

// Props for TableCell
interface TableCellProps {
  children?: ReactNode; // Cell content
  isHeader?: boolean; // If true, renders as <th>, otherwise <td>
  className?: string; // Optional className for styling
  colSpan?: number; // Optional colSpan, forwarded to the underlying th/td
  onClick?: () => void; // Optional click handler, forwarded to the underlying th/td
  style?: React.CSSProperties; // Optional inline style, forwarded to the underlying th/td
}

// Table Component
const Table: React.FC<TableProps> = ({ children, className }) => {
  return <table className={`min-w-full  ${className}`}>{children}</table>;
};

// TableHeader Component
const TableHeader: React.FC<TableHeaderProps> = ({ children, className }) => {
  return <thead className={className}>{children}</thead>;
};

// TableBody Component
const TableBody: React.FC<TableBodyProps> = ({ children, className }) => {
  return <tbody className={className}>{children}</tbody>;
};

// TableRow Component
const TableRow: React.FC<TableRowProps> = ({
  children,
  className,
  draggable,
  onDragOver,
  onDrop,
  onDragEnd,
}) => {
  return (
    <tr
      className={className}
      draggable={draggable}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {children}
    </tr>
  );
};

// TableCell Component
const TableCell: React.FC<TableCellProps> = ({
  children,
  isHeader = false,
  className,
  colSpan,
  onClick,
  style,
}) => {
  const CellTag = isHeader ? "th" : "td";
  return (
    <CellTag className={` ${className}`} colSpan={colSpan} onClick={onClick} style={style}>
      {children}
    </CellTag>
  );
};

export { Table, TableHeader, TableBody, TableRow, TableCell };
