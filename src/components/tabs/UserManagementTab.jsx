import { useState, useEffect } from 'react';
import { ref, get, update, remove, push, set } from 'firebase/database';
import { database } from '../../firebase/config';
import bcrypt from 'bcryptjs';
import { toast } from 'react-toastify';

export function UserManagementTab({ userRole, userTeam, searchText, teamFilter }) {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({
    'Họ Và Tên': '',
    email: '',
    password: '',
    'Bộ phận': '',
    Team: '',
    'Vị trí': '',
    'chi nhánh': '',
    Ca: '',
    role: 'user'
  });
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // Fetch users from Firebase
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const usersRef = ref(database, 'human_resources');
        const snapshot = await get(usersRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          const usersArray = Object.entries(data).map(([firebaseKey, values]) => ({
            firebaseKey,
            ...values
          }));
          setUsers(usersArray);
          
          // Apply role-based filtering
          if (userRole === 'leader' && userTeam) {
            const filtered = usersArray.filter(user => user.Team === userTeam);
            setFilteredUsers(filtered);
          } else {
            setFilteredUsers(usersArray);
          }
        } else {
          setUsers([]);
          setFilteredUsers([]);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
        toast.error('Lỗi khi tải dữ liệu nhân sự');
      } finally {
        setLoading(false);
      }
    };

    if (userRole === 'admin' || userRole === 'leader') {
      fetchUsers();
    }
  }, [userRole, userTeam]);

  // Apply search filter
  useEffect(() => {
    let filtered = [...users];

    // Apply role-based filtering first
    if (userRole === 'leader' && userTeam) {
      filtered = filtered.filter(user => user.Team === userTeam);
    }

    // Apply team filter (for admin)
    if (teamFilter && teamFilter.length > 0) {
      filtered = filtered.filter(user => 
        teamFilter.includes(user.Team)
      );
    }

    // Apply search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(user =>
        (user['Họ Và Tên'] && user['Họ Và Tên'].toLowerCase().includes(searchLower)) ||
        (user.email && user.email.toLowerCase().includes(searchLower)) ||
        (user.Team && user.Team.toLowerCase().includes(searchLower)) ||
        (user['Bộ phận'] && user['Bộ phận'].toLowerCase().includes(searchLower)) ||
        (user['Vị trí'] && user['Vị trí'].toLowerCase().includes(searchLower))
      );
    }

    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to page 1 when search changes
  }, [users, userRole, userTeam, searchText, teamFilter]);

  // Update user in Firebase
  const handleUpdateUser = async (firebaseKey, updatedData) => {
    try {
      const userRef = ref(database, `human_resources/${firebaseKey}`);
      await update(userRef, updatedData);
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.firebaseKey === firebaseKey ? { ...user, ...updatedData } : user
      ));
      setFilteredUsers(prev => prev.map(user => 
        user.firebaseKey === firebaseKey ? { ...user, ...updatedData } : user
      ));
      
      setIsModalOpen(false);
      setEditingUser(null);
      toast.success('Cập nhật thông tin nhân sự thành công!');
    } catch (err) {
      console.error('Error updating user:', err);
      toast.error('Lỗi khi cập nhật thông tin nhân sự');
    }
  };

  // Open edit modal
  const openEditModal = (user) => {
    setEditingUser({...user});
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  // Open add modal
  const openAddModal = () => {
    setNewUser({
      'Họ Và Tên': '',
      email: '',
      password: '',
      'Bộ phận': '',
      Team: '',
      'Vị trí': '',
      'chi nhánh': '',
      Ca: '',
      role: 'user'
    });
    setIsAddModalOpen(true);
  };

  // Close add modal
  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setNewUser({
      'Họ Và Tên': '',
      email: '',
      password: '',
      'Bộ phận': '',
      Team: '',
      'Vị trí': '',
      'chi nhánh': '',
      Ca: '',
      role: 'user'
    });
  };

  // Add new user
  const handleAddUser = async () => {
    // Validation
    if (!newUser['Họ Và Tên'] || !newUser.email || !newUser.password) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }

    if (newUser.password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự!');
      return;
    }

    try {
      // Check if email already exists
      const usersSnapshot = await get(ref(database, 'users'));
      if (usersSnapshot.exists()) {
        const existingUsers = Object.values(usersSnapshot.val());
        const emailExists = existingUsers.some(user => user.email === newUser.email);
        if (emailExists) {
          toast.error('Email này đã được sử dụng!');
          return;
        }
      }

      // Generate unique user ID
      const usersListRef = ref(database, 'users');
      const newUserRef = push(usersListRef);
      const userId = newUserRef.key;

      // Hash password
      const hashedPassword = bcrypt.hashSync(newUser.password, 10);

      // Create user record in human_resources
      const hrRef = ref(database, `human_resources/${userId}`);
      const hrData = {
        'Họ Và Tên': newUser['Họ Và Tên'],
        email: newUser.email,
        'Bộ phận': newUser['Bộ phận'],
        Team: newUser.Team,
        'Vị trí': newUser['Vị trí'],
        'chi nhánh': newUser['chi nhánh'],
        Ca: newUser.Ca,
        role: newUser.role,
        status: 'active',
        'Ngày vào làm': new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        createdBy: localStorage.getItem('username') || 'admin'
      };

      await set(hrRef, hrData);

      // Create user in users collection for authentication
      const usersRef = ref(database, `users/${userId}`);
      const userData = {
        username: newUser.email.split('@')[0],
        name: newUser['Họ Và Tên'],
        email: newUser.email,
        password: hashedPassword,
        team: newUser.Team,
        role: newUser.role,
        department: newUser['Bộ phận'],
        position: newUser['Vị trí'],
        branch: newUser['chi nhánh'],
        shift: newUser.Ca,
        createdAt: new Date().toISOString(),
        createdBy: localStorage.getItem('username') || 'admin'
      };

      await set(usersRef, userData);

      // Refresh users list
      const hrSnapshot = await get(ref(database, 'human_resources'));
      if (hrSnapshot.exists()) {
        const data = hrSnapshot.val();
        const usersArray = Object.entries(data).map(([firebaseKey, values]) => ({
          firebaseKey,
          ...values
        }));
        setUsers(usersArray);
        
        if (userRole === 'leader' && userTeam) {
          const filtered = usersArray.filter(user => user.Team === userTeam);
          setFilteredUsers(filtered);
        } else {
          setFilteredUsers(usersArray);
        }
      }

      closeAddModal();
      toast.success('Thêm nhân sự thành công!');
    } catch (err) {
      console.error('Error adding user:', err);
      toast.error('Đã xảy ra lỗi khi thêm nhân sự: ' + err.message);
    }
  };

  // Delete user from Firebase
  const handleDeleteUser = async (firebaseKey) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa nhân sự này?')) {
      return;
    }

    try {
      const userRef = ref(database, `human_resources/${firebaseKey}`);
      await remove(userRef);
      
      // Update local state
      setUsers(prev => prev.filter(user => user.firebaseKey !== firebaseKey));
      setFilteredUsers(prev => prev.filter(user => user.firebaseKey !== firebaseKey));
      
      toast.success('Xóa nhân sự thành công!');
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Lỗi khi xóa nhân sự');
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu nhân sự...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Add Button */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-primary">Quản lý Nhân sự</h2>
        {userRole === 'admin' && (
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            <span className="text-xl">➕</span>
            <span>Thêm nhân sự</span>
          </button>
        )}
      </div>
      
      {/* Statistics */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-gray-600">
          Tổng số: <span className="font-semibold text-blue-600">{filteredUsers.length}</span> nhân sự
          {filteredUsers.length > itemsPerPage && (
            <span className="ml-2">
              | Trang {currentPage}/{totalPages}
              <span className="ml-2 text-sm">
                (Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)})
              </span>
            </span>
          )}
        </p>
      </div>
      
      {/* User Management Table */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Không có dữ liệu nhân sự</p>
        </div>
      ) : (
        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-blue-600 to-purple-600">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider border border-gray-300">STT</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Họ và Tên</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Email</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Bộ phận</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Team</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Vị trí</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Chi nhánh</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Ca</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Hành động</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentUsers.map((user, index) => (
                <tr key={user.firebaseKey || user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 border border-gray-300">{startIndex + index + 1}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 border border-gray-300">{user['Họ Và Tên'] || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-600 border border-gray-300">{user.email || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 border border-gray-300">{user['Bộ phận'] || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 border border-gray-300">{user.Team || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 border border-gray-300">{user['Vị trí'] || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 border border-gray-300">{user['chi nhánh'] || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 border border-gray-300">{user.Ca || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm border border-gray-300">
                    {userRole === 'admin' || userRole === 'leader' ? (
                      <>
                        <button
                          onClick={() => openEditModal(user)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
                          title="Sửa"
                        >
                          Sửa
                        </button>
                        {userRole === 'admin' && (
                          <button
                            onClick={() => handleDeleteUser(user.firebaseKey)}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                            title="Xóa"
                          >
                            Xóa
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400">Chỉ xem</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {filteredUsers.length > itemsPerPage && (
        <div className="mt-6 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg shadow">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              Trước
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              Sau
            </button>
          </div>
          
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Hiển thị <span className="font-medium">{startIndex + 1}</span> đến{' '}
                <span className="font-medium">{Math.min(endIndex, filteredUsers.length)}</span> trong tổng số{' '}
                <span className="font-medium">{filteredUsers.length}</span> nhân sự
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                {/* Previous button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                    currentPage === 1 ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                          page === currentPage
                            ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <span
                        key={page}
                        className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0"
                      >
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
                
                {/* Next button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                    currentPage === totalPages ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-t-lg">
              <h3 className="text-xl font-bold text-white">Chỉnh sửa thông tin nhân sự</h3>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Họ và Tên */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Họ và Tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingUser['Họ Và Tên'] || ''}
                    onChange={(e) => setEditingUser({...editingUser, 'Họ Và Tên': e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nhập họ và tên"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nhập email"
                  />
                </div>

                {/* Bộ phận */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bộ phận
                  </label>
                  <input
                    type="text"
                    value={editingUser['Bộ phận'] || ''}
                    onChange={(e) => setEditingUser({...editingUser, 'Bộ phận': e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nhập bộ phận"
                  />
                </div>

                {/* Team */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team
                  </label>
                  <input
                    type="text"
                    value={editingUser.Team || ''}
                    onChange={(e) => setEditingUser({...editingUser, Team: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nhập team"
                  />
                </div>

                {/* Vị trí */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vị trí
                  </label>
                  <input
                    type="text"
                    value={editingUser['Vị trí'] || ''}
                    onChange={(e) => setEditingUser({...editingUser, 'Vị trí': e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nhập vị trí"
                  />
                </div>

                {/* Chi nhánh */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chi nhánh
                  </label>
                  <select
                    value={editingUser['chi nhánh'] || ''}
                    onChange={(e) => setEditingUser({...editingUser, 'chi nhánh': e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- Chọn chi nhánh --</option>
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="HCM">HCM</option>
                  </select>
                </div>

                {/* Ca */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ca
                  </label>
                  <select
                    value={editingUser.Ca || ''}
                    onChange={(e) => setEditingUser({...editingUser, Ca: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- Chọn ca --</option>
                    <option value="Giữa ca">Giữa ca</option>
                    <option value="Hết ca">Hết ca</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors"
              >
                ✗ Hủy
              </button>
              <button
                onClick={async () => {
                  await handleUpdateUser(editingUser.firebaseKey, {
                    'Họ Và Tên': editingUser['Họ Và Tên'],
                    email: editingUser.email,
                    'Bộ phận': editingUser['Bộ phận'],
                    Team: editingUser.Team,
                    'Vị trí': editingUser['Vị trí'],
                    'chi nhánh': editingUser['chi nhánh'],
                    Ca: editingUser.Ca,
                    id: editingUser.id
                  });
                }}
                className="px-5 py-2.5 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
              >
                ✓ Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 rounded-t-lg">
              <h3 className="text-xl font-bold text-white">Thêm nhân sự mới</h3>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Họ và Tên */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Họ và Tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newUser['Họ Và Tên']}
                    onChange={(e) => setNewUser({...newUser, 'Họ Và Tên': e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Nhập họ và tên"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Nhập email"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                  />
                </div>

                {/* Bộ phận */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bộ phận
                  </label>
                  <input
                    type="text"
                    value={newUser['Bộ phận']}
                    onChange={(e) => setNewUser({...newUser, 'Bộ phận': e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Nhập bộ phận"
                  />
                </div>

                {/* Team */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team
                  </label>
                  <input
                    type="text"
                    value={newUser.Team}
                    onChange={(e) => setNewUser({...newUser, Team: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Nhập team"
                  />
                </div>

                {/* Vị trí */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vị trí
                  </label>
                  <input
                    type="text"
                    value={newUser['Vị trí']}
                    onChange={(e) => setNewUser({...newUser, 'Vị trí': e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Nhập vị trí"
                  />
                </div>

                {/* Chi nhánh */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chi nhánh
                  </label>
                  <select
                    value={newUser['chi nhánh']}
                    onChange={(e) => setNewUser({...newUser, 'chi nhánh': e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">-- Chọn chi nhánh --</option>
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="HCM">HCM</option>
                  </select>
                </div>

                {/* Ca */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ca
                  </label>
                  <select
                    value={newUser.Ca}
                    onChange={(e) => setNewUser({...newUser, Ca: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">-- Chọn ca --</option>
                    <option value="Giữa ca">Giữa ca</option>
                    <option value="Hết ca">Hết ca</option>
                  </select>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vai trò <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="user">User</option>
                    <option value="leader">Leader</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              {/* Required fields note */}
              <p className="text-sm text-gray-500 mt-4">
                <span className="text-red-500">*</span> Các trường bắt buộc
              </p>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={closeAddModal}
                className="px-5 py-2.5 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors"
              >
                ✗ Hủy
              </button>
              <button
                onClick={handleAddUser}
                className="px-5 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                ✓ Thêm nhân sự
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
