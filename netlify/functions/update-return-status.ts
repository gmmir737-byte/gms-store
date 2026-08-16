import type { Handler } from "@netlify/functions";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.VITE_SUPABASE_ANON_KEY || "";

function cleanText(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  let str = String(val).trim();
  // Strip any legacy [RETURN_META:...] tags or JSON blobs
  str = str.replace(/\[RETURN_META:[\s\S]*?\]/g, '');
  str = str.replace(/\{"status":[\s\S]*?\}/g, '');
  str = str.replace(/\s*\|\s*$/, '').trim();
  return str.length > 0 ? str : null;
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const {
      return_id,
      order_id,
      user_id,
      action_status,
      admin_note,
      internal_note,
      courier_name,
      tracking_number,
      pickup_date,
      admin_user_id,
    } = body;

    if (!action_status || (!return_id && !order_id)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters (action_status and return_id or order_id)' }),
      };
    }

    const now = new Date().toISOString();
    const headers = {
      apikey: SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    const cleanPickupDate = cleanText(pickup_date);
    const cleanCourierName = cleanText(courier_name);
    const cleanTrackingNumber = cleanText(tracking_number);
    const cleanAdminNote = cleanText(admin_note);
    const cleanInternalNote = cleanText(internal_note);

    const normalizedActionStatus = String(action_status).toUpperCase().trim();

    // Prepare direct columns update payload for returns table
    const updatePayload: Record<string, unknown> = {
      status: normalizedActionStatus,
      updated_at: now,
    };

    if (cleanAdminNote !== null) updatePayload.admin_note = cleanAdminNote;
    if (cleanInternalNote !== null) updatePayload.internal_note = cleanInternalNote;
    if (cleanCourierName !== null) updatePayload.courier_name = cleanCourierName;
    if (cleanTrackingNumber !== null) updatePayload.tracking_number = cleanTrackingNumber;
    if (cleanPickupDate !== null) updatePayload.pickup_date = cleanPickupDate;

    switch (normalizedActionStatus) {
      case 'APPROVED': updatePayload.approved_at = now; break;
      case 'PICKUP_SCHEDULED': updatePayload.pickup_scheduled_at = now; break;
      case 'ITEM_RECEIVED': updatePayload.received_at = now; break;
      case 'REFUND_PROCESSING': updatePayload.refund_started_at = now; break;
      case 'REFUNDED': updatePayload.refunded_at = now; updatePayload.completed_at = now; break;
      case 'REJECTED': updatePayload.rejected_at = now; break;
      case 'CANCELLED': updatePayload.cancelled_at = now; break;
    }

    let updatedReturnRecord: Record<string, unknown> | null = null;

    // 1. Update returns table directly by return_id
    if (return_id) {
      try {
        const res1 = await fetch(`${SUPABASE_URL}/rest/v1/returns?id=eq.${encodeURIComponent(return_id)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(updatePayload),
        });
        if (res1.ok) {
          const rows = await res1.json();
          if (Array.isArray(rows) && rows.length > 0) {
            updatedReturnRecord = rows[0];
          }
        }
      } catch (e) {
        console.warn('Error patching returns table by id:', e);
      }
    }

    // 2. If not found by id, try updating returns table by order_id
    if (!updatedReturnRecord && order_id) {
      try {
        const res2 = await fetch(`${SUPABASE_URL}/rest/v1/returns?order_id=eq.${encodeURIComponent(order_id)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(updatePayload),
        });
        if (res2.ok) {
          const rows = await res2.json();
          if (Array.isArray(rows) && rows.length > 0) {
            updatedReturnRecord = rows[0];
          }
        }
      } catch (e) {
        console.warn('Error patching returns table by order_id:', e);
      }
    }

    // 3. Update orders table return_status and payment_status (without storing JSON in notes)
    const targetOrderId = order_id || (updatedReturnRecord?.order_id as string);
    if (targetOrderId) {
      const allowedOrderStatuses = ['none', 'requested', 'approved', 'rejected', 'pickup_pending', 'received', 'refunded'];
      let safeOrderStatus = normalizedActionStatus.toLowerCase();
      if (!allowedOrderStatuses.includes(safeOrderStatus)) {
        if (safeOrderStatus.includes('review') || safeOrderStatus.includes('request')) safeOrderStatus = 'requested';
        else if (safeOrderStatus.includes('pickup')) safeOrderStatus = 'pickup_pending';
        else if (safeOrderStatus.includes('receiv') || safeOrderStatus.includes('item')) safeOrderStatus = 'received';
        else if (safeOrderStatus.includes('refund')) safeOrderStatus = 'refunded';
        else if (safeOrderStatus.includes('cancel')) safeOrderStatus = 'none';
        else safeOrderStatus = 'requested';
      }

      try {
        const orderPatchBody: Record<string, unknown> = {
          return_status: safeOrderStatus,
          updated_at: now,
        };
        if (normalizedActionStatus === 'REFUNDED') {
          orderPatchBody.payment_status = 'refunded';
          orderPatchBody.status = 'returned';
        }

        await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(targetOrderId)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(orderPatchBody),
        });
      } catch (e) {
        console.warn('Error patching orders table return_status:', e);
      }
    }

    const effectiveReturnId = (updatedReturnRecord?.id as string) || return_id;

    // 4. Record single history entry in return_status_history
    let historyText = `Return status updated to ${normalizedActionStatus}.`;
    if (cleanCourierName) historyText += ` Courier: ${cleanCourierName}.`;
    if (cleanTrackingNumber) historyText += ` AW#: ${cleanTrackingNumber}.`;
    if (cleanPickupDate) historyText += ` Pickup Date: ${cleanPickupDate}.`;
    if (cleanAdminNote) historyText += ` Note: ${cleanAdminNote}.`;

    if (effectiveReturnId) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/return_status_history`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            return_id: effectiveReturnId,
            status: normalizedActionStatus,
            note: historyText,
            customer_visible: true,
            created_by: admin_user_id || null,
            created_at: now,
          }),
        });
      } catch (e) {
        console.warn('Error inserting return status history:', e);
      }
    }

    // 5. Send in-app notification to customer
    const targetUserId = user_id || (updatedReturnRecord?.user_id as string);
    if (targetUserId) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            user_id: targetUserId,
            title: `Return Status: ${normalizedActionStatus}`,
            message: cleanAdminNote || `Your return request status has been updated to ${normalizedActionStatus}.`,
            type: 'return_update',
            order_id: targetOrderId || null,
            return_id: effectiveReturnId || null,
            is_read: false,
            created_at: now,
          }),
        });
      } catch (e) {
        console.warn('Error inserting notification:', e);
      }
    }

    const cleanResult = updatedReturnRecord ? {
      ...updatedReturnRecord,
      status: normalizedActionStatus,
      customer_note: cleanText(updatedReturnRecord.customer_note),
      reason: cleanText(updatedReturnRecord.reason) || 'Return Requested',
      admin_note: cleanAdminNote || cleanText(updatedReturnRecord.admin_note),
      internal_note: cleanInternalNote || cleanText(updatedReturnRecord.internal_note),
    } : {
      id: effectiveReturnId,
      order_id: targetOrderId,
      status: normalizedActionStatus,
      admin_note: cleanAdminNote,
      internal_note: cleanInternalNote,
      courier_name: cleanCourierName,
      tracking_number: cleanTrackingNumber,
      pickup_date: cleanPickupDate,
      updated_at: now,
    };

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        updatedReturn: cleanResult,
      }),
    };
  } catch (err) {
    console.error('Error in update-return-status function:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
    };
  }
};
