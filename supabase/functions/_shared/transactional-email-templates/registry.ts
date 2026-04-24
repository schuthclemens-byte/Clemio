/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as contactAdmin } from './contact-admin.tsx'
import { template as contactConfirmation } from './contact-confirmation.tsx'
import { template as reportAdminAlert } from './report-admin-alert.tsx'
import { template as accountDeleted } from './account-deleted.tsx'
import { template as voiceCloneCreated } from './voice-clone-created.tsx'
import { template as passwordChanged } from './password-changed.tsx'
import { template as premiumActivated } from './premium-activated.tsx'
import { template as premiumCancelled } from './premium-cancelled.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'contact-admin': contactAdmin,
  'contact-confirmation': contactConfirmation,
  'report-admin-alert': reportAdminAlert,
  'account-deleted': accountDeleted,
  'voice-clone-created': voiceCloneCreated,
  'password-changed': passwordChanged,
  'premium-activated': premiumActivated,
  'premium-cancelled': premiumCancelled,
}
