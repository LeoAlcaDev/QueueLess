import { useLocation } from "react-router-dom";
import { Hammer } from "lucide-react";
import { EmptyState } from "@/components/ui";

/** Pantalla genérica para sub-rutas del nav que aún no se construyeron (Etapas 3–5). */
export default function Placeholder() {
  const { pathname } = useLocation();
  return (
    <EmptyState
      icon={Hammer}
      title="En construcción"
      description={`Esta sección (${pathname}) llega en una etapa siguiente del plan.`}
    />
  );
}
