import { LoadingState } from "@/components/shared/loading-state";

export default function SecretsLoading() {
  return <LoadingState variant="list" rows={5} />;
}
