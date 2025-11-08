import { useState, useEffect, useMemo } from 'react';
import { ref, get, update } from 'firebase/database';
import { database } from '../../firebase/config';
import { toast } from 'react-toastify';

export function FirebaseReportTab({ filters, userRole, userTeam, userEmail }) {
  const [firebaseReports, setFirebaseReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingStatus, setEditingStatus] = useState(null);
  const [newStatus, setNewStatus] = useState('');

  // Check if user can edit status
  const canEditStatus = userRole === 'admin' || userRole === 'leader';

  // Fetch Firebase reports
  const fetchFirebaseReports = async () => {
    try {
      setLoading(true);
      const reportsRef = ref(database, 'reports');
      const snapshot = await get(reportsRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const reportsArray = Object.entries(data).map(([id, report]) => ({
          id,
          ...report
        }));
        setFirebaseReports(reportsArray);
      } else {
        setFirebaseReports([]);
      }
    } catch (err) {
      console.error('Error fetching Firebase reports:', err);
      toast.error('Lỗi khi tải dữ liệu báo cáo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFirebaseReports();
  }, []);

  // Update report status
  const handleUpdateStatus = async () => {
    if (!editingStatus || !newStatus) return;

    try {
      const reportRef = ref(database, `reports/${editingStatus.id}`);
      await update(reportRef, { status: newStatus });
      
      toast.success('Cập nhật trạng thái thành công');
      
      // Update local state
      setFirebaseReports(prev => prev.map(report => 
        report.id === editingStatus.id 
          ? { ...report, status: newStatus }
          : report
      ));
      
      // Close modal
      setEditingStatus(null);
      setNewStatus('');
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Lỗi khi cập nhật trạng thái');
    }
  };

  // Open edit status modal
  const openEditStatus = (report) => {
    setEditingStatus(report);
    setNewStatus(report.status || 'pending');
  };

  // Close edit status modal
  const closeEditStatus = () => {
    setEditingStatus(null);
    setNewStatus('');
  };

  // Filter Firebase reports
  const filteredFirebaseReports = useMemo(() => {
    let filtered = [...firebaseReports];

    // Apply role-based filtering
    if (userRole === 'admin') {
      // Admin sees all
    } else if (userRole === 'leader' && userTeam) {
      // Leader sees their team's reports
      filtered = filtered.filter(r => r.team === userTeam);
    } else if (userEmail) {
      // Regular user sees only their reports
      filtered = filtered.filter(r => r.email === userEmail);
    }

    // Search by text (name, email, TKQC)
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(report => 
        (report.name && report.name.toLowerCase().includes(searchLower)) ||
        (report.email && report.email.toLowerCase().includes(searchLower)) ||
        (report.tkqc && report.tkqc.toLowerCase().includes(searchLower))
      );
    }

    // Date filter
    if (filters.startDate || filters.endDate) {
      filtered = filtered.filter(report => {
        if (!report.date) return false;
        const reportDate = new Date(report.date);
        
        if (filters.startDate) {
          const start = new Date(filters.startDate);
          start.setHours(0, 0, 0, 0);
          if (reportDate < start) return false;
        }
        
        if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          if (reportDate > end) return false;
        }
        
        return true;
      });
    }

    // Product filter
    if (filters.products && filters.products.length > 0) {
      filtered = filtered.filter(report => 
        filters.products.includes(report.product)
      );
    }

    // Shift filter
    if (filters.shifts && filters.shifts.length > 0) {
      filtered = filtered.filter(report => 
        filters.shifts.includes(report.shift)
      );
    }

    // Market filter
    if (filters.markets && filters.markets.length > 0) {
      filtered = filtered.filter(report => 
        filters.markets.includes(report.market)
      );
    }

    // Team filter
    if (filters.teams && filters.teams.length > 0) {
      filtered = filtered.filter(report => 
        filters.teams.includes(report.team)
      );
    }

    return filtered;
  }, [firebaseReports, filters, userRole, userTeam, userEmail]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN');
    } catch (e) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải báo cáo Marketing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="flex items-center justify-between mb-6 px-6 pt-6">
        <h2 className="text-2xl font-bold text-primary">Báo cáo Marketing</h2>
        <button
          onClick={fetchFirebaseReports}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700 transition"
        >
          ↻ Refresh
        </button>
      </div>

      {firebaseReports.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Chưa có báo cáo</p>
          <p className="text-gray-400 text-sm mt-2">Hãy gửi báo cáo mới từ form "Gửi báo cáo"</p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-600 px-6">
            Hiển thị: <span className="font-semibold text-primary">{filteredFirebaseReports.length}</span> / {firebaseReports.length} báo cáo
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">STT</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">Tên</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">Email</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">Ngày</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">Ca</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">Sản phẩm</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">Thị trường</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">TKQC</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">CPQC</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">Mess/Cmt</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">Số đơn</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">Doanh số</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">Trạng thái</th>
                  {canEditStatus && (
                    <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">Thao tác</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFirebaseReports.map((report, index) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">{index + 1}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">{report.name}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-600 border border-gray-300">{report.email}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                      {formatDate(report.date)}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">{report.shift}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">{report.product}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">{report.market}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-600 border border-gray-300">{report.tkqc}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-right text-gray-900 border border-gray-300">
                      {report.cpqc?.toLocaleString('vi-VN')}đ
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-right text-gray-900 border border-gray-300">
                      {report.mess_cmt?.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-right text-gray-900 border border-gray-300">
                      {report.orders?.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-semibold text-right text-primary border border-gray-300">
                      {report.revenue?.toLocaleString('vi-VN')}đ
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium border border-gray-300 text-center">
                      {report.status === 'synced' ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">✓ Đã sync</span>
                      ) : report.status === 'error' ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">✗ Lỗi</span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Chờ xử lý</span>
                      )}
                    </td>
                    {canEditStatus && (
                      <td className="px-2 py-2 whitespace-nowrap text-sm font-medium border border-gray-300 text-center">
                        <button
                          onClick={() => openEditStatus(report)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-xs"
                        >
                          Sửa
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredFirebaseReports.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Không có dữ liệu phù hợp với bộ lọc</p>
            </div>
          )}
        </>
      )}

      {/* Edit Status Modal */}
      {editingStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              Cập nhật trạng thái báo cáo
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Báo cáo của: <span className="font-semibold">{editingStatus.name}</span>
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Ngày: <span className="font-semibold">{formatDate(editingStatus.date)}</span>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Sản phẩm: <span className="font-semibold">{editingStatus.product}</span>
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trạng thái mới
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Chờ xử lý</option>
                <option value="synced">Đã sync</option>
                <option value="error">Lỗi</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleUpdateStatus}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Lưu
              </button>
              <button
                onClick={closeEditStatus}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
