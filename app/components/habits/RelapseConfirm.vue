<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import ConfirmDialog from '../ui/ConfirmDialog.vue'

const { t } = useI18n()

defineProps<{ visible: boolean; name: string }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <ConfirmDialog
    :visible="visible"
    :title="t('habits.logRelapse')"
    :message="t('habits.relapseConfirm', { name })"
    :confirm-label="t('habits.logRelapse')"
    destructive
    @confirm="emit('confirm')"
    @cancel="emit('cancel')"
  />
</template>
