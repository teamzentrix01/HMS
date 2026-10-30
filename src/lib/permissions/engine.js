import { ROLES, ACTIONS, ROLE_PERMISSIONS } from "./definitions.js";

/**
 * Enterprise RBAC evaluator:
 * Evaluates Role + Department + Action + Resource + Scope + Conditions (Break-Glass)
 */
export function hasPermission({
  user,
  action,
  resource,
  departmentId = null,
  patientScope = null,
  isEmergencyBreakGlass = false,
}) {
  if (!user || !user.roleSlug) {
    return { allowed: false, reason: "Authentication required" };
  }

  // 1. Super Admin has full governance authority
  if (user.roleSlug === ROLES.SUPER_ADMIN) {
    return { allowed: true, reason: "Super Administrator full clearance" };
  }

  const roleRules = ROLE_PERMISSIONS[user.roleSlug];
  if (!roleRules) {
    return { allowed: false, reason: `Unknown role: ${user.roleSlug}` };
  }

  // 2. Strict Prohibition Check
  if (roleRules.prohibited) {
    const isProhibited = roleRules.prohibited.some(
      (rule) =>
        rule.resource === resource && rule.actions.includes(action)
    );
    if (isProhibited) {
      // Break-glass can only override clinical observation read if authorized
      if (
        isEmergencyBreakGlass &&
        action === ACTIONS.VIEW &&
        (user.roleSlug === ROLES.DOCTOR || user.roleSlug === ROLES.NURSE)
      ) {
        return {
          allowed: true,
          reason: "Emergency Break-Glass override active",
          isBreakGlass: true,
        };
      }
      return {
        allowed: false,
        reason: `Explicitly prohibited by hospital clinical security governance for role: ${user.roleSlug}`,
      };
    }
  }

  // 3. Permission Allowance Check
  const isExplicitlyAllowed = roleRules.allowed?.some(
    (rule) =>
      rule.resource === resource && rule.actions.includes(action)
  );

  if (isExplicitlyAllowed) {
    // Check department scoping if user is restricted to their assigned department
    if (departmentId && user.departmentId && user.roleSlug !== ROLES.HOSPITAL_ADMIN) {
      if (user.departmentId !== departmentId) {
        if (isEmergencyBreakGlass) {
          return {
            allowed: true,
            reason: "Emergency Break-Glass override across department boundary active",
            isBreakGlass: true,
          };
        }
        return {
          allowed: false,
          reason: `Action restricted to assigned department ID ${user.departmentId}`,
        };
      }
    }
    return {
      allowed: true,
      reason: isEmergencyBreakGlass
        ? "Permission granted under Emergency Break-Glass protocol"
        : "Permission granted",
      isBreakGlass: !!isEmergencyBreakGlass,
    };
  }

  // 4. Emergency Break-Glass override for clinicians outside normal allowed list
  if (
    isEmergencyBreakGlass &&
    (user.roleSlug === ROLES.DOCTOR || user.roleSlug === ROLES.NURSE)
  ) {
    return {
      allowed: true,
      reason: "Emergency Break-Glass protocol authorized",
      isBreakGlass: true,
    };
  }

  return {
    allowed: false,
    reason: `Role '${user.roleSlug}' lacks permission '${action}' on '${resource}'`,
  };
}

export function enforcePermission(context) {
  const result = hasPermission(context);
  if (!result.allowed) {
    const error = new Error(`Access Denied: ${result.reason}`);
    error.status = 403;
    throw error;
  }
  return true;
}
