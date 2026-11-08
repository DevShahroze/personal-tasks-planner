import Providers from "@/components/providers";
import { WorkspaceProvider } from "@/contexts/workspace-context";

export default function LoginLayout({ children }) {
  return (
    <Providers>
      <WorkspaceProvider>{children}</WorkspaceProvider>
    </Providers>
  );
}
