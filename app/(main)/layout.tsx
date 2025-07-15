// ruta: app/(main)/layout.tsx

import Sidebar from "@/components/Sidebar";
import { SettingsProvider } from "@/context/SettingsContext"; // Importamos el proveedor

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Envolvemos tu diseño original con el SettingsProvider
    // para que la configuración de moneda funcione en estas páginas.
    <SettingsProvider>
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </SettingsProvider>
  );
}