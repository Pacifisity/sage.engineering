export function setupFileHandlers({
  exportBtn,
  importBtn,
  importFile,
  onExport,
  onImport
}) {
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const payload = onExport ? onExport() : [];
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "flow-tasks.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  }

  if (importBtn && importFile) {
    importBtn.addEventListener("click", () => {
      importFile.value = "";
      importFile.click();
    });

    importFile.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const incoming = JSON.parse(reader.result);
          if (Array.isArray(incoming) && onImport) {
            onImport(incoming);
          }
        } catch (error) {
          alert("Invalid JSON file.");
        }
      };
      reader.readAsText(file);
    });
  }
}
