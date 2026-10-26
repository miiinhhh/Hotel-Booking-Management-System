import React, { FormEvent, useMemo, useState, useEffect } from 'react';
import { STAFF_MEMBERS, ZONES } from '../data/adminData';
import { Modal, PageHeading, Toast, Toggle } from '../components/AdminUi';
import { StaffMember } from '../types';
import {
  getHotelStaffAssignments,
  getHotelAreas,
  syncStaffAreas,
  StaffAssignedArea,
} from '../../../services/staffAssignmentApi';

const initials = (name: string) => {
  const parts = name.trim().split(' ');
  return `${parts[0][0]}${parts.at(-1)?.[0] ?? ''}`.toUpperCase();
};

export const AdminStaff: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>(STAFF_MEMBERS);
  const [dbAreas, setDbAreas] = useState<StaffAssignedArea[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [assignedZones, setAssignedZones] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // Load real staff and areas from Backend API
  useEffect(() => {
    getHotelAreas(1).then((res) => {
      if (res.success && res.data) {
        setDbAreas(res.data);
      }
    });

    getHotelStaffAssignments(1).then((res) => {
      if (res.success && res.data && res.data.length > 0) {
        const mappedStaff: StaffMember[] = res.data.map((m, idx) => ({
          id: m.userId,
          code: `#NV-${1000 + m.userId}`,
          name: m.fullName,
          email: m.email,
          role: m.role,
          title: m.role === 'Admin' ? 'Quản trị hệ thống' : 'Lễ tân / Phụ trách khu vực',
          zones: m.assignedAreas.map((a) => {
            const short = a.areaName.split(':')[0].trim();
            return short;
          }),
          shift: idx % 2 === 0 ? 'Ca sáng (06:00 - 14:00)' : 'Ca chiều (14:00 - 22:00)',
          active: m.isActive,
        }));
        // Merge with existing sample staff if desired, or replace with DB staff
        setStaff((prev) => {
          const ids = new Set(mappedStaff.map((s) => s.id));
          const rest = prev.filter((s) => !ids.has(s.id));
          return [...mappedStaff, ...rest];
        });
      }
    });
  }, []);

  const filtered = useMemo(
    () =>
      staff.filter(
        (member) =>
          `${member.name} ${member.code} ${member.email}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (status === 'all' || (status === 'active') === member.active)
      ),
    [staff, search, status]
  );

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  };

  const openAssignment = (member: StaffMember) => {
    setSelected(member);
    // Find zones by Area names or codes
    setAssignedZones(member.zones);
  };

  const addStaff = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name'));
    setStaff((current) => [
      ...current,
      {
        id: Date.now(),
        code: `#NV-${1100 + current.length}`,
        name,
        email: String(data.get('email')),
        role: String(data.get('role')),
        title: String(data.get('title')),
        zones: [],
        shift: 'Chưa phân ca',
        active: true,
      },
    ]);
    setAddOpen(false);
    notify(`Đã thêm nhân viên ${name}.`);
  };

  const saveAssignment = async () => {
    if (!selected) return;

    // Use dbAreas if available, otherwise fallback
    const availableAreas = dbAreas.length > 0 ? dbAreas : [];
    
    // Calculate targeted Area IDs directly from dbAreas matching assignedZones
    const targetAreaIds: number[] = [];
    if (availableAreas.length > 0) {
      availableAreas.forEach((area) => {
        if (assignedZones.includes(area.areaName)) {
          targetAreaIds.push(area.areaId);
        }
      });
    }

    if (selected.id < 1000) {
      const res = await syncStaffAreas(1, selected.id, targetAreaIds);
      if (!res.success) {
        notify(`Lỗi đồng bộ: ${res.message || 'Không thể cập nhật phân công'}`);
        return;
      }
    }

    setStaff((current) =>
      current.map((member) =>
        member.id === selected.id ? { ...member, zones: assignedZones } : member
      )
    );
    setSelected(null);
    notify('Đã cập nhật & đồng bộ phân khu phụ trách lên SQL Server!');
  };

  return <>
    <PageHeading title="Quản lý nhân viên nội bộ & Phân công phân khu" description="Kiểm soát tài khoản nhân sự, trạng thái làm việc và phạm vi vận hành theo từng khu vực." actions={<button onClick={() => setAddOpen(true)} className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 font-semibold text-on-primary"><span className="material-symbols-outlined text-lg">person_add</span>Thêm nhân viên</button>} />
    <section className="mb-6 grid gap-4 sm:grid-cols-3">{[['36', 'Nhân viên hoạt động', 'badge'], ['8', 'Đang trong ca trực', 'schedule'], ['4', 'Phân khu có quản lý', 'apartment']].map(([value, label, icon]) => <article key={label} className="flex items-center gap-4 rounded-lg bg-surface-container-lowest p-5 shadow-sm"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary"><span className="material-symbols-outlined">{icon}</span></span><div><strong className="font-headline-md text-2xl">{value}</strong><p className="text-sm text-outline">{label}</p></div></article>)}</section>
    <section className="overflow-hidden rounded-lg bg-surface-container-lowest shadow-sm"><div className="flex flex-col gap-3 border-b border-outline-variant/30 p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-headline-sm text-xl font-semibold">Danh sách nhân sự</h2><p className="text-sm text-outline">Đồng bộ từ hệ thống tài khoản nội bộ</p></div><div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><span className="material-symbols-outlined absolute left-3 top-2.5 text-lg text-outline">search</span><input value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-full rounded-full bg-surface-container-low pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary/20 sm:w-64" placeholder="Tên, mã hoặc email..." /></div><select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-full bg-surface-container-low px-4 outline-none"><option value="all">Mọi trạng thái</option><option value="active">Đang hoạt động</option><option value="inactive">Tạm khóa</option></select></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-surface-container-low text-xs uppercase text-outline"><tr>{['Nhân viên', 'Vai trò', 'Phân khu phụ trách', 'Ca làm việc', 'Tài khoản', 'Thao tác'].map((h) => <th key={h} className="px-5 py-3">{h}</th>)}</tr></thead><tbody>{filtered.map((member) => <tr key={member.id} className="border-t border-outline-variant/20 hover:bg-surface-container-low/50"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className={`flex h-11 w-11 items-center justify-center rounded-full font-semibold ${member.active ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-surface-container-highest text-outline'}`}>{initials(member.name)}</div><div><p className="font-semibold">{member.name} <span className="ml-1 rounded-full bg-surface-container px-2 py-0.5 text-[11px] text-outline">{member.code}</span></p><p className="text-xs text-outline">{member.email}</p></div></div></td><td className="px-5 py-4"><strong className="text-primary">{member.role}</strong><p className="text-on-surface-variant">{member.title}</p></td><td className="px-5 py-4"><div className="flex max-w-sm flex-wrap gap-1.5">{member.zones.map((zone) => <span key={zone} className="rounded-full bg-surface-container-high px-2.5 py-1 text-xs">{zone}</span>)}<button onClick={() => openAssignment(member)} className="rounded-full bg-surface-container px-2.5 py-1 text-xs text-primary">+ Phân công</button></div></td><td className="px-5 py-4 text-on-surface-variant">{member.shift}</td><td className="px-5 py-4"><Toggle checked={member.active} label={`Tài khoản ${member.name}`} onChange={() => setStaff((current) => current.map((item) => item.id === member.id ? { ...item, active: !item.active } : item))} /></td><td className="px-5 py-4"><button onClick={() => openAssignment(member)} className="flex items-center gap-1 rounded-full bg-surface-container px-3 py-2 font-semibold"><span className="material-symbols-outlined text-lg">domain</span>Phân công</button></td></tr>)}</tbody></table></div><footer className="flex flex-col justify-between gap-3 p-5 text-sm text-outline sm:flex-row"><p>Hiển thị <strong className="text-on-surface">{filtered.length}</strong> trên tổng số <strong className="text-on-surface">{staff.length}</strong> nhân viên mẫu</p><div className="flex gap-2"><button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary">1</button><button className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-container">2</button><button className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-container">3</button></div></footer></section>
    <Modal title="Phân công phân khu phụ trách" open={Boolean(selected)} onClose={() => setSelected(null)} footer={<><button onClick={() => setSelected(null)} className="rounded-full bg-surface-container px-5 py-2.5 font-semibold">Hủy</button><button onClick={saveAssignment} className="rounded-full bg-primary px-6 py-2.5 font-semibold text-on-primary">Lưu phân công</button></>}>
      {selected && <div>
        <div className="mb-5 flex items-center gap-4 rounded-lg bg-surface-container-low p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary-fixed text-xl font-semibold">{initials(selected.name)}</div>
          <div>
            <h3 className="text-lg font-semibold">{selected.name}</h3>
            <p className="text-sm text-primary">{selected.title}</p>
            <p className="text-xs text-outline">{selected.email} · {selected.code}</p>
          </div>
        </div>
        <p className="mb-3 text-xs font-semibold uppercase text-outline">Chọn phân khu đảm nhiệm (Đồng bộ thời gian thực từ CSDL)</p>
        <div className="space-y-2">
          {(dbAreas.length > 0 ? dbAreas : ZONES.map(z => ({ areaId: z.id === 'a' ? 1 : z.id === 'b' ? 2 : 3, areaName: z.name, totalRooms: z.rooms } as StaffAssignedArea))).map((zone) => {
            const isChecked = assignedZones.includes(zone.areaName) || assignedZones.some(az => zone.areaName.includes(az) || az.includes(zone.areaName));
            return (
              <label key={zone.areaId} className="flex cursor-pointer items-center justify-between rounded-lg bg-surface-container-low p-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      if (isChecked) {
                        setAssignedZones(current => current.filter(item => item !== zone.areaName && !zone.areaName.includes(item) && !item.includes(zone.areaName)));
                      } else {
                        setAssignedZones(current => [...current, zone.areaName]);
                      }
                    }}
                    className="h-5 w-5 accent-primary"
                  />
                  <div>
                    <strong>{zone.areaName}</strong>
                    <p className="text-xs text-outline">{zone.totalRooms || 0} phòng vật lý {zone.areaType ? `· ${zone.areaType}` : ''}</p>
                  </div>
                </div>
                <span className={`text-xs ${isChecked ? 'text-primary font-semibold' : 'text-outline'}`}>
                  {isChecked ? 'Đang phụ trách' : 'Chưa phân công'}
                </span>
              </label>
            );
          })}
        </div>
      </div>}
    </Modal>
    <Modal title="Thêm nhân viên nội bộ" open={addOpen} onClose={() => setAddOpen(false)}><form onSubmit={addStaff} className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Họ và tên<input required name="name" className="mt-1 h-11 w-full rounded-lg bg-surface-container-low px-4 font-normal" /></label><label className="text-sm font-semibold">Email<input required name="email" type="email" className="mt-1 h-11 w-full rounded-lg bg-surface-container-low px-4 font-normal" /></label><label className="text-sm font-semibold">Vai trò<select name="role" className="mt-1 h-11 w-full rounded-lg bg-surface-container-low px-4 font-normal"><option>Hotel Staff</option><option>Hotel Manager</option></select></label><label className="text-sm font-semibold">Chức danh<input required name="title" className="mt-1 h-11 w-full rounded-lg bg-surface-container-low px-4 font-normal" placeholder="Nhân viên lễ tân" /></label><div className="col-span-full flex justify-end gap-3"><button type="button" onClick={() => setAddOpen(false)} className="rounded-full bg-surface-container px-5 py-2.5 font-semibold">Hủy</button><button className="rounded-full bg-primary px-6 py-2.5 font-semibold text-on-primary">Thêm nhân viên</button></div></form></Modal>
    <Toast message={toast} />
  </>;
};
