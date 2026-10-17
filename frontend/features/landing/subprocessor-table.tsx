import type { Subprocessor } from "@/lib/legal/subprocessors";

interface SubprocessorTableProps {
  subprocessors: readonly Subprocessor[];
}

export function SubprocessorTable({ subprocessors }: SubprocessorTableProps) {
  if (subprocessors.length === 0)
    return <p className="text-muted-foreground">No subprocessors are currently listed.</p>;

  return (
    <div className="not-prose overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-label">
        <thead className="bg-muted text-dense font-medium text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium">Vendor</th>
            <th className="px-4 py-2.5 text-left font-medium">Purpose</th>
            <th className="px-4 py-2.5 text-left font-medium">Region</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {subprocessors.map((entry) => (
            <tr key={entry.name}>
              <td className="px-4 py-2.5 font-medium text-foreground">
                {entry.url ? (
                  <a href={entry.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {entry.name}
                  </a>
                ) : (
                  entry.name
                )}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{entry.purpose}</td>
              <td className="px-4 py-2.5 text-muted-foreground font-mono text-dense">{entry.location}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
