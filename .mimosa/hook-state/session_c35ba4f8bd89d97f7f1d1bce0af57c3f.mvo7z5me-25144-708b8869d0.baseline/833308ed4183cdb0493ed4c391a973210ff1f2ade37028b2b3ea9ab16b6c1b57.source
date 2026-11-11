import { useTranslation } from "react-i18next";
import { Toaster } from "sonner";

export function Toasts() {
  const { i18n } = useTranslation();
  return (
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      dir={i18n.language.startsWith("ar") ? "rtl" : "ltr"}
      toastOptions={{ duration: 6000 }}
    />
  );
}
