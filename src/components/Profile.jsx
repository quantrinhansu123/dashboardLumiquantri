import { useState, useEffect } from 'react';
import { ref, get, update } from 'firebase/database';
import { database } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import bcrypt from 'bcryptjs';

function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [userData, setUserData] = useState({
    username: '',
    name: '',
    email: '',
    role: '',
    team: '',
    createdAt: ''
  });

  const [teams, setTeams] = useState([
    { value: '', label: 'Chưa chọn team' }
  ]);

  // Password change states
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadTeamsFromHumanResources();
    loadUserProfile();
  }, []);

  const loadTeamsFromHumanResources = async () => {
    setLoadingTeams(true);
    try {
      const hrRef = ref(database, 'human_resources');
      const snapshot = await get(hrRef);
      
      if (snapshot.exists()) {
        const hrData = snapshot.val();
        
        // Extract unique teams from human_resources
        const uniqueTeams = [...new Set(
          Object.values(hrData)
            .map(item => item['Team'])
            .filter(Boolean)
        )];
        
        // Convert to dropdown format
        const teamOptions = [
          { value: '', label: 'Chưa chọn team' },
          ...uniqueTeams.sort().map(team => ({
            value: team,
            label: team
          }))
        ];
        
        setTeams(teamOptions);
      } else {
        setTeams([{ value: '', label: 'Chưa chọn team' }]);
      }
    } catch (error) {
      console.error('Error loading teams from Human Resources:', error);
      setTeams([{ value: '', label: 'Lỗi tải danh sách team' }]);
    } finally {
      setLoadingTeams(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const userId = localStorage.getItem('userId');
      
      if (!userId) {
        navigate('/login');
        return;
      }

      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        setUserData({
          username: data.username || '',
          name: data.name || '',
          email: data.email || '',
          role: data.role || 'user',
          team: data.team || '',
          createdAt: data.createdAt || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Không thể tải thông tin profile!', {
        position: "top-right",
        autoClose: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const userId = localStorage.getItem('userId');
      const userRef = ref(database, `users/${userId}`);

      // Cập nhật thông tin (không update username và password)
      await update(userRef, {
        name: userData.name,
        email: userData.email,
        team: userData.team
      });

      // Cập nhật localStorage
      localStorage.setItem('username', userData.username);
      localStorage.setItem('userEmail', userData.email);
      localStorage.setItem('userTeam', userData.team);

      toast.success('Cập nhật profile thành công!', {
        position: "top-right",
        autoClose: 3000,
      });

    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Không thể lưu thông tin. Vui lòng thử lại!', {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
        
    // Validation
    if (passwordData.newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự!', {
        position: "top-right",
        autoClose: 4000,
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Mật khẩu mới và xác nhận mật khẩu không khớp!', {
        position: "top-right",
        autoClose: 4000,
      });
      return;
    }

    setChangingPassword(true);

    try {
      const userId = localStorage.getItem('userId');
      
      if (!userId) {
        toast.error('Vui lòng đăng nhập lại!', {
          position: "top-right",
          autoClose: 4000,
        });
        navigate('/login');
        return;
      }

      // Get current user data from Firebase
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        toast.error('Không tìm thấy thông tin người dùng!', {
          position: "top-right",
          autoClose: 4000,
        });
        return;
      }

      const currentUserData = snapshot.val();

      // Verify current password
      const passwordMatch = bcrypt.compareSync(
        passwordData.currentPassword, 
        currentUserData.password
      );

      if (!passwordMatch) {
        toast.error('Mật khẩu hiện tại không đúng!', {
          position: "top-right",
          autoClose: 4000,
        });
        return;
      }


      // Hash new password
      const hashedNewPassword = bcrypt.hashSync(passwordData.newPassword, 10);

      // Update password in database
      await update(userRef, {
        password: hashedNewPassword
      });

      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordSection(false);

      toast.success('Đổi mật khẩu thành công!', {
        position: "top-right",
        autoClose: 3000,
      });

    } catch (error) {
      console.error('Error changing password:', error);
      
      toast.error(`Không thể đổi mật khẩu: ${error.message}`, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-primary mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-8 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">👤 Thông tin cá nhân</h1>
        <p className="text-gray-600">Quản lý thông tin profile và team của bạn</p>
      </div>

      {/* Message Alert */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            {message.text}
          </div>
        </div>
      )}

      {/* Profile Form */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <form onSubmit={handleSave}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Username - Read Only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên đăng nhập
              </label>
              <input
                type="text"
                value={userData.username}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Không thể thay đổi</p>
            </div>

            {/* Role - Read Only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vai trò
              </label>
              <input
                type="text"
                value={
                  userData.role === 'admin' ? 'Quản trị viên' : 
                  userData.role === 'leader' ? 'Trưởng nhóm' :
                  userData.role === 'accountant' || userData.role === 'kế toán' ? 'Kế toán' :
                  'Nhân viên'
                }
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={userData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="Nhập họ và tên"
                required
                disabled={saving}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={userData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="email@example.com"
                required
                disabled={saving}
              />
            </div>

            {/* Team - Full Width */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Team
              </label>
              <div className="relative">
                <select
                  name="team"
                  value={userData.team}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  disabled={saving || loadingTeams}
                >
                  {loadingTeams ? (
                    <option value="">Đang tải danh sách team...</option>
                  ) : (
                    teams.map(team => (
                      <option key={team.value} value={team.value}>
                        {team.label}
                      </option>
                    ))
                  )}
                </select>
              </div>
              {loadingTeams && (
                <p className="text-xs text-gray-500 mt-1 flex items-center">
                  <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang tải danh sách team...
                </p>
              )}
            </div>

            {/* Created At - Full Width */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày tạo tài khoản
              </label>
              <input
                type="text"
                value={formatDate(userData.createdAt)}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold text-white transition ${
                saving
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary hover:bg-green-700 active:bg-green-800'
              }`}
            >
              {saving ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang lưu...
                </span>
              ) : (
                '💾 Lưu thay đổi'
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/home')}
              disabled={saving}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Quay lại
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Section */}
      <div className="mt-6 bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">🔒 Đổi mật khẩu</h2>
            <p className="text-sm text-gray-600 mt-1">Cập nhật mật khẩu để bảo mật tài khoản</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowPasswordSection(!showPasswordSection);
              setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
              });
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            {showPasswordSection ? '✕ Đóng' : '🔑 Đổi mật khẩu'}
          </button>
        </div>

        {showPasswordSection && (
          <form onSubmit={handleChangePassword}>
            <div className="grid grid-cols-1 gap-6">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mật khẩu hiện tại <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Nhập mật khẩu hiện tại"
                  required
                  disabled={changingPassword}
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  required
                  minLength={6}
                  disabled={changingPassword}
                />
                <p className="text-xs text-gray-500 mt-1">Mật khẩu phải có ít nhất 6 ký tự</p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Nhập lại mật khẩu mới"
                  required
                  disabled={changingPassword}
                />
              </div>
            </div>

            {/* Password Change Buttons */}
            <div className="mt-6 flex gap-4">
              <button
                type="submit"
                disabled={changingPassword}
                className={`flex-1 py-3 px-6 rounded-lg font-semibold text-white transition ${
                  changingPassword
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                }`}
              >
                {changingPassword ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang cập nhật...
                  </span>
                ) : (
                  '🔒 Cập nhật mật khẩu'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPasswordSection(false);
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  });
                }}
                disabled={changingPassword}
                className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Hủy
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Additional Info Card */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-blue-700">
            <p className="font-semibold mb-1">💡 Lưu ý:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Tên đăng nhập và vai trò không thể thay đổi</li>
              <li>Thông tin team giúp phân loại báo cáo theo phòng ban</li>
              <li>Bạn có thể đổi mật khẩu bất kỳ lúc nào để bảo mật tài khoản</li>
              <li>Mật khẩu mới phải có ít nhất 6 ký tự</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
}

export default Profile;
