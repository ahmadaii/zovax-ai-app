import { Navigate } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";

type Props = { children: React.ReactElement };

export default function ProtectedRoute({ children }: Props) {
  const { ready, token } = useTenant();
  if (!ready) return null;

  if (!token) return <Navigate to="/" replace />;

  return children;
}

export { ProtectedRoute };
