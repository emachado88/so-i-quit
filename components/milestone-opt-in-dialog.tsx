import React from "react";
import { Button, Dialog, Portal } from "react-native-paper";

import { ThemedText } from "@/components/themed-text";
import { useAppSettings } from "@/contexts/settings-context";
import { themes } from "@/constants/theme";

interface MilestoneOptInDialogProps {
  visible: boolean;
  /** User chose to enable notifications now. */
  onEnable: () => void;
  /** User deferred (or permission denied): keep preference disabled. */
  onNotNow: () => void;
}

/**
 * Post-wizard opt-in for local milestone notifications.
 * Shown once, right after the first habit wizard is completed.
 */
const MilestoneOptInDialog = ({
  visible,
  onEnable,
  onNotNow,
}: MilestoneOptInDialogProps): React.JSX.Element => {
  const { t, scheme } = useAppSettings();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onNotNow}>
        <Dialog.Title>
          <ThemedText type="subtitle">
            {t("milestone.notificationsOptInTitle")}
          </ThemedText>
        </Dialog.Title>
        <Dialog.Content>
          <ThemedText>{t("milestone.notificationsOptInBody")}</ThemedText>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onNotNow}>{t("milestone.notNow")}</Button>
          <Button
            mode="contained"
            textColor={themes[scheme].colors.onPrimary}
            onPress={onEnable}
          >
            {t("milestone.enableNotifications")}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

export default MilestoneOptInDialog;
