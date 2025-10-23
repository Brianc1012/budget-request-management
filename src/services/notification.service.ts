// src/services/notification.service.ts
import { prisma } from '../config/database';
import nodemailer from 'nodemailer';
import { SMTP_CONFIG, FRONTEND_URL } from '../config/constants';

const transporter = nodemailer.createTransport({
  host: SMTP_CONFIG.HOST,
  port: SMTP_CONFIG.PORT,
  secure: false,
  auth: SMTP_CONFIG.USER && SMTP_CONFIG.PASSWORD ? {
    user: SMTP_CONFIG.USER,
    pass: SMTP_CONFIG.PASSWORD
  } : undefined
});

class NotificationService {
  async notifyAdminsNewRequest(budgetRequest: any) {
    const subject = `New Budget Request: ${budgetRequest.requestCode}`;
    const message = `
      A new budget request has been submitted and requires your review.
      
      Request Code: ${budgetRequest.requestCode}
      Department: ${budgetRequest.department}
      Amount: $${Number(budgetRequest.amountRequested).toLocaleString()}
      Purpose: ${budgetRequest.purpose}
      
      Please review at: ${FRONTEND_URL}/budget-requests/${budgetRequest.id}
    `;

    // Get department admins
    const admins = await this.getDepartmentAdmins(budgetRequest.department);

    // Send notifications
    await Promise.all(
      admins.map(admin =>
        this.sendNotification(budgetRequest.id, {
          recipientUserId: admin.id,
          recipientEmail: admin.email,
          recipientName: admin.name,
          subject,
          message,
          notificationType: 'REQUEST_SUBMITTED'
        })
      )
    );
  }

  async notifyRequestApproved(budgetRequest: any) {
    const subject = `Budget Request Approved: ${budgetRequest.requestCode}`;
    const message = `
      Your budget request has been approved!
      
      Request Code: ${budgetRequest.requestCode}
      Amount Approved: $${Number(budgetRequest.reservedAmount).toLocaleString()}
      
      View details at: ${FRONTEND_URL}/budget-requests/${budgetRequest.id}
    `;

    await this.sendNotification(budgetRequest.id, {
      recipientUserId: budgetRequest.requestedBy,
      recipientEmail: budgetRequest.requestedByEmail || '',
      recipientName: budgetRequest.requestedByName || '',
      subject,
      message,
      notificationType: 'REQUEST_APPROVED'
    });
  }

  async notifyRequestRejected(budgetRequest: any) {
    const subject = `Budget Request Rejected: ${budgetRequest.requestCode}`;
    const message = `
      Your budget request has been rejected.
      
      Request Code: ${budgetRequest.requestCode}
      Reason: ${budgetRequest.reviewNotes}
      
      View details at: ${FRONTEND_URL}/budget-requests/${budgetRequest.id}
    `;

    await this.sendNotification(budgetRequest.id, {
      recipientUserId: budgetRequest.requestedBy,
      recipientEmail: budgetRequest.requestedByEmail || '',
      recipientName: budgetRequest.requestedByName || '',
      subject,
      message,
      notificationType: 'REQUEST_REJECTED'
    });
  }

  private async sendNotification(budgetRequestId: number, data: any) {
    try {
      // Create notification record
      const notification = await prisma.budgetRequestNotification.create({
        data: {
          budgetRequestId,
          notificationType: data.notificationType,
          recipientUserId: data.recipientUserId,
          recipientEmail: data.recipientEmail,
          recipientName: data.recipientName,
          subject: data.subject,
          message: data.message,
          deliveryStatus: 'pending'
        }
      });

      // Send email if configured
      if (SMTP_CONFIG.USER && data.recipientEmail) {
        await transporter.sendMail({
          from: SMTP_CONFIG.USER,
          to: data.recipientEmail,
          subject: data.subject,
          text: data.message
        });

        // Update notification status
        await prisma.budgetRequestNotification.update({
          where: { id: notification.id },
          data: {
            deliveryStatus: 'sent',
            sentAt: new Date()
          }
        });
      }
    } catch (error: any) {
      console.error('Notification send failed:', error.message);
      
      // Update notification status to failed
      try {
        await prisma.budgetRequestNotification.updateMany({
          where: {
            budgetRequestId,
            deliveryStatus: 'pending'
          },
          data: {
            deliveryStatus: 'failed',
            deliveryError: error.message
          }
        });
      } catch (updateError) {
        console.error('Failed to update notification status:', updateError);
      }
    }
  }

  private async getDepartmentAdmins(department: string) {
    // This would query your user management system
    // For now, return mock data
    return [
      {
        id: 'admin-1',
        name: 'Finance Admin',
        email: 'finance.admin@example.com'
      }
    ];
  }
}

export default new NotificationService();
