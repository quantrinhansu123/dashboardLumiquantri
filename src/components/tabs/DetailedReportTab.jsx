import { useMemo } from 'react';

export function DetailedReportTab({ data }) {
  // Helper functions
  const formatNumber = (num) => {
    return num ? num.toLocaleString('vi-VN') : '0';
  };

  const formatCurrency = (num) => {
    return num ? num.toLocaleString('vi-VN') + 'đ' : '0đ';
  };

  const formatPercent = (num) => {
    return (num * 100).toFixed(2) + '%';
  };

  // Calculate summary data
  const summaryData = useMemo(() => {
    const grouped = {};
    
    data.forEach(item => {
      const key = `${item.team}_${item.name}`;
      if (!grouped[key]) {
        grouped[key] = {
          team: item.team,
          name: item.name,
          mess: 0,
          cpqc: 0,
          orders: 0,
          ordersReal: 0,
          revenue: 0,
          revenueReal: 0
        };
      }
      
      grouped[key].mess += item.mess_cmt || 0;
      grouped[key].cpqc += item.cpqc || 0;
      grouped[key].orders += item.orders || 0;
      grouped[key].ordersReal += item.ordersReal || 0;
      grouped[key].revenue += item.revenue || 0;
      grouped[key].revenueReal += item.revenueReal || 0;
    });
    
    return Object.values(grouped);
  }, [data]);

  // Calculate totals
  const totals = useMemo(() => {
    return summaryData.reduce((acc, row) => ({
      mess: acc.mess + row.mess,
      cpqc: acc.cpqc + row.cpqc,
      orders: acc.orders + row.orders,
      ordersReal: acc.ordersReal + row.ordersReal,
      revenue: acc.revenue + row.revenue,
      revenueReal: acc.revenueReal + row.revenueReal
    }), {
      mess: 0,
      cpqc: 0,
      orders: 0,
      ordersReal: 0,
      revenue: 0,
      revenueReal: 0
    });
  }, [summaryData]);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
          <thead className="bg-secondary">
            <tr>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">STT</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Team</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Marketing</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Số Mess</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">CPQC</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Số Đơn</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-blue-100 uppercase border border-gray-400 whitespace-nowrap">Số Đơn (TT)</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Doanh số</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-blue-100 uppercase border border-gray-400 whitespace-nowrap">DS (TT)</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Tỉ lệ chốt</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-blue-100 uppercase border border-gray-400 whitespace-nowrap">TL chốt (TT)</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">CPS</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">%CP/DS</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Total Row */}
            <tr className="bg-primary text-white font-bold">
              <td className="px-2 py-2 text-xs border border-gray-400" colSpan="3">TỔNG CỘNG</td>
              <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(totals.mess)}</td>
              <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(totals.cpqc)}</td>
              <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(totals.orders)}</td>
              <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(totals.ordersReal)}</td>
              <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(totals.revenue)}</td>
              <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(totals.revenueReal)}</td>
              <td className="px-2 py-2 text-xs text-center border border-gray-400">
                {formatPercent(totals.mess ? totals.orders / totals.mess : 0)}
              </td>
              <td className="px-2 py-2 text-xs text-center border border-gray-400">
                {formatPercent(totals.mess ? totals.ordersReal / totals.mess : 0)}
              </td>
              <td className="px-2 py-2 text-xs text-right border border-gray-400">
                {formatCurrency(totals.orders ? totals.cpqc / totals.orders : 0)}
              </td>
              <td className="px-2 py-2 text-xs text-center border border-gray-400">
                {formatPercent(totals.revenue ? totals.cpqc / totals.revenue : 0)}
              </td>
            </tr>

            {/* Data Rows */}
            {summaryData.map((row, index) => {
              const closingRate = row.mess ? row.orders / row.mess : 0;
              const closingRateReal = row.mess ? row.ordersReal / row.mess : 0;
              const cps = row.orders ? row.cpqc / row.orders : 0;
              const cpds = row.revenue ? row.cpqc / row.revenue : 0;
              
              return (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-2 py-2 text-xs font-medium text-gray-900 border border-gray-300 whitespace-nowrap">{index + 1}</td>
                  <td className="px-2 py-2 text-xs font-medium text-gray-900 border border-gray-300 whitespace-nowrap">{row.team}</td>
                  <td className="px-2 py-2 text-xs font-medium text-gray-900 border border-gray-300 whitespace-nowrap">{row.name}</td>
                  <td className="px-2 py-2 text-xs font-medium text-gray-900 text-right border border-gray-300 whitespace-nowrap">{formatNumber(row.mess)}</td>
                  <td className="px-2 py-2 text-xs font-medium text-gray-900 text-right border border-gray-300 whitespace-nowrap">{formatCurrency(row.cpqc)}</td>
                  <td className="px-2 py-2 text-xs font-medium text-gray-900 text-right border border-gray-300 whitespace-nowrap">{formatNumber(row.orders)}</td>
                  <td className="px-2 py-2 text-xs font-medium text-blue-600 text-right border border-gray-300 whitespace-nowrap">{formatNumber(row.ordersReal)}</td>
                  <td className="px-2 py-2 text-xs font-medium text-gray-900 text-right border border-gray-300 whitespace-nowrap">{formatCurrency(row.revenue)}</td>
                  <td className="px-2 py-2 text-xs font-medium text-blue-600 text-right border border-gray-300 whitespace-nowrap">{formatCurrency(row.revenueReal)}</td>
                  <td className={`px-2 py-2 text-xs font-medium text-center border border-gray-300 whitespace-nowrap ${
                    closingRate > 0.1 ? 'bg-green-100 text-green-800' : closingRate > 0.05 ? 'bg-yellow-100 text-yellow-800' : ''
                  }`}>
                    {formatPercent(closingRate)}
                  </td>
                  <td className={`px-2 py-2 text-xs font-medium text-center border border-gray-300 whitespace-nowrap ${
                    closingRateReal > 0.1 ? 'bg-green-100 text-green-800' : closingRateReal > 0.05 ? 'bg-yellow-100 text-yellow-800' : ''
                  }`}>
                    {formatPercent(closingRateReal)}
                  </td>
                  <td className="px-2 py-2 text-xs font-medium text-gray-900 text-right border border-gray-300 whitespace-nowrap">{formatCurrency(cps)}</td>
                  <td className={`px-2 py-2 text-xs font-medium text-center border border-gray-300 whitespace-nowrap ${
                    cpds > 0.33 ? 'bg-yellow-100 text-yellow-800' : ''
                  }`}>
                    {formatPercent(cpds)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {summaryData.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Không có dữ liệu phù hợp với bộ lọc</p>
        </div>
      )}
    </div>
  );
}
