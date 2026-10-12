/**
 * Catalogue des permissions DOSPA (module:action).
 * Source de vérité : synchronisé vers la table `permission` par le seed.
 */
export const PERMISSIONS = [
  'settings:read',
  'settings:update',
  'organizations:read',
  'organizations:manage',
  'users:read',
  'users:manage',
  'roles:read',
  'roles:manage',
  'audit:read',
  'employees:read',
  'employees:manage',
  'employees:import',
  'employees:read_self',
  'documents:read',
  'documents:manage',
  'compensation:read',
  'compensation:manage',
  'schedules:read',
  'schedules:manage',
  'attendance:read',
  'attendance:read_self',
  'attendance:import',
  'attendance:correct',
  'attendance:approve',
  'attendance:request_correction',
  'leave:read',
  'leave:request',
  'leave:approve',
  'leave:manage',
  'payroll:read',
  'payroll:prepare',
  'payroll:approve',
  'payroll:lock',
  'payroll:close',
  'payroll:read_own_payslip',
  'payroll_rules:read',
  'payroll_rules:manage',
  'payroll_rules:validate',
  'reports:read',
  'exports:generate',
  'devices:read',
  'devices:manage',
  'devices:sync',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_MODULES = [...new Set(PERMISSIONS.map((p) => p.split(':')[0]!))];

export function splitPermission(p: Permission): { module: string; action: string } {
  const [module, action] = p.split(':') as [string, string];
  return { module, action };
}

export const ROLE_CODES = [
  'tenant_admin',
  'hr',
  'payroll_manager',
  'payroll_approver',
  'manager',
  'employee',
  'auditor',
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

/** Rôles soumis au MFA obligatoire (cahier §3.9 et §5.2 : administrateurs, RH, paie). */
export const PRIVILEGED_ROLES: readonly RoleCode[] = [
  'tenant_admin',
  'hr',
  'payroll_manager',
  'payroll_approver',
];

const SELF_SERVICE: Permission[] = [
  'employees:read_self',
  'attendance:read_self',
  'attendance:request_correction',
  'leave:request',
  'payroll:read_own_payslip',
];

/** Permissions par défaut des rôles système. Un tenant peut ensuite les ajuster (Phase 2+). */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleCode, readonly Permission[]> = {
  tenant_admin: PERMISSIONS,
  hr: [
    ...SELF_SERVICE,
    'settings:read',
    'organizations:read',
    'users:read',
    'employees:read',
    'employees:manage',
    'employees:import',
    'documents:read',
    'documents:manage',
    'compensation:read',
    'schedules:read',
    'schedules:manage',
    'attendance:read',
    'attendance:import',
    'attendance:correct',
    'attendance:approve',
    'leave:read',
    'leave:approve',
    'leave:manage',
    'reports:read',
    'exports:generate',
    'devices:read',
  ],
  payroll_manager: [
    ...SELF_SERVICE,
    'organizations:read',
    'employees:read',
    'compensation:read',
    'compensation:manage',
    'attendance:read',
    'leave:read',
    'payroll:read',
    'payroll:prepare',
    'payroll_rules:read',
    'payroll_rules:manage',
    'reports:read',
    'exports:generate',
  ],
  payroll_approver: [
    ...SELF_SERVICE,
    'organizations:read',
    'employees:read',
    'compensation:read',
    'payroll:read',
    'payroll:approve',
    'payroll:lock',
    'payroll:close',
    'payroll_rules:read',
    'payroll_rules:validate',
    'reports:read',
  ],
  manager: [
    ...SELF_SERVICE,
    'employees:read',
    'attendance:read',
    'attendance:approve',
    'leave:read',
    'leave:approve',
  ],
  employee: SELF_SERVICE,
  auditor: [
    'organizations:read',
    'users:read',
    'roles:read',
    'audit:read',
    'employees:read',
    'payroll:read',
    'payroll_rules:read',
    'reports:read',
  ],
};
