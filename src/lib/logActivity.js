import { logHistory } from './database';

/**
    * Logs an activity to the history table.
    * @param {Object} params
    * @param {Request} params.request - The API route request object
    * @param {Object} params.user - The user performing the action (must have id)
    * @param {string} params.action - The action type (e.g., CREATE_EMPLOYEE)
    * @param {string} params.tableName - The table/entity affected
    * @param {number|string} [params.recordId] - The affected record's ID
    * @param {Object} [params.oldValues] - Old values (for updates/deletes)
    * @param {Object} [params.newValues] - New values (for creates/updates)
*/
export async function logActivity({ request, user, action, tableName, recordId, oldValues, newValues }) {
    try {
        // Try to get IP address from headers (may vary by deployment)
        const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('host') || null;
        const userAgent = request.headers.get('user-agent') || null;
        await logHistory({
        user_id: user.id,
        action,
        table_name: tableName,
        record_id: recordId,
        old_values: oldValues ? JSON.stringify(oldValues) : null,
        new_values: newValues ? JSON.stringify(newValues) : null,
        ip_address: ipAddress,
        user_agent: userAgent,
        });
    } catch (err) {
        // Don't block main request if logging fails
        console.error('Failed to log activity:', err);
    }
} 