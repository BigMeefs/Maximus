"use client";

import type { ImportError } from "@/types/database";
import Button from "@/components/ui/button";

export default function DownloadErrorsButton({
  errors,
  fileName,
}: {
  errors: ImportError[];
  fileName: string;
}) {
  function handleDownload() {
    const header = "Row,Error,Row Data\n";
    const lines = errors.map((e) => {
      const message = e.error_message.replace(/"/g, '""');
      const rowData = JSON.stringify(e.row_data ?? {}).replace(/"/g, '""');
      return `${e.row_number},"${message}","${rowData}"`;
    });
    const blob = new Blob([header + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName.replace(/\.[^.]+$/, "")}-errors.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="secondary" onClick={handleDownload} disabled={errors.length === 0}>
      Download error report
    </Button>
  );
}
