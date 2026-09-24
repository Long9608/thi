const escapeHtml = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value);
const recipientEmail = resident => [resident.ResidentEmail, resident.AccountEmail]
    .map(value => typeof value === 'string' ? value.trim() : '')
    .find(validEmail) || null;
const deliveryErrors = {
    SMTP_NOT_CONFIGURED: 'Chưa cấu hình SMTP đầy đủ. Kiểm tra backend/.env và khởi động lại backend.',
    EAUTH: 'Máy chủ email từ chối đăng nhập. Kiểm tra tài khoản và mật khẩu ứng dụng SMTP.',
    ECONNECTION: 'Không kết nối được máy chủ email. Kiểm tra SMTP_HOST và SMTP_PORT.',
    ETIMEDOUT: 'Kết nối máy chủ email quá thời gian chờ.',
    EDNS: 'Không tìm thấy máy chủ email. Kiểm tra SMTP_HOST.',
    ESOCKET: 'Lỗi kết nối bảo mật với máy chủ email. Kiểm tra cổng và SMTP_SECURE.',
    EENVELOPE: 'Máy chủ email từ chối địa chỉ người gửi hoặc người nhận.',
    SMTP_REJECTED: 'Máy chủ email không chấp nhận người nhận.',
    SMTP_SEND_FAILED: 'Không gửi được email. Kiểm tra cấu hình SMTP và địa chỉ người nhận.'
};
function deliveryError(error) {
    const code = Object.hasOwn(deliveryErrors, error?.code) ? error.code : 'SMTP_SEND_FAILED';
    return { code, message: deliveryErrors[code] };
}
function detailUrl(notification) {
    if (!process.env.FRONTEND_BASE_URL) return null;
    const base = new URL(process.env.FRONTEND_BASE_URL);
    if (!['https:','http:'].includes(base.protocol)) return null;
    const keys = {Invoice:'invoiceId',MaintenanceRequest:'requestId',Contract:'contractId',Feedback:'feedbackId',Apartment:'apartmentId'};
    if (notification.targetPage) {
        base.searchParams.set('page',notification.targetPage);
        if(keys[notification.entityType] && notification.entityId) base.searchParams.set(keys[notification.entityType],notification.entityId);
        return base.href;
    }
    if(notification.actionUrl){
        const url=new URL(notification.actionUrl,base);
        if(url.origin===base.origin && ['http:','https:'].includes(url.protocol)) return url.href;
    }
    return null;
}
async function sendNotificationEmail(recipient, notification) {
    if(!process.env.SMTP_HOST || !validEmail(process.env.SMTP_FROM_EMAIL)) throw Object.assign(new Error('SMTP_NOT_CONFIGURED'),{code:'SMTP_NOT_CONFIGURED'});
    const nodemailer=require('nodemailer');
    const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT || 587),
        secure:process.env.SMTP_SECURE==='true',
        ...(process.env.SMTP_USER?{auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}}:{}),
        connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000});
    const url=detailUrl(notification);
    try {
        const result=await transport.sendMail({from:{name:process.env.SMTP_FROM_NAME || 'Đức Vũ Tower',address:process.env.SMTP_FROM_EMAIL},to:recipient,
            subject:notification.title,text:`Đức Vũ Tower\n\n${notification.content}${url?'\n\nXem chi tiết: '+url:''}`,
            html:`<html lang="vi"><meta charset="utf-8"><body style="font-family:Arial,sans-serif;background:#f4f6fa;padding:24px"><main style="max-width:600px;margin:auto;background:white;padding:32px;border-radius:12px"><h2 style="color:#635bff">Đức Vũ Tower</h2><h3>${escapeHtml(notification.title)}</h3><p style="white-space:pre-wrap;line-height:1.7">${escapeHtml(notification.content)}</p>${url?`<a style="display:inline-block;background:#635bff;color:white;padding:12px 20px;border-radius:8px" href="${escapeHtml(url)}">Xem chi tiết</a>`:''}</main></body></html>`});
        if(!result.accepted?.length) throw Object.assign(new Error('SMTP_REJECTED'),{code:'SMTP_REJECTED'});
        return {messageId:result.messageId,response:result.response};
    } finally {transport.close();}
}
module.exports={validEmail,recipientEmail,deliveryError,detailUrl,sendNotificationEmail,escapeHtml};
