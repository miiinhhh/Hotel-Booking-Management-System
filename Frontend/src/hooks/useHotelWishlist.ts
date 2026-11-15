import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { discoveryApi, HotelCardData } from '../services/discoveryApi';

export function useHotelWishlist() {
  const { session, hasPermission } = useAuth();
  const owner = session && hasPermission('wishlist.self.manage') ? session.userId : null;
  const [snapshot, setSnapshot] = useState<{ owner: number | null; items: HotelCardData[] }>({ owner: null, items: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const pending = useRef(new Set<number>());
  const generation = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    generation.current++;
    pending.current.clear();
    setSnapshot({ owner, items: [] }); setError(''); setLoading(owner !== null);
    if (owner !== null) {
      discoveryApi.wishlist(controller.signal)
        .then(items => { if (!controller.signal.aborted) setSnapshot({ owner, items }); })
        .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được danh sách yêu thích.'); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }
    return () => { controller.abort(); generation.current++; };
  }, [owner, revision]);

  const save = async (hotelId: number, value: boolean) => {
    if (!session) throw new Error('Vui lòng đăng nhập để lưu khách sạn.');
    if (owner === null) throw new Error('Tài khoản không có quyền quản lý danh sách yêu thích.');
    if (loading || pending.current.size > 0) return false;
    const current = generation.current;
    pending.current.add(hotelId);
    try {
      await discoveryApi.save(hotelId, value);
      // Read the canonical list after a confirmed write; never fabricate a saved card.
      const items = await discoveryApi.wishlist();
      if (current !== generation.current) return false;
      setSnapshot({ owner, items }); setError('');
      return true;
    } catch (reason) {
      if (current === generation.current) {
        setError(reason instanceof Error ? reason.message : 'Không cập nhật được danh sách yêu thích.');
        throw reason;
      }
      return false;
    } finally { if (current === generation.current) pending.current.delete(hotelId); }
  };

  return { items: snapshot.owner === owner ? snapshot.items : [], loading, error, save, reload: () => setRevision(value => value + 1) };
}
