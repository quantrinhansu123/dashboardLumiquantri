import { useState, useEffect, useMemo } from "react";
import { ref, get, update, remove } from "firebase/database";
import { database } from "../firebase/config";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useReportData } from "../hooks/useReportData";
import { FirebaseReportTab } from "./tabs/FirebaseReportTab";
import { F3ReportTab } from "./tabs/F3ReportTab";
import { DetailedReportTab } from "./tabs/DetailedReportTab";
import { KPIReportTab } from "./tabs/KPIReportTab";
import { MarketEffectivenessTab } from "./tabs/MarketEffectivenessTab";
import { UserManagementTab } from "./tabs/UserManagementTab";

function ReportDashboard() {
  // Load user info from localStorage
  const [userTeam, setUserTeam] = useState("");
  const [userRole, setUserRole] = useState("user");
  const [userEmail, setUserEmail] = useState("");

  // Use custom hook to fetch data
  const { masterData, firebaseReports, loading, error } = useReportData(userRole, userTeam, userEmail);
  
  const [filteredData, setFilteredData] = useState([]);
  const [filteredFirebaseReports, setFilteredFirebaseReports] = useState([]);
  const [f3Data, setF3Data] = useState([]);
  const [filteredF3Data, setFilteredF3Data] = useState([]);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [activeTab, setActiveTab] = useState("detailed");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50); // Show 50 items per page

  // Filter states
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    products: [],
    shifts: [],
    markets: [],
    teams: [],
    searchText: "", // Added for firebase reports search
  });

  const [availableFilters, setAvailableFilters] = useState({
    products: [],
    shifts: ["Giữa ca", "Hết ca"],
    markets: [],
    teams: [],
  });

  // Quick select state
  const [quickSelectValue, setQuickSelectValue] = useState("");

  useEffect(() => {
    // Load user team, role and email from localStorage
    const team = localStorage.getItem("userTeam") || "";
    const role = localStorage.getItem("userRole") || "user";
    const email = localStorage.getItem("userEmail") || "";
    setUserTeam(team);
    setUserRole(role);
    setUserEmail(email);

    // Set default dates (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    setFilters((prev) => ({
      ...prev,
      startDate: firstDay.toISOString().split("T")[0],
      endDate: lastDay.toISOString().split("T")[0],
    }));

    // Fetch F3 data
    fetchF3Data();

    // Fetch users if admin or leader
    if (role === "admin" || role === "leader") {
      fetchUsers();
    }
  }, []);

  // Update available filters when masterData changes
  useEffect(() => {
    if (masterData.length > 0) {
      const products = [
        ...new Set(masterData.map((r) => r.product).filter(Boolean)),
      ];
      const markets = [
        ...new Set(masterData.map((r) => r.market).filter(Boolean)),
      ];

      setAvailableFilters((prev) => ({
        ...prev,
        products: products.sort(),
        markets: markets.sort(),
      }));
    }
  }, [masterData]);

  // Fetch teams from Firebase human_resources for team filter
  useEffect(() => {
    const fetchTeamsFromFirebase = async () => {
      try {
        const hrRef = ref(database, "human_resources");
        const snapshot = await get(hrRef);

        if (snapshot.exists()) {
          const hrData = snapshot.val();
          const teams = [
            ...new Set(
              Object.values(hrData)
                .map((user) => user.Team)
                .filter(Boolean)
            ),
          ];

          setAvailableFilters((prev) => ({
            ...prev,
            teams: teams.sort(),
          }));
        }
      } catch (error) {
        console.error("Error loading teams from Firebase:", error);
      }
    };

    fetchTeamsFromFirebase();
  }, []);

  const fetchF3Data = async () => {
    try {
      const f3Ref = ref(database, "f3_data");
      const snapshot = await get(f3Ref);

      if (snapshot.exists()) {
        const f3DataObj = snapshot.val();
        const totalKeys = Object.keys(f3DataObj).length;

        // Convert to array efficiently
        const f3Array = Object.entries(f3DataObj)
          .filter(([_, data]) => data) // Skip null/undefined
          .map(([id, data]) => ({
            id,
            ...data,
            "Ngày lên đơn": data["Ngày lên đơn"]
              ? new Date(data["Ngày lên đơn"])
              : null,
            "Thời gian lên đơn": data["Thời gian lên đơn"]
              ? new Date(data["Thời gian lên đơn"])
              : null,
          }));

        // Sort by timestamp or date
        f3Array.sort((a, b) => {
          const dateA =
            a["Thời gian lên đơn"] || a["Ngày lên đơn"] || new Date(0);
          const dateB =
            b["Thời gian lên đơn"] || b["Ngày lên đơn"] || new Date(0);
          return dateB - dateA;
        });

        setF3Data(f3Array);
        setFilteredF3Data(f3Array);

        if (f3Array.length < totalKeys) {
          console.warn(
            `⚠️ Skipped ${totalKeys - f3Array.length} invalid records`
          );
        }
      } else {
        setF3Data([]);
        setFilteredF3Data([]);
        toast.warning("Không có dữ liệu F3 trong Firebase", {
          position: "top-right",
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error("❌ Error loading F3 data:", error);
      toast.error("Lỗi khi tải dữ liệu F3: " + error.message, {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  const fetchUsers = async () => {
    try {
      const usersRef = ref(database, "human_resources");
      const snapshot = await get(usersRef);

      if (snapshot.exists()) {
        const usersData = snapshot.val();

        const usersArray = Object.entries(usersData).map(
          ([firebaseKey, data]) => ({
            firebaseKey, // This is the actual Firebase key for updates/deletes
            ...data, // This spreads all fields including 'id' field if it exists
          })
        );

        // Sort by name (Họ Và Tên)
        usersArray.sort((a, b) =>
          (a["Họ Và Tên"] || "").localeCompare(b["Họ Và Tên"] || "")
        );

        // Filter by team for leader role
        let filteredArray = usersArray;
        if (userRole === "leader" && userTeam) {
          filteredArray = usersArray.filter((user) => user.Team === userTeam);
        }

        setUsers(usersArray);
        setFilteredUsers(filteredArray);
      } else {
        setUsers([]);
        setFilteredUsers([]);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Lỗi khi tải danh sách nhân sự: " + error.message, {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      const userRef = ref(database, `human_resources/${userId}`);
      await update(userRef, updates);

      // Refresh users list
      await fetchUsers();
      setEditingUser(null);
      toast.success("Cập nhật nhân viên thành công!", {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Lỗi khi cập nhật: " + error.message, {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa nhân viên này?")) {
      return;
    }

    try {
      const userRef = ref(database, `human_resources/${userId}`);
      await remove(userRef);

      // Refresh users list
      await fetchUsers();
      toast.success("Xóa nhân viên thành công!", {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Lỗi khi xóa: " + error.message, {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  // Memoize filtered F3 data for better performance
  const filteredF3DataMemo = useMemo(() => {
    let filtered = [...f3Data];

    // Search by text (Name, Email, Team, Mã đơn hàng, etc.)
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          (item["Name*"] &&
            item["Name*"].toLowerCase().includes(searchLower)) ||
          (item["Nhân viên Marketing"] &&
            item["Nhân viên Marketing"].toLowerCase().includes(searchLower)) ||
          (item["Nhân viên Sale"] &&
            item["Nhân viên Sale"].toLowerCase().includes(searchLower)) ||
          (item["Mã đơn hàng"] &&
            item["Mã đơn hàng"].toLowerCase().includes(searchLower)) ||
          (item["Team"] && item["Team"].toLowerCase().includes(searchLower))
      );
    }

    // Date filter by Ngày lên đơn
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((item) => {
        const itemDate = item["Ngày lên đơn"] || item["Thời gian lên đơn"];
        if (!itemDate) return true;
        return itemDate >= startDate;
      });
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((item) => {
        const itemDate = item["Ngày lên đơn"] || item["Thời gian lên đơn"];
        if (!itemDate) return true;
        return itemDate <= endDate;
      });
    }

    // Shift filter by Ca
    if (filters.shifts.length > 0) {
      filtered = filtered.filter((item) => filters.shifts.includes(item["Ca"]));
    }

    // Team filter
    if (filters.teams.length > 0 && userRole === "admin") {
      filtered = filtered.filter(
        (item) => item["Team"] && filters.teams.includes(item["Team"])
      );
    }

    // Access control: Only leader and admin can view F3 data
    const allowedRoles = ["admin", "leader"];
    if (!allowedRoles.includes(userRole)) {
      filtered = [];
    }

    return filtered;
  }, [filters, f3Data, userRole]);

  // Update filteredF3Data when memo changes
  useEffect(() => {
    setFilteredF3Data(filteredF3DataMemo);
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [filteredF3DataMemo]);

  // Paginated F3 data for rendering
  const paginatedF3Data = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredF3DataMemo.slice(startIndex, endIndex);
  }, [filteredF3DataMemo, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredF3DataMemo.length / itemsPerPage);
  }, [filteredF3DataMemo.length, itemsPerPage]);

  // Note: Removed auto-clear filters when switching to F3 tab
  // Users can manually clear filters if needed

  useEffect(() => {
    applyFilters();
  }, [filters, masterData, userTeam, userRole, userEmail]);

  useEffect(() => {
    applyFirebaseFilters();
  }, [filters, firebaseReports, userTeam, userRole, userEmail]);

  const applyFirebaseFilters = () => {
    let filtered = [...firebaseReports];

    // Search by text (name, email, TKQC)
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(
        (report) =>
          (report.name && report.name.toLowerCase().includes(searchLower)) ||
          (report.email && report.email.toLowerCase().includes(searchLower)) ||
          (report.tkqc && report.tkqc.toLowerCase().includes(searchLower))
      );
    }

    // Date filter
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((report) => {
        const reportDate =
          report.date instanceof Date ? report.date : new Date(report.date);
        return reportDate >= startDate;
      });
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((report) => {
        const reportDate =
          report.date instanceof Date ? report.date : new Date(report.date);
        return reportDate <= endDate;
      });
    }

    // Product filter
    if (filters.products.length > 0) {
      filtered = filtered.filter((report) =>
        filters.products.includes(report.product)
      );
    }

    // Market filter
    if (filters.markets.length > 0) {
      filtered = filtered.filter((report) =>
        filters.markets.includes(report.market)
      );
    }

    // Shift filter
    if (filters.shifts.length > 0) {
      filtered = filtered.filter((report) =>
        filters.shifts.includes(report.shift)
      );
    }

    // Access control:
    // - Admin: Xem TẤT CẢ báo cáo (full access)
    // - Leader: Xem báo cáo của team mình
    // - User: Chỉ xem báo cáo của bản thân
    if (userRole === "admin") {
      // Admin sees all reports - no access restriction
    } else if (userRole === "leader" && userTeam) {
      // Leader sees their team's reports
      filtered = filtered.filter((report) => report.team === userTeam);
    } else if (userEmail) {
      // Regular user sees only their own reports
      filtered = filtered.filter((report) => report.email === userEmail);
    }

    setFilteredFirebaseReports(filtered);
  };

  const applyFilters = () => {
    let filtered = [...masterData];

    // Access control:
    // - Admin: Xem TẤT CẢ dữ liệu không bị giới hạn (full access)
    // - Leader: Xem theo team của mình
    // - User: Chỉ xem dữ liệu của bản thân
    if (userRole === "admin") {
      // Admin sees ALL data - no access restriction
    } else if (userRole === "leader" && userTeam) {
      // Leader sees their team's reports only
      filtered = filtered.filter((r) => r.team === userTeam);
    } else if (userEmail) {
      // Regular user sees only their own reports
      filtered = filtered.filter((r) => r.email === userEmail);
    }

    // Search by text (name, email, team, product, market)
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.name && r.name.toLowerCase().includes(searchLower)) ||
          (r.email && r.email.toLowerCase().includes(searchLower)) ||
          (r.team && r.team.toLowerCase().includes(searchLower)) ||
          (r.product && r.product.toLowerCase().includes(searchLower)) ||
          (r.market && r.market.toLowerCase().includes(searchLower))
      );
    }

    // Date filter
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((r) => r.date >= startDate);
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((r) => r.date <= endDate);
    }

    // Product filter
    if (filters.products.length > 0) {
      filtered = filtered.filter((r) => filters.products.includes(r.product));
    }

    // Shift filter
    if (filters.shifts.length > 0) {
      filtered = filtered.filter((r) => filters.shifts.includes(r.shift));
    }

    // Market filter
    if (filters.markets.length > 0) {
      filtered = filtered.filter((r) => filters.markets.includes(r.market));
    }

    // Team filter (only applicable for admin to filter specific teams)
    if (filters.teams.length > 0 && userRole === "admin") {
      filtered = filtered.filter(
        (r) => r.team && filters.teams.includes(r.team)
      );
    }

    setFilteredData(filtered);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => {
      if (Array.isArray(prev[filterType])) {
        const newValues = prev[filterType].includes(value)
          ? prev[filterType].filter((v) => v !== value)
          : [...prev[filterType], value];
        return { ...prev, [filterType]: newValues };
      }
      return { ...prev, [filterType]: value };
    });
  };

  // Handle quick date range selection
  const handleQuickDateSelect = (e) => {
    const value = e.target.value;
    setQuickSelectValue(value);
    if (!value) return;

    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (value) {
      case "today":
        // Hôm nay
        startDate = new Date(today);
        endDate = new Date(today);
        break;
      case "yesterday":
        // Hôm qua
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 1);
        endDate = new Date(startDate);
        break;
      case "last-week":
        // Tuần trước
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        startDate = lastWeekStart;
        endDate = lastWeekEnd;
        break;
      case "this-week":
        // Tuần này
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - today.getDay());
        const thisWeekEnd = new Date(thisWeekStart);
        thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
        startDate = thisWeekStart;
        endDate = thisWeekEnd;
        break;
      case "next-week":
        // Tuần sau
        const nextWeekStart = new Date(today);
        nextWeekStart.setDate(today.getDate() - today.getDay() + 7);
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
        startDate = nextWeekStart;
        endDate = nextWeekEnd;
        break;
      case "this-month":
        // Tháng này
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case "month-1":
      case "month-2":
      case "month-3":
      case "month-4":
      case "month-5":
      case "month-6":
      case "month-7":
      case "month-8":
      case "month-9":
      case "month-10":
      case "month-11":
      case "month-12":
        // Tháng cụ thể
        const month = parseInt(value.split("-")[1]) - 1;
        startDate = new Date(today.getFullYear(), month, 1);
        endDate = new Date(today.getFullYear(), month + 1, 0);
        break;
      case "q1":
        // Quý 1 (T1-T3)
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 2, 31);
        break;
      case "q2":
        // Quý 2 (T4-T6)
        startDate = new Date(today.getFullYear(), 3, 1);
        endDate = new Date(today.getFullYear(), 5, 30);
        break;
      case "q3":
        // Quý 3 (T7-T9)
        startDate = new Date(today.getFullYear(), 6, 1);
        endDate = new Date(today.getFullYear(), 8, 30);
        break;
      case "q4":
        // Quý 4 (T10-T12)
        startDate = new Date(today.getFullYear(), 9, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        break;
      default:
        return;
    }

    setFilters((prev) => ({
      ...prev,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    }));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      products: [],
      shifts: [],
      markets: [],
      teams: [],
      searchText: "",
    });
    setQuickSelectValue(""); // Reset quick select to default
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return (
      filters.searchText ||
      filters.startDate ||
      filters.endDate ||
      filters.products.length > 0 ||
      filters.shifts.length > 0 ||
      filters.markets.length > 0 ||
      filters.teams.length > 0
    );
  };

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu từ API...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Lỗi tải dữ liệu
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
          >
            Tải lại trang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-8 py-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center">
          <img
            src="https://www.appsheet.com/template/gettablefileurl?appName=Appsheet-325045268&tableName=Kho%20%E1%BA%A3nh&fileName=Kho%20%E1%BA%A3nh_Images%2Ff930e667.%E1%BA%A2nh.025539.jpg"
            alt="Logo"
            className="h-16 w-16 rounded-full shadow-lg mr-4"
          />
          <div>
            <h1 className="text-3xl font-bold text-primary">
              DỮ LIỆU CHI PHÍ ADS
            </h1>
            <p className="text-gray-600">Báo cáo chi phí tổng hợp</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab("detailed")}
              className={`py-4 px-6 font-medium text-sm border-b-2 transition ${
                activeTab === "detailed"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Báo cáo chi tiết
            </button>
            <button
              onClick={() => setActiveTab("kpi")}
              className={`py-4 px-6 font-medium text-sm border-b-2 transition ${
                activeTab === "kpi"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Báo cáo KPI
            </button>
            <button
              onClick={() => setActiveTab("market")}
              className={`py-4 px-6 font-medium text-sm border-b-2 transition ${
                activeTab === "market"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Hiệu quả MKT
            </button>
            <button
              onClick={() => setActiveTab("firebase")}
              className={`py-4 px-6 font-medium text-sm border-b-2 transition ${
                activeTab === "firebase"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Báo cáo Marketing
            </button>
            <button
              onClick={() => setActiveTab("f3")}
              className={`py-4 px-6 font-medium text-sm border-b-2 transition ${
                activeTab === "f3"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Báo cáo F3
            </button>
            {(userRole === "admin" || userRole === "leader") && (
              <button
                onClick={() => setActiveTab("users")}
                className={`py-4 px-6 font-medium text-sm border-b-2 transition ${
                  activeTab === "users"
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Quản lý Nhân sự
              </button>
            )}
          </nav>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
            {/* Header with Clear Button */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-primary">Bộ lọc</h3>
              {hasActiveFilters() && (
                <button
                  onClick={clearAllFilters}
                  className="px-3 py-1.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 active:bg-red-700 transition-colors duration-200 flex items-center gap-1.5 shadow-sm hover:shadow"
                  title="Xóa tất cả bộ lọc"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Xóa tất cả bộ lọc
                </button>
              )}
            </div>

            {/* Search Text - For all tabs except Market Effectiveness */}
            {activeTab !== "market" && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {activeTab === "firebase" 
                    ? "Tìm kiếm (Tên/Email/TKQC):" 
                    : activeTab === "f3"
                    ? "Tìm kiếm (Tên/Mã đơn/Team):"
                    : activeTab === "users"
                    ? "Tìm kiếm (Tên/Email/Team):"
                    : "Tìm kiếm (Tên/Email/Team):"}
                </label>
                <input
                  type="text"
                  value={filters.searchText}
                  onChange={(e) =>
                    handleFilterChange("searchText", e.target.value)
                  }
                  placeholder="Nhập từ khóa..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            )}

            {/* Date Filters - Hide on Users tab */}
            {activeTab !== "users" && (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chọn nhanh:
                  </label>
                  <select
                    onChange={handleQuickDateSelect}
                    value={quickSelectValue}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-sm shadow-sm hover:border-gray-400 transition-colors cursor-pointer"
                    style={{ maxHeight: "300px" }}
                  >
                    <option value="" className="text-gray-500">
                      -- Chọn nhanh --
                    </option>
                <optgroup
                  label="Ngày"
                  className="font-bold text-gray-700 bg-gray-50"
                >
                  <option value="today" className="py-2 px-4 hover:bg-gray-100">
                    Hôm nay
                  </option>
                  <option
                    value="yesterday"
                    className="py-2 px-4 hover:bg-gray-100"
                  >
                    Hôm qua
                  </option>
                </optgroup>
                <optgroup
                  label="Tuần"
                  className="font-bold text-gray-700 bg-gray-50"
                >
                  <option
                    value="last-week"
                    className="py-2 px-4 hover:bg-gray-100"
                  >
                    Tuần trước
                  </option>
                  <option
                    value="this-week"
                    className="py-2 px-4 hover:bg-gray-100"
                  >
                    Tuần này
                  </option>
                  <option
                    value="next-week"
                    className="py-2 px-4 hover:bg-gray-100"
                  >
                    Tuần sau
                  </option>
                </optgroup>
                <optgroup
                  label="Tháng"
                  className="font-bold text-gray-700 bg-gray-50"
                >
                  <option
                    value="this-month"
                    className="py-2 px-4 hover:bg-gray-100"
                  >
                    Tháng này
                  </option>
                  <option
                    value="month-1"
                    className="py-2 px-4 hover:bg-gray-100"
                  >
                    Tháng 1
                  </option>
                  <option
                    value="month-2"
                    className="py-2 px-4 hover:bg-gray-100"
                  >
                    Tháng 2
                  </option>
                  <option
                    value="month-3"
                    className="py-2 px-4 hover:bg-gray-100"
                  >
                    Tháng 3
                  </option>
                  <option
                    value="month-4"
                    className="py-2 px-4 hover:bg-gray-100"
                  >
                    Tháng 4
                  </option>
                  <option
                    value="month-5"
                    className="py-2 px-4 hover:bg-gray-100"
                  >
                    Tháng 5
                  </option>
                  <option
                    value="month-6"
                    className="py-2 px-4 hover:bg-gray-100"
                  >
                    Tháng 6
                  </option>
                  <option
                    value="month-7"
                    className="py-2 px-4 hover:bg-gray-100"
                  >
                    Tháng 7
                  </option>
                  <option
                    value="month-8"
                    className="py-2 px-4 hover:bg-gray-100"
                  >
                    Tháng 8
                  </option>
                  <option
                    value="month-9"
                    className="py-2 px-4 hover:bg-gray-100"
                  >
                    Tháng 9
                  </option>
                  <option
                    value="month-10"
                    className="py-2 px-4 hover:bg-gray-100"
                  >
                    Tháng 10
                  </option>
                  <option
                    value="month-11"
                    className="py-2 px-4 hover:bg-gray-100"
                  >
                    Tháng 11
                  </option>
                  <option
                    value="month-12"
                    className="py-2 px-4 hover:bg-gray-100"
                  >
                    Tháng 12
                  </option>
                </optgroup>
                <optgroup
                  label="Quý"
                  className="font-bold text-gray-700 bg-gray-50"
                >
                  <option value="q1" className="py-2 px-4 hover:bg-gray-100">
                    Quý 1
                  </option>
                  <option value="q2" className="py-2 px-4 hover:bg-gray-100">
                    Quý 2
                  </option>
                  <option value="q3" className="py-2 px-4 hover:bg-gray-100">
                    Quý 3
                  </option>
                  <option value="q4" className="py-2 px-4 hover:bg-gray-100">
                    Quý 4
                  </option>
                </optgroup>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Từ ngày:
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  handleFilterChange("startDate", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Đến ngày:
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
              </>
            )}

            {/* Product Filter - Hide on Users tab */}
            {activeTab !== "users" && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-2">Sản phẩm</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableFilters.products.map((product) => (
                    <label key={product} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.products.includes(product)}
                        onChange={() => handleFilterChange("products", product)}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {product}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Shift Filter - Hide on Users tab */}
            {activeTab !== "users" && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-2">Ca</h4>
                <div className="space-y-2">
                  {availableFilters.shifts.map((shift) => (
                    <label key={shift} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.shifts.includes(shift)}
                        onChange={() => handleFilterChange("shifts", shift)}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span className="ml-2 text-sm text-gray-700">{shift}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Market Filter - Hide on Users tab */}
            {activeTab !== "users" && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-2">Thị trường</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableFilters.markets.map((market) => (
                    <label key={market} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.markets.includes(market)}
                        onChange={() => handleFilterChange("markets", market)}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span className="ml-2 text-sm text-gray-700">{market}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Team Filter */}
            {userRole === "admin" && activeTab !== "users" && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-2">Team</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableFilters.teams.map((team) => (
                    <label key={team} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.teams.includes(team)}
                        onChange={() => handleFilterChange("teams", team)}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span className="ml-2 text-sm text-gray-700">{team}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Team Filter for Users tab */}
            {activeTab === "users" && userRole === "admin" && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-2">Team</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableFilters.teams.map((team) => (
                    <label key={team} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.teams.includes(team)}
                        onChange={() => handleFilterChange("teams", team)}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span className="ml-2 text-sm text-gray-700">{team}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-5">
          {activeTab === "detailed" && (
            <DetailedReportTab data={filteredData} filters={filters} />
          )}

          {activeTab === "kpi" && (
            <KPIReportTab data={filteredData} filters={filters} />
          )}

          {activeTab === "market" && (
            <MarketEffectivenessTab data={filteredData} filters={filters} />
          )}

          {activeTab === "firebase" && (
            <FirebaseReportTab
              filters={filters}
              userRole={userRole}
              userTeam={userTeam}
              userEmail={userEmail}
            />
          )}

          {/* Báo cáo F3 Tab */}
          {activeTab === "f3" && (
            <F3ReportTab
              filters={filters}
              setFilters={setFilters}
              userRole={userRole}
              userEmail={userEmail}
            />
          )}

          {activeTab === "users" && (
            <UserManagementTab 
              userRole={userRole} 
              userTeam={userTeam} 
              searchText={filters.searchText}
              teamFilter={filters.teams}
            />
          )}
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

export default ReportDashboard;
