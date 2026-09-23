import React from 'react';
import { Modal } from './UI';
import { formatDate } from '../utils/formatters';
export default function ServiceMemberDetail({ member, onClose }) {
  return <Modal open={Boolean(member)} title="Chi tiết đăng ký dịch vụ" onClose={onClose}>{member&&<div className="space-y-3"><p>{member.fullName} · Căn {member.apartmentCode}</p><p>Bắt đầu: {formatDate(member.startDate)}</p><p>Kết thúc: {member.endDate?formatDate(member.endDate):'Chưa kết thúc'}</p><p>{member.status?'Đang đăng ký':'Đã hủy'}</p></div>}</Modal>;
}
