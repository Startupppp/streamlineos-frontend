import {
  consoleReporter,
  installGlobalErrorHandlers,
  setErrorReporter,
} from "@/lib/observability";

setErrorReporter(consoleReporter);
installGlobalErrorHandlers();
