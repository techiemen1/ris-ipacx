import * as React from "react";

export const Table = ({ children }: { children: React.ReactNode }) => (
  <table className="min-w-full border border-gray-200 text-sm">{children}</table>
);

export const TableHeader = ({ children }: { children: React.ReactNode }) => (
  <thead className="bg-gray-100">{children}</thead>
);

export const TableBody = ({ children }: { children: React.ReactNode }) => (
  <tbody className="divide-y divide-gray-200">{children}</tbody>
);

export const TableRow = ({ children }: { children: React.ReactNode }) => (
  <tr className="hover:bg-gray-50">{children}</tr>
);

export const TableHead = ({ children }: { children: React.ReactNode }) => (
  <th className="px-4 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">
    {children}
  </th>
);

export const TableCell = ({ children }: { children: React.ReactNode }) => (
  <td className="px-4 py-2 border-b border-gray-100">{children}</td>
);
